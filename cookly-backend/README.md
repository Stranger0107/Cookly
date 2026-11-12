# Cookly API

REST API for **Cookly**, a recipe finder and manager. Tell it what's in your kitchen
("eggs, onion, tomato") and it finds recipes you can make, from
[TheMealDB](https://www.themealdb.com/api.php) and from your own collection,
ranked by how many ingredients you already have. Missing ingredients go
straight onto a shopping list.

**Stack:** Node.js, Express 5, MongoDB + Mongoose, JWT auth, bcrypt, axios,
express-validator, helmet, cors, express-rate-limit, morgan, Jest + Supertest.

---

## Features

- Sign up / log in with JWT access tokens; passwords hashed with bcrypt
- Search TheMealDB by name, ingredient, category or area (proxied, normalized, cached)
- Save TheMealDB recipes to your collection (duplicates prevented)
- Create, edit and delete your own recipes, with search, filters and pagination
- **"What can I make?"**: matches your ingredients against TheMealDB *and* your saved
  recipes, ranked by match percentage, with missing ingredients listed
- Shopping list: add items by hand or add a recipe's missing ingredients in one call

---

## Getting started

### Prerequisites

- Node.js 18+ (developed on Node 24)
- A MongoDB database: local install or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Setup

```bash
cd cookly-backend
npm install
cp .env.example .env      # then edit .env
npm run dev               # starts on http://localhost:5000 with auto-reload
```

Check it's running:

```bash
curl http://localhost:5000/api/health
```

### Environment variables

| Variable          | Required | Default                                   | Description                                         |
|-------------------|----------|-------------------------------------------|-----------------------------------------------------|
| `PORT`            | no       | `5000`                                    | HTTP port                                           |
| `NODE_ENV`        | no       | `development`                             | `development`, `production` or `test`               |
| `MONGO_URI`       | **yes**  | none                                      | MongoDB connection string                           |
| `JWT_SECRET`      | **yes**  | none                                      | Secret used to sign JWTs (use a long random string) |
| `JWT_EXPIRES_IN`  | no       | `7d`                                      | Token lifetime, e.g. `1h`, `7d`                     |
| `MEALDB_BASE_URL` | no       | `https://www.themealdb.com/api/json/v1/1` | TheMealDB base URL (`1` is the free test key)       |
| `CLIENT_URL`      | no       | `http://localhost:5173`                   | Allowed CORS origin(s), comma-separated             |

Generate a good secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to start if `MONGO_URI` or `JWT_SECRET` is missing.

### Scripts

| Command                 | What it does                               |
|-------------------------|--------------------------------------------|
| `npm run dev`           | Start with nodemon (restarts on changes)   |
| `npm run dev:memory`    | Start with a local MongoDB (no install needed; data kept in `.data/`) |
| `npm start`             | Start normally (production)                |
| `npm test`              | Run the Jest test suite                    |
| `npm run test:watch`    | Re-run tests on file changes               |
| `npm run test:coverage` | Run tests with a coverage report           |

---

## API

All responses use the same envelope:

```jsonc
{ "success": true,  "data": { ... } }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "..." }] }
```

Protected routes need the header `Authorization: Bearer <token>` (from register/login).

### Health

| Method | Path          | Auth | Description                                                     |
|--------|---------------|------|-----------------------------------------------------------------|
| GET    | `/api/health` | no   | Server and database status (`503` if the DB is disconnected)    |

### Auth

| Method | Path                 | Auth | Body                          |
|--------|----------------------|------|-------------------------------|
| POST   | `/api/auth/register` | no   | `{ name, email, password }`   |
| POST   | `/api/auth/login`    | no   | `{ email, password }`         |
| GET    | `/api/auth/me`       | yes  | none                          |

Passwords: 8-72 characters, at least one letter and one number.

### TheMealDB proxy (public)

| Method | Path                       | Description                               |
|--------|----------------------------|-------------------------------------------|
| GET    | `/api/meals/search?q=`     | Search by name (full recipes)             |
| GET    | `/api/meals/ingredient?i=` | Meals containing one ingredient           |
| GET    | `/api/meals/category?c=`   | Meals in a category, e.g. `Seafood`       |
| GET    | `/api/meals/area?a=`       | Meals from a cuisine, e.g. `Italian`      |
| GET    | `/api/meals/random`        | A random meal (never cached)              |
| GET    | `/api/meals/categories`    | All categories with image and description |
| GET    | `/api/meals/:id`           | Full, normalized meal details             |

Lists return `{ count, results }`; "no results" is `count: 0`, not an error.

### My recipes (protected)

| Method | Path                            | Description                                                    |
|--------|---------------------------------|----------------------------------------------------------------|
| GET    | `/api/recipes`                  | List mine. Query: `search`, `category`, `source`, `page`, `limit` (max 50) |
| GET    | `/api/recipes/:id`              | Get one                                                        |
| POST   | `/api/recipes`                  | Create my own recipe                                           |
| POST   | `/api/recipes/save/:mealdbId`   | Save a TheMealDB recipe (optional body `{ rating, notes }`)    |
| PUT    | `/api/recipes/:id`              | Partial update (send only the fields to change)                |
| DELETE | `/api/recipes/:id`              | Delete                                                         |

Recipe body:

```json
{
  "title": "Masala Omelette",
  "ingredients": [{ "name": "Eggs", "measure": "2" }, { "name": "Onion" }],
  "steps": ["Beat the eggs", "Fry the onion", "Cook together"],
  "category": "Breakfast",
  "area": "Indian",
  "image": "https://...",
  "youtubeUrl": "https://...",
  "tags": ["quick"],
  "rating": 5,
  "notes": "Add chilli"
}
```

`steps` may also be a single string with one step per line.

### What can I make? (protected)

| Method | Path         | Description                                   |
|--------|--------------|-----------------------------------------------|
| POST   | `/api/match` | Rank recipes by the ingredients you have      |

```json
{ "ingredients": ["egg", "onion", "tomato"], "includeMealDb": true, "assumeStaples": true, "limit": 20 }
```

`ingredients` can also be a comma-separated string: `"eggs, onion, tomato"` (1-10 items).

Response (shortened):

```json
{
  "success": true,
  "data": {
    "pantry": ["egg", "onion", "tomato"],
    "count": 2,
    "results": [
      {
        "id": "665f...", "mealdbId": null, "title": "Masala Omelette", "source": "user",
        "matchPercent": 80, "matchedCount": 4, "totalIngredients": 5,
        "matchedIngredients": ["Eggs", "Onions", "Tomatoes", "Salt"],
        "missingIngredients": [{ "name": "Cheddar Cheese", "measure": "50g" }]
      },
      {
        "id": null, "mealdbId": "53225", "title": "Yemeni Lahsa", "source": "mealdb",
        "matchPercent": 57, "...": "..."
      }
    ]
  }
}
```

`source` is `user` (your own recipe), `saved` (your copy of a TheMealDB recipe) or `mealdb` (from TheMealDB only).

### Shopping list (protected)

| Method | Path                                         | Body                                                     |
|--------|----------------------------------------------|----------------------------------------------------------|
| GET    | `/api/shopping-list`                         | none (created empty on first use)                        |
| POST   | `/api/shopping-list/items`                   | `{ name, measure }` or `{ items: ["milk", { "name": "eggs", "measure": "6" }] }` |
| POST   | `/api/shopping-list/from-recipe/:recipeId`   | `{ ingredients: [what I have], assumeStaples? }`         |
| PATCH  | `/api/shopping-list/items/:itemId`           | `{ checked: true }`, or no body to toggle                |
| DELETE | `/api/shopping-list/items/:itemId`           | none                                                     |
| DELETE | `/api/shopping-list/checked`                 | none (removes all checked items)                         |

Items already on the list (and not checked) are skipped; responses report `added` and `skipped`.

---

## How it works

### Project structure

```
cookly-backend/
  src/
    config/        env loading + validation, MongoDB connection
    models/        User, Recipe, ShoppingList (Mongoose schemas)
    validators/    express-validator rules per feature
    middleware/    auth (JWT), validate, error handler
    controllers/   request -> response, no business logic
    services/      mealdbService (TheMealDB + cache), matchService (ranking)
    routes/        URL -> [validation, auth, controller]
    utils/         ApiError, TTL cache, normalizeMeal, normalizeIngredient, escapeRegex
    app.js         Express app (exported for tests, does not listen)
    server.js      connects to MongoDB, starts listening, graceful shutdown
  tests/           Jest + Supertest, in-memory MongoDB
```

A request flows through: `rate limit -> route -> validation -> auth -> controller -> service/model`,
and any thrown error lands in the central error handler.

### Match algorithm (`POST /api/match`)

1. **Normalize** the user's ingredients: lowercase, strip punctuation, simple singularize
   (`"Cherry Tomatoes"` -> `"cherry tomato"`), de-duplicate.
2. **Your recipes:** load your collection (own + saved) from MongoDB.
3. **TheMealDB:** the free tier only filters by *one* ingredient and matches names exactly
   (`egg` and `eggs` return different meals), so we call `filter.php?i=` for every ingredient
   and its plural **in parallel**, count how many of your ingredients each meal appeared under,
   and fetch full details (`lookup.php`) for the top 10 only. Meals you already saved are
   skipped; your saved copy is scored instead.
4. **Score** each recipe: an ingredient matches if the names are equal or one contains the
   other as whole words (`chicken` matches `chicken breast`, `egg` does not match `eggplant`).
   `matchPercent = matched / total recipe ingredients`. With `assumeStaples`, water, salt and
   black pepper count as available. Recipes using none of your ingredients are dropped.
5. **Merge and sort** by match percent, then matched count, then fewest missing.

If TheMealDB is down, you still get your own recipes plus a `warnings` message
(`Promise.allSettled` keeps one failed call from sinking the whole request).

### Design decisions

- **Consistent errors:** `ApiError` carries an HTTP status; the error handler also maps
  Mongoose `CastError`/`ValidationError`, duplicate keys (`11000` -> 409), JWT errors and bad JSON.
  Unexpected errors return a generic 500 so internals don't leak.
- **Express 5:** errors thrown in async handlers reach the error handler automatically,
  so there's no `try/catch` or `asyncHandler` boilerplate.
- **Ownership:** every recipe and shopping list query includes `owner: req.user._id`. Another
  user's recipe returns **404, not 403**, so ids can't be probed.
- **Mass-assignment protection:** controllers read input with `matchedData()`, so only
  validated fields are used; `owner`, `source` etc. sent by a client are ignored.
- **Passwords:** bcrypt (cost 12), `passwordHash` has `select: false` *and* is stripped in
  `toJSON`. Login returns the same error for unknown email and wrong password.
- **Duplicates:** a partial unique index on `{ owner, mealdbId }` guarantees a meal is saved
  once per user, even under concurrent requests.
- **Caching:** TheMealDB responses are cached in memory for 10 minutes (max 500 entries).
  The *promise* is cached, so identical concurrent requests share one HTTP call. Failures
  are never cached. Trade-off: per-process and lost on restart; Redis would be next.
- **External calls:** 8 s timeout; timeouts map to `504`, other failures to `502`;
  `{ meals: null }` is treated as an empty result.
- **Security middleware:** `helmet` headers, CORS limited to `CLIENT_URL`, a rate limit of
  100 requests / 15 min per IP (20 for login/register), and a 100 kb JSON body limit.

---

## Testing

```bash
npm test
```

- Tests use **mongodb-memory-server**, a throwaway MongoDB started per test file, so no
  database setup is needed and your real data is never touched. The first run downloads a
  MongoDB binary (~75 MB) into `node_modules/.cache`.
- **TheMealDB is always mocked**: no network calls, so tests are fast and deterministic.
- Coverage: auth (register, login, `me`, expired/tampered tokens), recipe CRUD + ownership +
  save-from-MealDB, TheMealDB service (cache, timeouts, `meals: null`), normalizers, match
  scoring and ranking, and the shopping list.

---

## Limitations / ideas for later

- Ingredient matching is rule-based; a synonym table ("scallion" = "spring onion") would help.
- Refresh tokens + httpOnly cookies instead of a single long-lived access token.
- Shared cache (Redis) when running more than one server instance.
- Pre-filter recipes in MongoDB using stored normalized ingredient keys for very large collections.
