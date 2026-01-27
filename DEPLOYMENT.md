# Guide de Déploiement Railway

Ce guide vous explique étape par étape comment déployer Plan2Shop AI sur Railway.

## 📋 Prérequis

- ✅ Compte Railway créé sur [railway.app](https://railway.app)
- ✅ Dépôt GitHub avec le code (déjà fait ✅)
- ✅ Clés API :
  - `GOOGLE_API_KEY` (Gemini)
  - `OPENAI_API_KEY` (Fallback)
  - `SERPAPI_API_KEY` (Recherche visuelle)

## 🚀 Déploiement

### Étape 1 : Créer le Projet Railway

1. Aller sur [railway.app](https://railway.app) et se connecter
2. Cliquer sur **"New Project"**
3. Sélectionner **"Deploy from GitHub repo"**
4. Autoriser Railway à accéder à votre compte GitHub si nécessaire
5. Choisir le dépôt **`Baobabbbb/hybridation`**

### Étape 2 : Déployer le Backend

1. **Créer le service Backend**
   - Dans votre projet Railway, cliquer sur **"+ New"** → **"GitHub Repo"**
   - Sélectionner le même dépôt `hybridation`
   - Railway va détecter automatiquement le projet

2. **Configurer le service**
   - Cliquer sur le service créé
   - Aller dans l'onglet **"Settings"**
   - **Root Directory** : `backend`
   - **Build Command** : (laisser vide, Railway détectera automatiquement)
   - **Start Command** : (laisser vide, le Procfile sera utilisé)

3. **Ajouter les variables d'environnement**
   - Aller dans l'onglet **"Variables"**
   - Cliquer sur **"+ New Variable"** et ajouter :
   
   ```
   GOOGLE_API_KEY=votre_clé_google_api_ici
   OPENAI_API_KEY=votre_clé_openai_api_ici
   SERPAPI_API_KEY=votre_clé_serpapi_ici
   ```
   
   ⚠️ **Important** : Ne pas ajouter `FRONTEND_URL` maintenant, on le fera après avoir déployé le frontend.

4. **Déployer**
   - Railway va automatiquement détecter les changements et commencer le build
   - Attendre que le déploiement soit terminé (icône verte)
   - Cliquer sur l'onglet **"Settings"** → **"Generate Domain"** pour obtenir une URL publique
   - **Noter l'URL du backend** (ex: `https://backend-production-xxxx.up.railway.app`)

5. **Vérifier le déploiement**
   - Visiter `https://votre-backend-url.railway.app/health`
   - Devrait retourner : `{"status":"healthy","google_api_configured":true,"openai_api_configured":true,...}`

### Étape 3 : Déployer le Frontend

1. **Créer le service Frontend**
   - Dans le même projet Railway, cliquer sur **"+ New"** → **"GitHub Repo"**
   - Sélectionner le même dépôt `hybridation`

2. **Configurer le service**
   - Cliquer sur le service frontend créé
   - Aller dans l'onglet **"Settings"**
   - **Root Directory** : `frontend`
   - **Build Command** : (laisser vide, Railway détectera automatiquement)
   - **Start Command** : (laisser vide, le package.json sera utilisé)

3. **Ajouter les variables d'environnement**
   - Aller dans l'onglet **"Variables"**
   - Cliquer sur **"+ New Variable"** et ajouter :
   
   ```
   NEXT_PUBLIC_API_URL=https://votre-backend-url.railway.app
   ```
   
   ⚠️ **Remplacer** `votre-backend-url.railway.app` par l'URL réelle de votre backend (notée à l'étape 2.4)

4. **Déployer**
   - Railway va automatiquement builder et déployer
   - Attendre que le build soit terminé (peut prendre 2-3 minutes)
   - Cliquer sur l'onglet **"Settings"** → **"Generate Domain"** pour obtenir une URL publique
   - **Noter l'URL du frontend** (ex: `https://frontend-production-yyyy.up.railway.app`)

### Étape 4 : Configurer CORS (Backend)

1. **Retourner au service Backend**
   - Aller dans le service backend créé précédemment
   - Aller dans l'onglet **"Variables"**
   - Cliquer sur **"+ New Variable"** et ajouter :
   
   ```
   FRONTEND_URL=https://votre-frontend-url.railway.app
   ```
   
   ⚠️ **Remplacer** `votre-frontend-url.railway.app` par l'URL réelle de votre frontend

2. **Redéployer**
   - Railway va automatiquement redéployer le backend avec la nouvelle variable
   - Attendre que le redéploiement soit terminé

### Étape 5 : Vérification Finale

1. **Backend Health Check**
   - Visiter : `https://votre-backend-url.railway.app/health`
   - Vérifier que toutes les clés sont configurées : `"google_api_configured":true`, `"openai_api_configured":true`, etc.

2. **Frontend**
   - Visiter : `https://votre-frontend-url.railway.app`
   - L'application devrait se charger
   - Tester l'upload d'un plan et la génération

## 🔧 Configuration des Variables d'Environnement

### Backend
```
GOOGLE_API_KEY=votre_clé_google
OPENAI_API_KEY=votre_clé_openai
SERPAPI_API_KEY=votre_clé_serpapi
FRONTEND_URL=https://votre-frontend-url.railway.app
```

### Frontend
```
NEXT_PUBLIC_API_URL=https://votre-backend-url.railway.app
```

## 📝 Notes Importantes

- ⚠️ **Ne jamais commit les fichiers `.env`** (déjà dans `.gitignore`)
- ✅ Railway utilise automatiquement le `$PORT` fourni, ne pas le hardcoder
- ✅ Les fichiers `railway.json` et `Procfile` sont déjà configurés
- ✅ Le système de fallback OpenAI est activé automatiquement si Gemini est surchargé

## 🐛 Troubleshooting

### Erreur de build Backend
- Vérifier que `requirements.txt` est à jour
- Vérifier que Python 3.11 est utilisé (défini dans `runtime.txt`)

### Erreur de build Frontend
- Vérifier que `package.json` contient les scripts `build` et `start`
- Vérifier les logs Railway pour plus de détails

### Erreurs CORS
- Vérifier que `FRONTEND_URL` est correctement configuré dans le backend
- Vérifier que l'URL ne contient pas de slash final

### Variables d'environnement non chargées
- Vérifier qu'elles sont bien définies dans Railway (pas dans `.env`)
- Redéployer après avoir ajouté/modifié des variables

### Le frontend ne peut pas joindre le backend
- Vérifier que `NEXT_PUBLIC_API_URL` pointe vers la bonne URL du backend
- Vérifier que le backend est bien déployé et accessible

## 📊 Monitoring

- **Logs** : Cliquer sur le service → Onglet "Deployments" → Cliquer sur un déploiement → Voir les logs
- **Métriques** : Onglet "Metrics" pour voir CPU, RAM, etc.
- **Health Check** : Visiter `/health` sur le backend

## 🎉 C'est fait !

Votre application Plan2Shop AI est maintenant déployée sur Railway et accessible publiquement !
