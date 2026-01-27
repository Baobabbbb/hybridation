"""
Plan2Shop AI - Backend API
FastAPI server for image generation and visual shopping search.
With automatic fallback from Gemini to OpenAI when servers are overloaded.
Version 2.0 - OpenAI Fallback enabled
"""

import os
import base64
import io
import asyncio
import time
from pathlib import Path
from typing import Optional, Tuple

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from PIL import Image
from google import genai
from google.genai import types
from serpapi import GoogleSearch
from openai import OpenAI

# Retry configuration
MAX_RETRIES = 2  # Reduced for faster fallback
INITIAL_RETRY_DELAY = 2  # seconds

# Load environment variables from the same directory as this file
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Initialize FastAPI app
app = FastAPI(
    title="Plan2Shop AI API",
    description="Transform architectural plans into photorealistic furnished rooms",
    version="1.0.0"
)

# Configure CORS - filter out empty values
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add Railway frontend URL if configured
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    cors_origins.append(frontend_url)
    # Also allow without trailing slash
    cors_origins.append(frontend_url.rstrip("/"))

print(f"[CORS] Allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini client
def get_genai_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
    return genai.Client(api_key=api_key)


# Initialize OpenAI client
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None  # OpenAI is optional (fallback)
    return OpenAI(api_key=api_key)


def is_overload_error(error: Exception) -> bool:
    """Check if the error is a server overload/unavailable error."""
    error_str = str(error).lower()
    return any(x in error_str for x in ["503", "overloaded", "unavailable", "rate", "quota", "capacity"])


def image_to_base64(image: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def base64_to_image(base64_string: str) -> Image.Image:
    """Convert base64 string to PIL Image."""
    # Remove data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data))


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Plan2Shop AI API"}


async def call_gemini_with_retry(client, model: str, contents, config=None, max_retries: int = MAX_RETRIES):
    """Call Gemini API with automatic retry on 503 errors."""
    last_error = None
    
    for attempt in range(max_retries):
        try:
            if config:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config
                )
            else:
                response = client.models.generate_content(
                    model=model,
                    contents=contents
                )
            return response
        except Exception as e:
            last_error = e
            
            if is_overload_error(e) and attempt < max_retries - 1:
                delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                print(f"[Gemini] Model overloaded, retrying in {delay}s (attempt {attempt + 1}/{max_retries})...")
                await asyncio.sleep(delay)
            else:
                raise last_error
    
    raise last_error


async def enhance_prompt_with_openai(openai_client, style: str) -> str:
    """Use GPT-4o-mini to enhance the style prompt."""
    print("[OpenAI] Using GPT-4o-mini for prompt enhancement (fallback)...")
    
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are an expert interior designer. Transform style descriptions into detailed, professional interior design prompts for AI image generation. Be specific about materials, colors, lighting, and furniture styles. Keep it concise (2-3 sentences max). Output only the enhanced prompt, nothing else."
            },
            {
                "role": "user",
                "content": f"Style: {style}"
            }
        ],
        max_tokens=200,
        temperature=0.7
    )
    
    return response.choices[0].message.content.strip()


async def generate_image_with_openai(openai_client, input_image: Image.Image, enhanced_style: str) -> Tuple[str, str]:
    """Use gpt-image-1 to generate the furnished room image."""
    print("[OpenAI] Using gpt-image-1 for image generation (fallback)...")
    
    # Convert image to base64 for the prompt description
    image_buffer = io.BytesIO()
    input_image.save(image_buffer, format="PNG")
    image_buffer.seek(0)
    input_base64 = base64.b64encode(image_buffer.getvalue()).decode("utf-8")
    
    # Create detailed prompt for gpt-image-1
    generation_prompt = f"""Create a photorealistic interior photograph of a furnished room.

The room should have:
- A modern residential layout with walls, windows, and doors
- Professional real estate photography style
- Natural lighting coming from windows
- High-end furniture and decorations

STYLE: {enhanced_style}

Make it look like a professional architectural visualization or real estate photo.
The image should be warm, inviting, and showcase the interior design beautifully."""

    # Call gpt-image-1
    response = openai_client.images.generate(
        model="gpt-image-1",
        prompt=generation_prompt,
        n=1,
        size="1024x1024",
        quality="high"
    )
    
    # Get the image URL and download it
    image_url = response.data[0].url
    
    # Download the image
    import httpx
    async with httpx.AsyncClient() as client:
        img_response = await client.get(image_url)
        img_data = img_response.content
    
    # Convert to base64
    generated_base64 = base64.b64encode(img_data).decode("utf-8")
    
    return generated_base64, "image/png"


