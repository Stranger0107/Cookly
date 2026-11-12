# Cookly

Recipe finder and manager. Find recipes from the ingredients you already have, save favourites from TheMealDB, write your own and build a shopping list from what is missing.

- [`cookly-backend/`](cookly-backend/README.md): Node.js + Express + MongoDB REST API
- [`cookly-frontend/`](cookly-frontend/README.md): React + Vite web app (bento grid + glassmorphism)

## Quick start

```bash
npm run setup   # installs root, backend and frontend dependencies
npm run dev     # API on :5000 (with a local MongoDB) + web app on :5173
```

Open <http://localhost:5173>. The web app calls `/api/...`, and Vite forwards those requests
to the API, so the two are connected with no extra setup.

| Command          | What it does |
|------------------|--------------|
| `npm run dev`    | Run both apps; the API uses a local in-memory MongoDB (data kept in `cookly-backend/.data`) |
| `npm run dev:db` | Run both apps; the API uses `MONGO_URI` from `cookly-backend/.env` |
| `npm run build`  | Build the React app into `cookly-frontend/dist` |
| `npm start`      | Production mode: the API also serves the built app at <http://localhost:5000> |
| `npm test`       | Backend test suite |

## Deploy

One Render web service plus a free MongoDB Atlas database. See **[DEPLOY.md](DEPLOY.md)**.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Stranger0107/Cookly)
