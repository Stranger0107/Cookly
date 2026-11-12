# Cookly Web

React frontend for **Cookly**. Type what's in your kitchen, get recipes ranked by
match, save favourites, write your own and turn missing ingredients into a shopping list.

Design: a **bento grid** layout (tiles of different sizes) with **subtle glassmorphism**
(frosted navigation, pantry input, filter bars, modals and toasts over a soft gradient mesh),
in light and dark mode, responsive from 375px phones to wide desktops.

**Stack:** React 19, Vite, React Router 7 (data router), axios, lucide-react icons,
plain CSS with design tokens (no UI framework).

---

## Run it locally

The frontend talks to the API in [`../cookly-backend`](../cookly-backend/README.md).

```bash
# terminal 1 - the API (no MongoDB install needed with dev:memory)
cd cookly-backend
npm install
npm run dev:memory        # or `npm run dev` with MONGO_URI in .env

# terminal 2 - the web app
cd cookly-frontend
npm install
npm run dev               # http://localhost:5173
```

In development, Vite proxies every `/api` request to `http://localhost:5000`
(see `vite.config.js`), so there's no CORS setup and the code just calls `/api/...`.

### Environment

| Variable       | Default | Description |
|----------------|---------|-------------|
| `VITE_API_URL` | `/api`  | API base URL. Leave empty locally; set it to your deployed API (e.g. `https://cookly-api.onrender.com/api`) for production builds. |

In production the backend serves the built app itself (`npm run build`, then the API serves
`dist/` on the same URL), so `VITE_API_URL` stays empty. See [DEPLOY.md](../DEPLOY.md).
If you host the frontend on a different domain instead, set `VITE_API_URL` and add the
frontend's URL to the backend's `CLIENT_URL` so CORS allows it.

### Scripts

| Command           | What it does                         |
|-------------------|--------------------------------------|
| `npm run dev`     | Dev server with hot reload           |
| `npm run build`   | Production build into `dist/`        |
| `npm run preview` | Serve the production build locally   |

---

## Screens and the endpoints they use

| Route                 | Screen | API calls |
|-----------------------|--------|-----------|
| `/`                   | Landing (bento hero, features, how it works) | `GET /meals/category` (hero photos) |
| `/login`, `/register` | Auth, with inline field errors and a live password checklist | `POST /auth/login`, `POST /auth/register` |
| `/home`               | Dashboard: pantry tile, random meal, stats, recently added, list preview, categories | `GET /meals/random`, `GET /recipes`, `GET /shopping-list`, `PATCH /shopping-list/items/:id`, `GET /meals/categories` |
| `/match?i=egg,onion`  | "What can I make?": best match as a hero tile, tier filters, sort | `POST /match`, `POST /recipes/save/:mealdbId`, `POST /shopping-list/from-recipe/:id` |
| `/explore`            | Browse TheMealDB by name, ingredient, category or cuisine | `GET /meals/search`, `/meals/ingredient`, `/meals/category`, `/meals/area`, `/meals/categories` |
| `/meals/:mealdbId`    | TheMealDB recipe detail (save, add missing to list) | `GET /meals/:id`, `GET /recipes?source=mealdb` |
| `/recipes`            | My Recipes: search, category and source filters, pagination | `GET /recipes` |
| `/recipes/:id`        | My recipe detail: match tile, have/missing ingredients, method, video, rating and notes autosave, delete | `GET /recipes/:id`, `PUT /recipes/:id`, `DELETE /recipes/:id`, `POST /shopping-list/items` |
| `/recipes/new`, `/recipes/:id/edit` | Recipe form with ingredient and step builders and a live preview | `POST /recipes`, `PUT /recipes/:id` |
| `/shopping-list`      | List with optimistic ticks, progress ring, clear checked | all `/shopping-list` routes |
| `/profile`            | Account details, theme picker, log out | `GET /auth/me` (on app load) |

---

## Project structure

```
src/
  api/
    client.js        axios instance: adds the JWT, unwraps { success, data }, normalizes errors
    index.js         one function per backend endpoint
  context/
    AuthContext.jsx  login / register / logout, restores the session via /auth/me, handles 401s
    ThemeContext.jsx light / dark / system
    ToastContext.jsx glass toasts: toast.success('Saved!')
  hooks/
    useAsync.js          loading / error / data for any request, ignores stale responses
    usePantry.js         last-used ingredients, remembered in localStorage
    useRecipeActions.js  "save meal" and "add missing to list" shared by several pages
  components/        Layout (top bar + mobile tab bar), RecipeCard, ChipInput, Modal, ui.jsx primitives
  pages/             one file per screen
  styles/
    tokens.css       colours, radius, shadows, glass, light + dark palettes
    base.css         reset, gradient mesh, typography, bento grid + tiles
    components.css   buttons, inputs, chips, cards, rings, toasts, modals, nav
    pages.css        page-specific layouts
  utils/ingredients.js  browser copy of the backend's ingredient matching rules
```

## Design decisions

- **State in the URL.** Match searches (`/match?i=egg,onion`), Explore mode and My Recipes
  filters live in the query string, so results survive a refresh, can be shared, and the
  back button works.
- **One API client.** Every request goes through `api/client.js`, so auth headers, error
  shapes (`{ status, message, fieldErrors }`) and session expiry are handled once.
  Server validation errors appear under the matching form field.
- **Optimistic updates** on the shopping list: a tick shows instantly and rolls back if the
  request fails.
- **Instant match on recipe pages.** `utils/ingredients.js` mirrors the backend's matching
  rules, so the "Your match" tile updates as you edit your pantry without another request.
- **"Add missing to list" for TheMealDB meals.** The API only adds items from recipes in
  your collection, so the app saves the meal first (or finds your existing copy) and then
  adds the missing items, as one action.
- **Glass with restraint.** Glass is only used for floating and interactive layers (nav,
  pantry input, filter bars, modals, toasts, photo captions). Content tiles are solid so
  text keeps AA contrast. Motion respects `prefers-reduced-motion`.
- **Token storage.** The JWT lives in `localStorage` for simplicity. The production-grade
  upgrade is httpOnly cookies + refresh tokens (see the backend README).