@app.post("/generate")
async def generate_furnished_room(
    file: UploadFile = File(..., description="The architectural floor plan image"),
    style: str = Form(..., description="The decoration style (e.g., 'modern minimalist', 'industrial loft')")
):
    """
    Generate a photorealistic furnished room from an architectural plan.
    Uses Gemini as primary, falls back to OpenAI if Gemini is overloaded.
    
    - **file**: The 2D floor plan image (PNG, JPG)
    - **style**: The desired decoration style
    
    Returns the generated image as base64.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process the uploaded image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary (for RGBA images)
        if input_image.mode in ("RGBA", "P"):
            input_image = input_image.convert("RGB")
        
        # Initialize clients
        gemini_client = get_genai_client()
        openai_client = get_openai_client()
        
        # Track which provider we're using
        provider_used = "gemini"
        enhanced_style = ""
        gemini_failed = False
        
        # ===== STEP 1: Enhance the style prompt =====
        try:
            print("[Gemini] Attempting to enhance prompt with gemini-2.5-flash-lite...")
            enhanced_prompt_response = await call_gemini_with_retry(
                gemini_client,
                model="gemini-2.5-flash-lite",
                contents=[
                    f"""You are an expert interior designer. Transform this simple style description into a detailed, 
                    professional interior design prompt for AI image generation. Be specific about materials, 
                    colors, lighting, and furniture styles. Keep it concise (2-3 sentences max).
                    
                    Style: {style}
                    
                    Output only the enhanced prompt, nothing else."""
                ]
            )
            enhanced_style = enhanced_prompt_response.text.strip()
            print("[Gemini] Prompt enhancement successful!")
            
        except Exception as e:
            if is_overload_error(e) and openai_client:
                print(f"[Gemini] Failed with overload error, switching to OpenAI fallback...")
                gemini_failed = True
                provider_used = "openai"
                enhanced_style = await enhance_prompt_with_openai(openai_client, style)
            else:
                raise e
        
        # ===== STEP 2: Generate the image =====
        generated_image_base64 = None
        mime_type = "image/png"
        
        if not gemini_failed:
            # Try Gemini first for image generation
            try:
                print("[Gemini] Attempting image generation with gemini-3-pro-image-preview...")
                
                # Prepare the image for Gemini
                image_bytes = io.BytesIO()
                input_image.save(image_bytes, format="PNG")
                image_bytes.seek(0)
                
                generation_prompt = f"""Transform this 2D architectural floor plan into a photorealistic interior photograph.

CRITICAL INSTRUCTIONS:
- Keep the EXACT same room layout, walls, windows, and doors positions
- Add realistic furniture, decorations, and lighting
- Make it look like a professional real estate photograph
- The perspective should be as if photographed by a professional photographer

STYLE: {enhanced_style}

