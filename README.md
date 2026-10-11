# cartspace

a full-stack e-commerce store: a go/gin api and a next.js storefront with an admin panel, stripe checkout, reviews, wishlists and search, held together by one typed api contract.

![landing page](docs/screenshots/home.jpg)

| product page                                   | bag                                    |
| ---------------------------------------------- | -------------------------------------- |
| ![product page](docs/screenshots/product.jpg)  | ![bag drawer](docs/screenshots/bag.jpg) |

| admin dashboard                                    | admin order                                      |
| -------------------------------------------------- | ------------------------------------------------ |
| ![admin dashboard](docs/screenshots/admin.jpg)     | ![admin order](docs/screenshots/admin-order.jpg) |

## features

**storefront**

- landing page, `/shop` and category pages with filters (price, size, colour…), sorting and infinite scroll, all kept in the url
- full-text product search (⌘K dialog with live results, and `/shop?q=`)
- product pages with a gallery, colour swatches and size pills (sold-out variants struck through, `?variant=` links), offers with expiry
- a bag drawer and `/cart` with live prices and quantities capped to stock
- stripe hosted checkout with saved addresses, stock reserved while you pay, flat-rate shipping that's free over a threshold
- order history with a status timeline, tracking number and refund date
- wishlist, and reviews from verified buyers (a rating summary with a distribution, one review per product)
- three light themes (editorial, studio, botanical), chosen in the admin with live previews, plus a demo-only theme picker for showing the store to clients

**admin** (`/admin`, admin role only)

- dashboard: revenue chart, order counts, average order value, low stock, recent orders
- products: table with search and filters, an editor with direct-to-cloudinary image uploads (drop files in, reorder, remove), variants, stock and offers
- categories: a tree editor (add, rename, move under another parent, delete)
- orders: status tabs and search; ship (with tracking), deliver, cancel and refund through stripe, with optional restock
- reviews: publish or hide, which updates the product's rating
- settings: the store's theme, with a live preview of each

## stack

| layer        | what                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| api          | go 1.24, gin, postgres 17 with pgx, sqlc, golang-migrate, stripe-go, cloudinary, scalar api docs          |
| web          | next.js 16 (app router, `proxy.ts`), react 19, tanstack query 5, tailwind v4, shadcn (base ui), motion    |
| contract     | zod schemas → openapi 3.1 (zod-to-openapi) → typed clients (hey-api), checked both ways in ci              |
| tooling      | turborepo + bun workspaces, docker compose, husky + commitlint + lint-staged, golangci-lint, github actions |

## architecture

```text
apps/
  api/                   go/gin rest api
    cmd/server, cmd/seed   entrypoints (the server, the seed admin + customer)
    migrations/            golang-migrate sql, also the sqlc schema
    internal/
      app/                 wiring, background cleanup
      routes/              one file per area + the contract test
      handlers/            http handlers per area
      checkout/            checkout, webhooks, fulfilment (the order state machine)
      auth/                sessions, refresh rotation, jwt
      database/            sqlc queries (queries/*.sql) and the generated go
      repository/          repositories over the generated queries (cart, variants…)
      pkg/                 payments (stripe), cloudinary, httpx, rlog
      middleware/, validator/, constants/, types/
  web/                   next.js storefront + admin
    app/                   routes: (shop), account, auth, admin
    modules/               feature code: catalog, cart, checkout, reviews, wishlist, search, admin…
    lib/                   api clients, proxy (auth guards), image loader, money
    components/ui/         shadcn components
packages/
  types/                 zod schemas, the single source of truth for request/response shapes
  openapi/               endpoint definitions → apps/api/openapi.json
  api-client/            generated browser + server clients
  eslint-config/, typescript-config/
scripts/                 drift checks, demo catalog seeder
```

### requests and auth

```mermaid
flowchart LR
  browser -- "client components<br/>(NEXT_PUBLIC_API_URL, cookies)" --> api
  browser --> next[next.js server]
  next -- "server components, proxy.ts<br/>(INTERNAL_API_URL, forwarded cookies)" --> api
  api --> postgres[(postgres)]
  api --> stripe
  stripe -- webhooks --> api
  browser -- signed upload --> cloudinary
```

- **sessions**: login sets two http-only cookies, a 15-minute access jwt and a refresh token tied to a row in `sessions`. refresh rotates the token with a compare-and-swap; a request that lost a concurrent refresh gets a 30-second grace window instead of a logout. sessions slide for 30 days and end after 90 at most. logout revokes the row, and a background job deletes expired sessions hourly.
- **roles**: `customer` and `admin`, checked by `RequireAuth` / `RequireRole` middleware. the web's `proxy.ts` guards `/account`, `/cart`, `/checkout` and `/admin` and refreshes an expired access token before the page renders; in the browser, an axios interceptor queues requests while one refresh runs.
- **responses**: every response is `{ success, message?, code?, data?, meta?, errors? }`: `meta` carries pagination, `errors` carries per-field validation errors, and `code` is a stable error code (`INSUFFICIENT_STOCK`, `INVALID_ORDER_TRANSITION`…) shared by go and typescript.

