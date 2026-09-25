# API reference

All REST endpoints live under `/api`, take and return JSON, and report failures as `{ "error": "..." }`.

## Authentication

Log in with `POST /api/login` to get a signed JWT, then send it with every other request:

```http
Authorization: Bearer <token>
```

Tokens carry the user's ID and role and expire after 7 days by default (`JWT_EXPIRES_IN`). The server keeps no session state, so logging out just means discarding the token. A missing, tampered or expired token gets a `401`, and a role that isn't allowed gets a `403`.

`POST /api/login` and `POST /api/register` are rate-limited to 20 requests per IP every 15 minutes (`AUTH_RATE_LIMIT`); extra requests get a `429`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/register` | – | Create an account. Body: `fullname`, `email`, `phone`, `password`, `role` (`chef`, `manager` or `admin`) |
| `POST` | `/api/login` | – | Body: `email`, `password`. Returns `{ token, user }` |
| `GET` | `/api/session` | Any role | Returns `{ user }` for the token's owner |

Passwords must be at least 8 characters with an uppercase letter, a lowercase letter, a digit and a symbol. They are stored as bcrypt hashes and never returned by the API.

## Dashboard

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard` | Any role | Overall counts plus role-specific data: a chef's recent recipes, expiring items and suggestions; a manager's stock value, expiring and low-stock items; an admin's role breakdown and recent activity |

## Recipes

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/recipes` | Chef | List recipes, newest first. `?filter=mine` returns only your own |
| `GET` | `/api/recipes/view/:recipeId` | Chef | Get one recipe and increment its view count |
| `POST` | `/api/recipes/add` | Chef | Create a recipe (see the body below) |
| `PUT` | `/api/recipes/update/:recipeId` | Chef, author only | Update any of the fields below except `chef` |
| `DELETE` | `/api/recipes/delete/:recipeId` | Chef, author only | Delete a recipe |
| `POST` | `/api/recipes/analyze-health/:recipeId` | Chef | AI health analysis of the stored ingredients. Returns `{ summary, concerns[], suggestions[{ suggestion, explanation }] }`, or `503` if `GEMINI_API_KEY` isn't set |
| `POST` | `/api/recipes/translate/:recipeId` | Chef | Body: `{ "targetLanguage": "es" }`. Returns the translated `title`, `ingredients` and `instructions` |

Recipe body:

```json
{
  "title": "Classic Spaghetti Carbonara",
  "chef": "Alex Morgan",
  "ingredients": ["400 g spaghetti", "150 g guanciale, diced"],
  "instructions": ["Boil the spaghetti until al dente.", "Toss with the guanciale off the heat."],
  "mealType": "Dinner",
  "cuisineType": "Italian",
  "prepTime": 25,
  "difficulty": "Medium",
  "servings": 4
}
```

- `ingredients` (1–20 entries, each at least 3 characters) and `instructions` (1–15 entries, each at least 10 characters) must be arrays of strings. Entries are trimmed and empty ones dropped.
- Titles are unique across all recipes (`409` on a clash).
- `mealType`: `Breakfast`, `Lunch`, `Dinner`, `Snack`. `cuisineType`: `Italian`, `Asian`, `Mexican`, `American`, `French`, `Indian`, `Mediterranean`, `Other`. `difficulty`: `Easy`, `Medium`, `Hard`.
- `prepTime` is 1–480 minutes and `servings` is 1–20.
- The server sets `recipeId` (e.g. `R-00001`), `userId`, `views` and `createdDate`; values sent for them are ignored.

## Inventory

The inventory is shared by all users.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/inventory` | Any role | Returns `{ inventoryItems, stats }`. Optional query: `category`, `location`, `status` (`In Stock` by default, `Consumed`, `Wasted` or `all`), `expiringWithinDays`, `sortBy`, `sortDir` (`asc` or `desc`) |
| `GET` | `/api/inventory/view/:inventoryId` | Any role | Get one item |
| `POST` | `/api/inventory/add` | Any role | Create an item: `ingredientName`, `quantity`, `unit`, `category`, `location`, `cost`, `purchaseDate`, `expirationDate` |
| `PUT` | `/api/inventory/update/:inventoryId` | Any role | Update an item that is still in stock |
| `DELETE` | `/api/inventory/delete/:inventoryId` | Any role | Body: `{ "deletionReason": "Consumed" }`, `"Wasted"` or `"PermanentDelete"`. The first two keep the record as history and change its status; the last one deletes it |

`stats` covers in-stock items only: `totalValue`, `totalItems`, `expiringSoonCount` (next 3 days) and `lowStockCount` (quantity below 5). The expiration date must be after the purchase date.

## Socket.IO: read-aloud

The client connects with the same JWT in the handshake:

```js
const socket = io({ auth: { token } });
```

Connections without a valid token are refused with `Authentication required`.

| Event | Sent by | Payload | Acknowledgement |
| --- | --- | --- | --- |
| `recipe:text-to-speech` | Client | `{ recipeId }` | `{ audioUrl }` on success, `{ error }` otherwise |

Only chefs can use it, matching the recipes API. The server reads the recipe's stored instructions, generates an MP3 with Google Cloud Text-to-Speech and replies with its URL under `/audio/`. Files are named by a hash of the voice and text, so repeated requests are served from the cache, and files unused for a day are deleted.

## Client routes

The Angular app uses hash-based routing, so URLs look like `http://localhost:8080/#/recipes`.

| Path | Page | Who can open it |
| --- | --- | --- |
| `/` | Redirects to `/login` | |
| `/register`, `/login` | Registration and login forms | Logged-out users only |
| `/dashboard` | Role-specific dashboard | Any logged-in user |
| `/recipes` | Recipe list (add `?filter=mine` for only your own) | Chefs |
| `/recipes/add` | New recipe form | Chefs |
| `/recipes/view/:recipeId` | Recipe details, translation and read-aloud | Chefs |
| `/recipes/edit/:recipeId` | Edit form | The chef who created the recipe |
| `/recipes/analysis/:recipeId` | AI health analysis | Chefs |
| `/inventory` | Inventory list with stats, filters and sorting | Any logged-in user |
| `/inventory/add` | New item form | Any logged-in user |
| `/inventory/view/:inventoryId` | Item details | Any logged-in user |
| `/inventory/edit/:inventoryId` | Edit form | Any logged-in user |
| `/access-denied` | Shown when your role can't open a page | Any logged-in user |
| Anything else | 404 page | |
