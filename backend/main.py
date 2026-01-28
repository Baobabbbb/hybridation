"""
Hybridation - Backend API
FastAPI server for 360° panoramic image generation and visual shopping search.
With automatic fallback from Gemini to OpenAI when servers are overloaded.
"""

import os
import base64
import io
import asyncio
from pathlib import Path
from typing import Tuple

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
MAX_RETRIES = 2
INITIAL_RETRY_DELAY = 2  # seconds

# Load environment variables from the same directory as this file
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Initialize FastAPI app
app = FastAPI(
    title="Hybridation API",
    description="Transform architectural plans into 360° panoramic furnished rooms",
    version="2.0.0"
)

# Configure CORS - Allow all origins for flexibility
cors_origins = ["*"]

# Add specific Railway frontend URL if configured
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        frontend_url,
        frontend_url.rstrip("/")
    ]

print(f"[CORS] Allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== UTILITY FUNCTIONS ====================

def get_genai_client():
    """Initialize Gemini client."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
    return genai.Client(api_key=api_key)


def get_openai_client():
    """Initialize OpenAI client (optional fallback)."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
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
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data))


# ==================== GEMINI API FUNCTIONS ====================

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


# ==================== OPENAI FALLBACK FUNCTIONS ====================

async def enhance_prompt_with_openai(openai_client, style: str) -> str:
    """Use GPT-4o-mini to enhance the style prompt for 360° panoramic generation."""
    print("[OpenAI] Using GPT-4o-mini for prompt enhancement (fallback)...")
    
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """You are an expert interior designer specializing in 360° panoramic visualization.
Transform style descriptions into detailed prompts for AI image generation.
Focus on: materials, colors, lighting, furniture placement, and spatial arrangement.
The output will be used for equirectangular 360° panoramic images.
Keep it concise (2-3 sentences max). Output only the enhanced prompt."""
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


async def generate_360_image_with_openai(openai_client, input_image: Image.Image, enhanced_style: str) -> Tuple[str, str]:
    """Use gpt-image-1 to generate a 360° panoramic room image."""
    print("[OpenAI] Using gpt-image-1 for 360° image generation (fallback)...")
    
    # Create detailed prompt for 360° equirectangular panorama
    generation_prompt = f"""Generate a high-resolution 360-degree equirectangular projection of an interior room.

CRITICAL REQUIREMENTS:
- The image MUST be a seamless 360° equirectangular panorama
- Aspect ratio should be suitable for VR sphere viewer (2:1 preferred)
- The room should wrap around completely with no visible seams
- Include ceiling and floor in the projection
- Professional interior photography quality

ROOM DESIGN:
- Modern residential interior with proper spatial depth
- Natural lighting from windows/skylights
- High-end furniture and decorations arranged realistically
- Cohesive color palette and material choices

STYLE: {enhanced_style}

Make it photorealistic, suitable for VR/360° viewing experiences."""

    # Call gpt-image-1 with landscape orientation for 360°
    response = openai_client.images.generate(
        model="gpt-image-1",
        prompt=generation_prompt,
        n=1,
        size="1792x1024",  # Wider aspect ratio for 360°
        quality="hd"
    )
    
    # Get the image URL and download it
    image_url = response.data[0].url
    
    import httpx
    async with httpx.AsyncClient() as client:
        img_response = await client.get(image_url)
        img_data = img_response.content
    
    generated_base64 = base64.b64encode(img_data).decode("utf-8")
    
    return generated_base64, "image/png"


# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Hybridation API", "version": "2.0.0"}


@app.post("/generate")
async def generate_360_room(
    file: UploadFile = File(..., description="The architectural floor plan image"),
    style: str = Form(..., description="The decoration style (e.g., 'modern minimalist', 'industrial loft')")
):
    """
    Generate a 360° panoramic equirectangular image of a furnished room.
    
    The 360° Decorator endpoint:
    - **file**: The 2D floor plan image (PNG, JPG)
    - **style**: The desired decoration style
    
    Returns a 360° equirectangular panoramic image suitable for VR sphere viewers.
    Uses Gemini as primary, falls back to OpenAI if Gemini is overloaded.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process the uploaded image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary
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
        # System instruction for 360° panoramic design
        system_instruction = """You are an expert interior designer specializing in 360° panoramic visualization.
