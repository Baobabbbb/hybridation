# Plan2Shop AI

Transform architectural floor plans into photorealistic furnished rooms using AI, then find real products to buy.

## Features

- **AI Room Generation**: Upload a 2D floor plan and watch AI transform it into a photorealistic furnished room
- **Style Customization**: Choose from predefined styles or describe your own
- **Visual Shopping**: Click on any furniture piece to find similar real products to purchase

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/UI
- Framer Motion
- React Image Crop

### Backend
- Python FastAPI
- Google Gemini AI (gemini-3-pro-image-preview, gemini-2.5-flash-lite)
- SerpApi (Google Lens)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Google AI API Key
- SerpApi API Key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template and add your keys
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local if needed

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment (Railway)

### Backend

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add environment variables:
   - `GOOGLE_API_KEY`
   - `SERPAPI_API_KEY`
   - `FRONTEND_URL` (your frontend Railway URL)
5. Deploy

### Frontend

1. Create another Railway service in the same project
2. Set the root directory to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` (your backend Railway URL)
4. Deploy

## API Endpoints

### `POST /generate`

Generate a furnished room from a floor plan.

**Parameters:**
- `file`: Floor plan image (multipart/form-data)
- `style`: Decoration style (string)

**Returns:**
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "enhanced_style": "..."
}
```

### `POST /shop`

Search for similar products using visual search.

**Parameters:**
- `image_blob`: Base64 encoded cropped image

**Returns:**
```json
{
  "success": true,
  "products": [
    {
      "title": "Product Name",
      "price": 99.99,
      "currency": "USD",
      "image": "https://...",
      "link": "https://...",
      "source": "Store Name"
    }
  ],
  "total": 10
}
```

## License

MIT
