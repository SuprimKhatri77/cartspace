# cartspace

a fullstack ecommerce project built with go/gin and next.js.

## what's inside

```text
apps/
  api/       → go/gin rest api
  web/       → next.js frontend

packages/
  openapi/   → openapi spec generation (outputs apps/api/openapi.json)
  types/     → shared zod schemas + types used across openapi and web
  ui/, eslint-config/, typescript-config/
```

## stack

**api**

- go + gin
- postgresql with pgx
- sqlc for query generation
- golang-migrate for migrations
- jwt auth in http-only cookies (access + refresh token rotation)
- cloudinary for images
- scalar ui for api docs

**web**

- next.js app router
- typescript

**infra**

- turborepo + bun workspaces
- docker compose for local dev (api with hot reload, web, postgres)
- husky + commitlint + lint-staged, golangci-lint, github actions ci

## getting started

**prerequisites**: go, bun, docker, plus [golang-migrate](https://github.com/golang-migrate/migrate), [sqlc](https://sqlc.dev) and [golangci-lint](https://golangci-lint.run) for local work

```sh
bun install
cp .env.example .env.local   # then fill in secrets
```

all apps read the single root `.env.local`.

### run with docker (recommended)

```sh
bun run docker:dev:up     # api :5000, web :3000, postgres :5432
bun run docker:dev:down
```

migrations run automatically when the api container starts.

### run locally

set `DATABASE_URL` in `.env.local` to use `localhost` instead of `db`, then:

```sh
bun run db:migrate   # apply migrations
bun run dev          # api + web via turbo
```

api docs are available at `http://localhost:5000/docs` once the api is running.

## scripts

| script                                 | what it does                                                  |
| -------------------------------------- | ------------------------------------------------------------- |
| `bun run dev`                          | run api + web                                                 |
| `bun run db:migrate` / `db:migrate:down` | apply / roll back migrations (`N=1` for down)               |
| `bun run db:sqlc`                      | regenerate sqlc code                                          |
| `bun run db:seed`                      | create the seed admin + customer (see `.env.example`)         |
| `bun run generate`                     | regenerate openapi.json                                       |
| `bun run lint` / `lint:go`             | lint js/ts / go                                               |
| `bun run test:go`                      | go tests                                                      |
| `bun run ci`                           | everything ci runs (sqlc drift, types, lint, tests, build)    |

## contributing

- branch off `main` (`feat/...`, `fix/...`, `chore/...`) and open a pr
- commits follow [conventional commits](https://www.conventionalcommits.org), enforced by commitlint
- pre-commit formats staged files and regenerates sqlc code when queries or migrations change; pre-push runs typecheck, go lint, go tests and build

## status

- [x] auth: register, login, logout, refresh token
- [x] categories + subcategories crud
- [x] products + variants crud
- [x] cart
- [ ] orders
- [ ] checkout with stripe
- [ ] web app