Transform the user's style description into a detailed, professional interior design prompt.
Focus on: materials, colors, lighting, furniture styles, and spatial arrangement.
The output will be used for equirectangular 360° panoramic image generation.
Keep it concise (2-3 sentences max). Output only the enhanced prompt, nothing else."""
        
        try:
            print("[Gemini] Attempting to enhance prompt with gemini-2.5-flash-lite...")
            enhanced_prompt_response = await call_gemini_with_retry(
                gemini_client,
                model="gemini-2.5-flash-lite",
                contents=[
                    f"""{system_instruction}
                    
Style: {style}"""
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
        
        # ===== STEP 2: Generate the 360° panoramic image =====
        generated_image_base64 = None
        mime_type = "image/png"
        
        if not gemini_failed:
            try:
                print("[Gemini] Attempting 360° image generation with gemini-3-pro-image-preview...")
                
                # Prepare the image for Gemini
                image_bytes = io.BytesIO()
                input_image.save(image_bytes, format="PNG")
                image_bytes.seek(0)
                
                # 360° Equirectangular Panorama Generation Prompt
                generation_prompt = f"""You are an expert interior designer. Generate a high-resolution 360-degree equirectangular projection of the room based on this floor plan.

CRITICAL REQUIREMENTS FOR 360° PANORAMA:
- The image MUST be a seamless 360-degree equirectangular projection
- Aspect ratio: 2:1 (suitable for VR sphere viewer)
- The room should wrap around completely with no visible seams or discontinuities
- Include full ceiling and floor in the projection
- Camera position should be at eye level in the center of the room

ROOM TRANSFORMATION:
- Transform this 2D floor plan into a fully furnished 3D interior
- Maintain the exact room layout, walls, windows, and doors positions from the plan
- Add realistic furniture, decorations, and lighting based on the room's purpose
- Professional real estate photography quality

STYLE: {enhanced_style}