### the api contract

request and response shapes are written once, as zod schemas in `packages/types`. from there:

1. `packages/openapi` registers each endpoint (`src/paths/*.ts`) and writes `apps/api/openapi.json`, which the api serves at `/docs` (scalar) and `/openapi.json`.
2. `packages/api-client` generates a typed sdk from that spec: one for the browser, one for server components.
3. the web imports the zod types and the sdk, so a renamed field is a type error.

two checks keep the sides honest:

- `bun run generate:check` fails when the committed spec or clients are out of date.
- `internal/routes/contract_test.go` compares the spec with the gin router: every route is documented, every documented route exists, and every error code and status the spec mentions is one the go code knows.

to add an endpoint: write its schemas in `packages/types`, the path in `packages/openapi/src/paths`, run `bun run generate`, then add the handler, the route (and its entry in `routes/setup_test.go`) and any new error code in both `internal/constants` and `packages/types/src/api/error-codes.ts`.

sql works the same way: queries live in `apps/api/internal/database/queries/*.sql`, `bun run db:sqlc` generates go from them using the migrations as the schema, and `bun run db:sqlc:check` fails on drift.

### checkout and orders

```mermaid
sequenceDiagram
  participant web
  participant api
  participant db as postgres
  participant stripe
  web->>api: POST /checkout (address)
  api->>db: lock variants, check and reserve stock, create a pending order
  api->>stripe: create a checkout session from our own prices
  api-->>web: stripe url
  web->>stripe: pay
  stripe->>api: checkout.session.completed (signed webhook)
  api->>db: mark paid, record the payment, clear the bag (once per event)
  web->>api: poll the order on /checkout/success
```

- stock is reserved when checkout starts, so a paid order can never oversell. an unpaid page expires after about 30 minutes; stripe's `checkout.session.expired` cancels the order and returns the stock, and a sweep in the api (every 5 minutes and before each checkout) catches any expiry whose webhook never arrived.
- webhooks are signature-checked, recorded in `stripe_events` so a retry is a no-op, and applied in a transaction. an order paid after its reservation was released takes back what stock it can and records the shortfall.
- orders move through one tested transition table (`internal/checkout/fulfilment.go`): `pending → paid → shipped → delivered`, `pending → cancelled`, and `paid | shipped | delivered → refunded`. every transition locks the order row. a refund is a full stripe refund with an idempotency key per order, so retrying can't refund twice. restocks return only what the order actually took.
- prices are in cents everywhere. an offer applies while `offer_price` is set and `offer_expires_at` is empty or in the future, and one sql expression decides it for listings, sorting, the cart and checkout. shipping is a flat rate, free from a threshold (`internal/constants/shipping.go`).

### caching

- public catalog pages render on the server through the next data cache (tag `catalog`: categories for 5 minutes, listings and products for 1 minute). admin writes call a server action that checks the role and busts the tag, so changes show at once.
- listings prefetch their first page on the server and hand it to tanstack query (`HydrationBoundary`); filters update the url with `history.pushState` and fetch on the client.
- every list is paginated: infinite scroll in the storefront, page numbers in the admin. there's no redis yet.

## getting started