Generate a high-quality, photorealistic image of this furnished room."""

                response = await call_gemini_with_retry(
                    gemini_client,
                    model="gemini-3-pro-image-preview",
                    contents=[
                        types.Content(
                            parts=[
                                types.Part.from_bytes(
                                    data=image_bytes.getvalue(),
                                    mime_type="image/png"
                                ),
                                types.Part.from_text(text=generation_prompt)
                            ]
                        )
                    ],
                    config=types.GenerateContentConfig(
                        response_modalities=["image", "text"],
                        temperature=0.7,
                    )
                )
                
                # Extract the generated image
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "inline_data") and part.inline_data:
                        generated_image_base64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                        mime_type = part.inline_data.mime_type
                        break
                
                if generated_image_base64:
                    print("[Gemini] Image generation successful!")
                else:
                    raise Exception("Gemini did not return an image")
                    
            except Exception as e:
                if is_overload_error(e) and openai_client:
                    print(f"[Gemini] Image generation failed with overload, switching to OpenAI...")
                    gemini_failed = True
                    provider_used = "openai"
                else:
                    raise e
        
        # Use OpenAI fallback if Gemini failed
        if gemini_failed or not generated_image_base64:
            if not openai_client:
                raise HTTPException(
                    status_code=503,
                    detail="Les serveurs Gemini sont surchargés et aucune clé OpenAI n'est configurée comme fallback."
                )
            
            generated_image_base64, mime_type = await generate_image_with_openai(
                openai_client, input_image, enhanced_style
            )
            provider_used = "openai"
            print("[OpenAI] Image generation successful!")
        
        return JSONResponse(content={
            "success": True,
            "image": f"data:{mime_type};base64,{generated_image_base64}",
            "enhanced_style": enhanced_style,
            "provider": provider_used  # Let frontend know which provider was used
        })
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] Generation failed: {error_msg}")
        
        if is_overload_error(e):
            raise HTTPException(
                status_code=503, 
                detail="Tous les modèles IA sont temporairement surchargés. Veuillez réessayer dans quelques instants."
            )
        raise HTTPException(status_code=500, detail=f"Generation failed: {error_msg}")


async def upload_image_to_catbox(image_bytes: bytes) -> str:
    """Upload image to litterbox.catbox.moe (temporary hosting, 1 hour expiry)."""
    import requests
    
    files = {
        'fileToUpload': ('image.png', image_bytes, 'image/png'),
        'reqtype': (None, 'fileupload'),
        'time': (None, '1h')  # 1 hour expiry
    }
    
    response = requests.post(
        'https://litterbox.catbox.moe/resources/internals/api.php',
        files=files,
        timeout=30
    )
    
    if response.status_code == 200 and response.text.startswith('https://'):
        return response.text.strip()
    else:
        raise Exception(f"Failed to upload image: {response.text}")


@app.post("/shop")
async def visual_search(
    image_blob: str = Form(..., description="Base64 encoded cropped image of the furniture")
):
    """
    Search for similar products using Google Lens via SerpApi.
    
    - **image_blob**: Base64 encoded image of the furniture item to search
    
    Returns a list of similar products with title, price, image, and shopping link.
    """
    try:
        serpapi_key = os.getenv("SERPAPI_API_KEY")
        if not serpapi_key:
            raise HTTPException(status_code=500, detail="SERPAPI_API_KEY not configured")
        
        # Clean the base64 string
        if "," in image_blob:
            image_blob = image_blob.split(",")[1]
        
        # Convert base64 to image
        image = base64_to_image(image_blob)
        
        # Save to a buffer
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        
        # Upload to temporary hosting service (required for SerpApi to access)
        try:
            image_url = await upload_image_to_catbox(image_bytes)
        except Exception as upload_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload image for search: {str(upload_error)}"
            )
        
        # Call SerpApi Google Lens with the public URL
        params = {
            "engine": "google_lens",
            "url": image_url,
            "api_key": serpapi_key
        }
        
        search = GoogleSearch(params)
        results = search.get_dict()
        
        # Check for API errors
        if "error" in results:
            raise HTTPException(
                status_code=500,
                detail=f"SerpApi error: {results['error']}"
            )
        
        # Extract shopping results
        products = []
        
        # Check for visual matches with shopping info
        visual_matches = results.get("visual_matches", [])
        for match in visual_matches[:10]:  # Limit to 10 results
            price_data = match.get("price", {})
            if isinstance(price_data, dict):
                price = price_data.get("extracted_value") or price_data.get("value", "N/A")
                currency = price_data.get("currency", "USD")
            else:
                price = price_data if price_data else "N/A"
                currency = "USD"
            
            product = {
                "title": match.get("title", "Unknown Product"),
                "price": price,
                "currency": currency,
                "image": match.get("thumbnail", ""),
                "link": match.get("link", ""),
                "source": match.get("source", "")
            }
            if product["link"]:  # Only add if there's a link
                products.append(product)
        
        # Also check shopping results if available
        shopping_results = results.get("shopping_results", [])
        for item in shopping_results[:5]:
            price_data = item.get("price", {})
            if isinstance(price_data, dict):
                price = price_data.get("extracted_value") or price_data.get("value", "N/A")
                currency = price_data.get("currency", "USD")
            else:
                price = price_data if price_data else "N/A"
                currency = "USD"
            
            product = {
                "title": item.get("title", "Unknown Product"),
                "price": price,
                "currency": currency,
                "image": item.get("thumbnail", ""),
                "link": item.get("link", ""),
                "source": item.get("source", "")
            }
            if product["link"] and product not in products:
                products.append(product)
        
        return JSONResponse(content={
            "success": True,
            "products": products,
            "total": len(products)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visual search failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Detailed health check for Railway deployment."""
    return {
        "status": "healthy",
        "google_api_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "openai_api_configured": bool(os.getenv("OPENAI_API_KEY")),
        "serpapi_configured": bool(os.getenv("SERPAPI_API_KEY")),
        "fallback_enabled": bool(os.getenv("OPENAI_API_KEY"))
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
