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

### Prérequis

1. Créer un compte sur [Railway](https://railway.app)
2. Installer le CLI Railway (optionnel) : `npm i -g @railway/cli`
3. Avoir un dépôt Git (GitHub/GitLab) avec le code

### Étape 1 : Déployer le Backend

1. **Créer un nouveau projet Railway**
   - Aller sur [railway.app](https://railway.app)
   - Cliquer sur "New Project"
   - Sélectionner "Deploy from GitHub repo"
   - Choisir votre dépôt `hybridation`

2. **Configurer le service Backend**
   - Cliquer sur "New Service"
   - Sélectionner "GitHub Repo" et choisir votre dépôt
   - Dans les settings du service :
     - **Root Directory** : `backend`
     - **Build Command** : `pip install -r requirements.txt`
     - **Start Command** : `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Ajouter les variables d'environnement**
   - Aller dans l'onglet "Variables"
   - Ajouter les variables suivantes :
     ```
     GOOGLE_API_KEY=votre_clé_google_api
     OPENAI_API_KEY=votre_clé_openai_api
     SERPAPI_API_KEY=votre_clé_serpapi
     PORT=8000
     ```
   - **Note** : Ne pas ajouter `FRONTEND_URL` maintenant, on le fera après avoir déployé le frontend

4. **Déployer**
   - Railway va automatiquement détecter les changements et déployer
   - Attendre que le déploiement soit terminé
   - Noter l'URL du backend (ex: `https://backend-production-xxxx.up.railway.app`)

### Étape 2 : Déployer le Frontend

1. **Créer un nouveau service dans le même projet**
   - Dans votre projet Railway, cliquer sur "New Service"
   - Sélectionner "GitHub Repo" et choisir le même dépôt
   - Dans les settings :
     - **Root Directory** : `frontend`
     - **Build Command** : `npm install && npm run build`
     - **Start Command** : `npm start`

2. **Ajouter les variables d'environnement**
   - Aller dans l'onglet "Variables"
   - Ajouter :
     ```
     NEXT_PUBLIC_API_URL=https://votre-backend-url.railway.app
     ```
   - Remplacer par l'URL réelle de votre backend

3. **Déployer**
   - Railway va automatiquement builder et déployer
   - Noter l'URL du frontend (ex: `https://frontend-production-yyyy.up.railway.app`)

### Étape 3 : Configurer CORS (Backend)

1. **Retourner au service Backend**
   - Aller dans les "Variables" du service backend
   - Ajouter ou modifier :
     ```
     FRONTEND_URL=https://votre-frontend-url.railway.app
     ```
   - Railway va redéployer automatiquement

### Vérification

1. **Backend Health Check**
   - Visiter : `https://votre-backend-url.railway.app/health`
   - Devrait retourner : `{"status":"healthy","google_api_configured":true,...}`

2. **Frontend**
   - Visiter : `https://votre-frontend-url.railway.app`
   - L'application devrait se charger

### Commandes Railway CLI (optionnel)

```bash
# Se connecter
railway login

# Lier le projet
railway link

# Déployer
railway up

# Voir les logs
railway logs

# Ajouter des variables
railway variables set GOOGLE_API_KEY=votre_clé
```

### Troubleshooting

- **Erreur de build** : Vérifier que tous les fichiers sont commités
- **CORS errors** : Vérifier que `FRONTEND_URL` est correctement configuré dans le backend
- **Port errors** : Railway utilise automatiquement `$PORT`, ne pas le hardcoder
- **Variables d'environnement** : Vérifier qu'elles sont bien définies dans Railway (pas dans `.env`)

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
