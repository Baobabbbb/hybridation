"""
Plan2Shop AI - Backend API
FastAPI server for image generation and visual shopping search.
"""

import os
import base64
import io
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from PIL import Image
from google import genai
from google.genai import types
from serpapi import GoogleSearch

# Load environment variables from the same directory as this file
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Initialize FastAPI app
app = FastAPI(
    title="Plan2Shop AI API",
    description="Transform architectural plans into photorealistic furnished rooms",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Railway will set the frontend URL
        os.getenv("FRONTEND_URL", ""),
    ],
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


@app.post("/generate")
async def generate_furnished_room(
    file: UploadFile = File(..., description="The architectural floor plan image"),
    style: str = Form(..., description="The decoration style (e.g., 'modern minimalist', 'industrial loft')")
):
    """
    Generate a photorealistic furnished room from an architectural plan.
    
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
        
        # Initialize Gemini client
        client = get_genai_client()
        
        # First, use gemini-2.5-flash-lite to enhance the style prompt
        enhanced_prompt_response = client.models.generate_content(
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
        
        # Prepare the image for Gemini
        image_bytes = io.BytesIO()
        input_image.save(image_bytes, format="PNG")
        image_bytes.seek(0)
        
        # Create the generation prompt
        generation_prompt = f"""Transform this 2D architectural floor plan into a photorealistic interior photograph.

CRITICAL INSTRUCTIONS:
- Keep the EXACT same room layout, walls, windows, and doors positions
- Add realistic furniture, decorations, and lighting
- Make it look like a professional real estate photograph
- The perspective should be as if photographed by a professional photographer

STYLE: {enhanced_style}

Generate a high-quality, photorealistic image of this furnished room."""

        # Call Gemini 3 Pro Image Preview for image generation
        response = client.models.generate_content(
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
        
        # Extract the generated image from response
        generated_image_base64 = None
        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                generated_image_base64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                mime_type = part.inline_data.mime_type
                break
        
        if not generated_image_base64:
            raise HTTPException(
                status_code=500, 
                detail="Failed to generate image. The model did not return an image."
            )
        
        return JSONResponse(content={
            "success": True,
            "image": f"data:{mime_type};base64,{generated_image_base64}",
            "enhanced_style": enhanced_style
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


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
        
        # Convert base64 to image and save temporarily
        image = base64_to_image(image_blob)
        
        # Save to a temporary buffer for upload
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        image_base64_clean = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        # Create data URL for SerpApi
        data_url = f"data:image/png;base64,{image_base64_clean}"
        
        # Call SerpApi Google Lens
        params = {
            "engine": "google_lens",
            "url": data_url,
            "api_key": serpapi_key
        }
        
        search = GoogleSearch(params)
        results = search.get_dict()
        
        # Extract shopping results
        products = []
        
        # Check for visual matches with shopping info
        visual_matches = results.get("visual_matches", [])
        for match in visual_matches[:10]:  # Limit to 10 results
            product = {
                "title": match.get("title", "Unknown Product"),
                "price": match.get("price", {}).get("extracted_value") or match.get("price", {}).get("value", "N/A"),
                "currency": match.get("price", {}).get("currency", "USD"),
                "image": match.get("thumbnail", ""),
                "link": match.get("link", ""),
                "source": match.get("source", "")
            }
            if product["link"]:  # Only add if there's a link
                products.append(product)
        
        # Also check shopping results if available
        shopping_results = results.get("shopping_results", [])
        for item in shopping_results[:5]:
            product = {
                "title": item.get("title", "Unknown Product"),
                "price": item.get("price", {}).get("extracted_value") or item.get("price", "N/A"),
                "currency": item.get("currency", "USD"),
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
        "serpapi_configured": bool(os.getenv("SERPAPI_API_KEY"))
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
