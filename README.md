# Cookly

Recipe finder and manager. Find recipes from the ingredients you already have, save favourites from TheMealDB, write your own and build a shopping list from what is missing.

- [`cookly-backend/`](cookly-backend/README.md): Node.js + Express + MongoDB REST API
- [`cookly-frontend/`](cookly-frontend/README.md): React + Vite web app (bento grid + glassmorphism)

## Quick start

```bash
# API on http://localhost:5000 (runs a local MongoDB for you)
cd cookly-backend && npm install && npm run dev:memory

# Web app on http://localhost:5173 (in a second terminal)
cd cookly-frontend && npm install && npm run dev
```
