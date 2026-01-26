@agents.md

# Role
Act as a **Lead Architect & Senior Fullstack Developer** (refer to quality standards in agents.md).

# Project: Plan2Shop AI
I want to build a complete MVP SaaS.
Concept: The user uploads a 2D architectural floor plan (B&W). The AI furnishes it photorealistically based on a style prompt. The user can then interact with the generated image (crop items) to find real products to buy using Visual Search.

# Technical Architecture (Strict)
Implement a Monorepo structure:
1. **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS.
   - UI Library: Shadcn/UI (for modern aesthetics).
   - Animation: Framer Motion.
   - Icons: Lucide React.
2. **Backend:** Python FastAPI.
   - Package manager: Pip / venv.
   - SDK: Use the latest `google-genai` Python SDK.

# AI & API Configuration (CRITICAL)
1. **Image Generation (The Decorator):**
   - **Model:** `gemini-3-pro-image-preview`
   - **Documentation Reference:** https://ai.google.dev/gemini-api/docs/image-generation?hl=fr
   - **Function:** The endpoint receives the plan image + prompt.
   - **Implementation Detail:** Read the documentation to correctly handle the image input and the generation parameters (like aspect ratio or negative prompts if supported).
   - **Prompt Logic:** Instruct the model to "Redecorate this room keeping strict structural integrity of walls/windows. Style: [USER PROMPT]".

2. **Text/Logic Generation (The Brain):**
   - **Model:** `gemini-2.5-flash-lite`
   - **Documentation Reference:** https://ai.google.dev/gemini-api/docs/models/gemini
   - **Function:** Use this lightweight model for any prompt refinement (turning "industrial" into a detailed prompt) or JSON formatting if needed.

3. **Shopping (Visual Search):**
   - **Provider:** `serpapi` (Google Lens API).
   - **Function:** Endpoint receives a cropped image blob (base64), searches for visual matches using `engine="google_lens"`, and returns a JSON list (Title, Price, Image, Shopping Link).

# Execution Plan (Step-by-Step)

## Step 1: Structure & Backend Setup
Create folders `frontend` and `backend`.
Inside `backend`:
- Initialize FastAPI app (`main.py`).
- Configure CORS to allow `localhost:3000`.
- Create endpoint `POST /generate`:
  - Accepts `file` (plan) + `style`.
  - Uses `gemini-3-pro-image-preview` according to the provided docs.
  - Returns the generated image URL or base64.
- Create endpoint `POST /shop`:
  - Accepts `image_blob`.
  - Calls SerpApi.
  - Returns the product list.
- Create a `.env.example` template for `GOOGLE_API_KEY` and `SERPAPI_API_KEY`.

## Step 2: Modern Frontend (The "Whoa" Experience)
Inside `frontend`:
- Initialize Next.js. Install Shadcn/UI components (button, input, card, sheet, skeleton, toast).
- Create a main page (`page.tsx`) with a "Midnight aesthetic" (Dark mode).
- **Upload Component:** Smooth Drag & Drop zone for the floor plan.
- **Generation Component:** Text input for style + "Magic Generate" button. Show a sophisticated loader/skeleton during generation.
- **Interactive Component (Crucial):**
  - Display the generated result in high quality.
  - Implement `react-image-crop`. Allow the user to draw a box around a furniture piece.
  - On crop complete -> Trigger animation -> Open a Sidebar (Shadcn Sheet) displaying results from `/shop`.

## Step 3: Polish & UX
- Use a modern font (Geist or Inter).
- Add micro-interactions: Hover effects, smooth transitions between upload state and result state.
- Ensure the UI is foolproof and responsive.

# Instructions for Cursor
- Generate the file tree first.
- Code the Backend first. **Read the provided Gemini documentation URLs** to ensure correct implementation of the new models.
- Code the Frontend second, connecting to the Backend APIs.
- Adhere strictly to clean code practices from `agents.md`.
- No "TODO" placeholders. Write complete, functional code.

GO.