**prerequisites**: [bun](https://bun.sh) 1.3, [go](https://go.dev) 1.24, docker. for work outside docker also [golang-migrate](https://github.com/golang-migrate/migrate), [sqlc](https://sqlc.dev) 1.30 and [golangci-lint](https://golangci-lint.run) v2. for payments, the [stripe cli](https://docs.stripe.com/stripe-cli).

```sh
bun install
cp .env.example .env.local
```

every app reads the single root `.env.local`. fill in at least:

- `POSTGRES_USER`, `POSTGRES_PASSWORD` and a matching `DATABASE_URL`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (`openssl rand -hex 32`)
- `CLOUDINARY_*` for image uploads in the admin
- `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD`

wrap any value containing `$` in single quotes, or docker compose will try to expand it.

### run with docker (recommended)

```sh
bun run docker:dev:up                         # api :5000 (hot reload), web :3000, postgres :5432
docker exec cartspace-api go run ./cmd/seed   # the seed admin + customer
bun run db:seed:catalog                       # ~30 demo products through the api
```

migrations run when the api container starts. open http://localhost:3000, sign in as the seed admin and visit `/admin`. api docs are at http://localhost:5000/docs.

to start over with an empty database (for example after migrations were rewritten): `bun run docker:dev:reset`, then seed again.

### run without docker

point `DATABASE_URL` at `localhost` instead of `db` and `INTERNAL_API_URL` at `http://localhost:5000`, then:

```sh
bun run db:migrate
bun run db:seed
bun run dev          # api + web through turbo
```

### stripe (test mode)

1. put your test secret key (`sk_test_…`) in `STRIPE_SECRET_KEY`. without it the api still runs and `POST /checkout` answers 503.
2. forward webhooks to the local api and copy the signing secret it prints into `STRIPE_WEBHOOK_SECRET_LOCAL`:

   ```sh
   stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
   ```

3. restart the api, check out, and pay with `4242 4242 4242 4242`, any future date and any cvc.

the success and cancel pages are built from `FRONTEND_URL`. in production, create a dashboard webhook endpoint for `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`, and put its secret in `STRIPE_WEBHOOK_SECRET`.

### cloudinary

the admin uploads images straight from the browser with a signature from `POST /admin/uploads/signature`, into the `cartspace/products` folder on your cloud. the api only accepts image urls from that folder, and deleting a product deletes its images unless a past order still shows them. the demo catalog uses cloudinary's public `demo` cloud, so it works without uploading anything.

### themes

the store ships three light themes: **editorial** (warm paper, a light serif, square corners; the default), **studio** (crisp white, bold sans-serif, soft corners) and **botanical** (cream and forest green, a soft serif, rounded shapes).

- the store owner picks the theme in **admin → settings**. each option shows a live preview in its own theme, and choosing one previews it across the admin before saving. saving applies it to every page at once: the setting is cached in next's data cache, and the cache is expired on save.
- `STORE_THEME` is the fallback while the api can't be reached (default: editorial).
- `DEMO_THEME_PICKER=true` adds a floating picker in the bottom-right corner for demos. A visitor's pick is kept in a cookie and applied on the server, so pages never flash the wrong theme. Leave it off for a real store.

a theme is a `[data-theme="…"]` block of tokens in `apps/web/app/globals.css`: colours, the headline font and its style, and four corner radii (`rounded-control`, `rounded-field`, `rounded-panel`, `rounded-media`). to add a theme:

1. add that block to `globals.css`
2. add an entry to `THEMES` in `apps/web/lib/themes.ts`, its id to `StoreThemeSchema` in `packages/types/src/settings` (then `bun run generate`), and to `StoreThemes` and the `oneof` in `apps/api/internal/types/settings.go`
3. load a new font in `app/layout.tsx` with `preload: false`, if the theme needs one

## scripts

| script                                     | what it does                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `bun run dev`                              | api + web                                                                         |
| `bun run build`                            | build everything                                                                  |
| `bun run docker:dev:up` / `docker:dev:down` | start / stop the docker stack                                                     |
| `bun run docker:dev:reset`                 | delete the database volume and start the stack again                              |
| `bun run db:migrate` / `db:migrate:down`   | apply / roll back migrations (`N=1` for down)                                     |
| `bun run db:sqlc`                          | regenerate the go query code                                                      |
| `bun run db:seed`                          | create the seed admin and customer (`SEED_*` in `.env.local`)                     |
| `bun run db:seed:catalog`                  | add demo categories and products through the running api as the seed admin       |
| `bun run generate`                         | regenerate `openapi.json` and the api clients                                     |
| `bun run generate:check` / `db:sqlc:check` | fail if generated code is out of date                                             |
| `bun run check-types`                      | typecheck every package                                                           |
| `bun run lint` / `lint:go`                 | eslint / golangci-lint                                                            |
| `bun run test:go` / `test:web`             | go tests / web tests (bun test)                                                   |
| `bun run format`                           | prettier                                                                          |
| `bun run ci`                               | everything ci runs: drift checks, types, lint, tests, build                      |

## testing and ci

- **go**: unit and handler tests, including the order transition table, session rotation, validators, middleware and the contract test (`bun run test:go`).
- **web**: bun tests for the proxy guards, the refresh interceptor, filter and url parsing, the image loader, cart and order helpers (`bun run test:web`).
- **ci** (github actions, `.github/workflows/ci.yml`) runs the same steps as `bun run ci` on every pull request and on `main`. dependabot keeps the bun, go and actions dependencies current.

## contributing

- branch off `main` (`feat/…`, `fix/…`, `docs/…`, `chore/…`) and open a pull request
- commits follow [conventional commits](https://www.conventionalcommits.org), enforced by commitlint
- pre-commit formats staged files and regenerates sqlc code when queries or migrations change; pre-push runs the typecheck, go lint, the tests and the build

## not built yet

- guest carts (the bag needs an account)
- partial refunds and returns
- order emails
- redis or a job queue (expired checkouts and sessions are cleaned up by loops inside the api process)
