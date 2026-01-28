@agents.md

# Role
Act as a **Senior Python Backend Engineer** specializing in Generative AI APIs.

# Context
The Frontend is already built. We only need to implement the **Backend logic** in `main.py`.
The goal is to serve a "Plan2Shop" application where users upload a floor plan, get a 360° panoramic furnished image, and can shop for items visible in that image.

# Task
Rewrite (or Implement) `backend/main.py` using **FastAPI**.

# Requirements & Logic

## 1. Setup & Config
- Use `fastapi`, `uvicorn`, `python-multipart`.
- Configure **CORS** allowing `["*"]` (or specifically `http://localhost:3000`) to ensure the existing Frontend can connect.
- Load environment variables `GOOGLE_API_KEY` and `SERPAPI_API_KEY` using `python-dotenv`.

## 2. Endpoint: POST /generate (The 360° Decorator)
- **Input:** Accepts a file (`UploadFile`) + a text field (`prompt`).
- **AI Model:** Use `google-genai` SDK with the model `gemini-3-pro-image-preview` (or compatible latest vision model).
- **Critical Prompt Engineering:** You must intercept the user's prompt and wrap it.
  - *System Instruction:* "You are an expert interior designer. Generate a high-resolution **360-degree equirectangular projection** of the room. The image must be seamless, with a 2:1 aspect ratio, suitable for a VR sphere viewer."
  - *User Prompt:* Combine this with the user's style request (e.g., "Industrial style...").
- **Output:** Return the generated image (base64 encoded or URL).

## 3. Endpoint: POST /shop (The Visual Personal Shopper)
- **Input:** Accepts an image file (`UploadFile`). This will be a "crop" sent by the frontend when the user clicks a furniture item.
- **Service:** Use `serpapi` (Google Search Results).
- **Logic:**
  - Initialize `GoogleSearch` with `engine="google_lens"`.
  - Pass the image binary data (or save temporarily if SDK requires path, prefer in-memory if possible).
  - Extract the `visual_matches` list.
- **Output:** Return a JSON list containing `title`, `price`, `thumbnail`, and `link` for the top 5 matches.

# Dependencies
Create or update `requirements.txt` to include:
- `fastapi`
- `uvicorn`
- `python-multipart`
- `python-dotenv`
- `google-genai` (Official Google Gen AI SDK)
- `google-search-results` (Official SerpApi SDK)
- `Pillow` (for image processing if needed)

# Instructions for Cursor
- Code the complete `main.py`.
- Ensure error handling (try/except) for API calls.
- Do not use placeholders. Write production-ready code.

GO.