Generate a photorealistic, seamless 360° equirectangular panoramic image."""

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
                    print("[Gemini] 360° image generation successful!")
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
            
            generated_image_base64, mime_type = await generate_360_image_with_openai(
                openai_client, input_image, enhanced_style
            )
            provider_used = "openai"
            print("[OpenAI] 360° image generation successful!")
        
        return JSONResponse(content={
            "success": True,
            "image": f"data:{mime_type};base64,{generated_image_base64}",
            "enhanced_style": enhanced_style,
            "provider": provider_used,
            "format": "equirectangular_360"
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
        'time': (None, '1h')
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


# Sites non-marchands à exclure
EXCLUDED_DOMAINS = [
    "instagram.com", "pinterest.com", "facebook.com", "twitter.com", "x.com",
    "tiktok.com", "youtube.com", "reddit.com", "tumblr.com", "flickr.com",
    "behance.net", "dribbble.com", "deviantart.com", "500px.com",
    "unsplash.com", "pexels.com", "pixabay.com",  # Stock photos
    "wikipedia.org", "wikimedia.org",  # Encyclopédies
    "medium.com", "blogger.com", "wordpress.com",  # Blogs
]

def is_shopping_site(link: str, source: str) -> bool:
    """Check if the link is from a legitimate shopping site (not social media or blogs)."""
    if not link:
        return False
    
    link_lower = link.lower()
    source_lower = source.lower() if source else ""
    
    # Exclude social media and non-shopping sites
    for domain in EXCLUDED_DOMAINS:
        if domain in link_lower or domain in source_lower:
            return False
    
    return True

def has_valid_price(price) -> bool:
    """Check if the product has a valid price."""
    if price is None or price == "N/A" or price == "":
        return False
    if isinstance(price, (int, float)) and price > 0:
        return True
    if isinstance(price, str):
        # Check if it contains numbers (likely a price)
        return any(c.isdigit() for c in price)
    return False


@app.post("/shop")
async def visual_search(
    image_blob: str = Form(..., description="Base64 encoded cropped image of the furniture")
):
    """
    The Visual Personal Shopper endpoint.
    Search for similar products using Google Lens via SerpApi.
    
    - **image_blob**: Base64 encoded image of the furniture item to search
    
    Returns the top 5 matching products from legitimate e-commerce sites.
    Filters out social media, blogs, and stock photo sites.
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
        
        # Upload to temporary hosting service (required for SerpApi)
        print("[Shop] Uploading image to temporary hosting...")
        try:
            image_url = await upload_image_to_catbox(image_bytes)
            print(f"[Shop] Image uploaded: {image_url}")
        except Exception as upload_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload image for search: {str(upload_error)}"
            )
        
        # Call SerpApi Google Lens
        print("[Shop] Searching with Google Lens via SerpApi...")
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
        
        products = []
        seen_links = set()
        
        # PRIORITY 1: Shopping results (these are always from e-commerce sites)
        shopping_results = results.get("shopping_results", [])
        print(f"[Shop] Found {len(shopping_results)} shopping results")
        
        for item in shopping_results:
            if len(products) >= 8:  # Collect more to filter later
                break
            
            link = item.get("link", "")
            if not link or link in seen_links:
                continue
            
            price_data = item.get("price", {})
            if isinstance(price_data, dict):
                price = price_data.get("extracted_value") or price_data.get("value", "N/A")
            else:
                price = price_data if price_data else "N/A"
            
            product = {
                "title": item.get("title", "Unknown Product"),
                "price": price,
                "thumbnail": item.get("thumbnail", ""),
                "link": link,
                "source": item.get("source", ""),
                "has_price": has_valid_price(price)
            }
            
            products.append(product)
            seen_links.add(link)
        
        # PRIORITY 2: Visual matches with price from shopping sites
        visual_matches = results.get("visual_matches", [])
        print(f"[Shop] Found {len(visual_matches)} visual matches")
        
        for match in visual_matches:
            if len(products) >= 12:  # Collect more to filter later
                break
            
            link = match.get("link", "")
            source = match.get("source", "")
            
            if not link or link in seen_links:
                continue
            
            # Skip non-shopping sites
            if not is_shopping_site(link, source):
                print(f"[Shop] Skipping non-shopping site: {source}")
                continue
            
            price_data = match.get("price", {})
            if isinstance(price_data, dict):
                price = price_data.get("extracted_value") or price_data.get("value", "N/A")
            else:
                price = price_data if price_data else "N/A"
            
            product = {
                "title": match.get("title", "Unknown Product"),
                "price": price,
                "thumbnail": match.get("thumbnail", ""),
                "link": link,
                "source": source,
                "has_price": has_valid_price(price)
            }
            
            products.append(product)
            seen_links.add(link)
        
        # Sort: products with prices first, then by source relevance
        products_with_price = [p for p in products if p["has_price"]]
        products_without_price = [p for p in products if not p["has_price"]]
        
        # Combine and limit to 5
        final_products = (products_with_price + products_without_price)[:5]
        
        # Remove the helper field before returning
        for p in final_products:
            p.pop("has_price", None)
        
        print(f"[Shop] Returning {len(final_products)} filtered products")
        
        return JSONResponse(content={
            "success": True,
            "products": final_products,
            "total": len(final_products)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Visual search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Visual search failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Detailed health check for Railway deployment."""
    return {
        "status": "healthy",
        "service": "Hybridation API",
        "version": "2.0.0",
        "features": {
            "360_panorama": True,
            "visual_shopping": True
        },
        "config": {
            "google_api_configured": bool(os.getenv("GOOGLE_API_KEY")),
            "openai_api_configured": bool(os.getenv("OPENAI_API_KEY")),
            "serpapi_configured": bool(os.getenv("SERPAPI_API_KEY")),
            "fallback_enabled": bool(os.getenv("OPENAI_API_KEY"))
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
