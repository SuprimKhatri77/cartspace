# cartspace

a fullstack ecommerce project built with go/gin and next.js.

## what's inside

```text
apps/
  backend/   → go/gin rest api
  web/        → next.js frontend

packages/
  openapi/   → openapi spec generation and route definitions
  types/     → shared types used across openapi and web
```

## stack

**backend**

- go + gin
- postgresql with pgx
- sqlc for query generation
- golang-migrate for migrations
- jwt auth (access + refresh token rotation)
- scalar ui for api docs

**frontend**

- next.js 15 app router
- typescript

**infra**

- turborepo
- docker compose for local postgres
- bun as package manager

## getting started

**prerequisites** — go, bun, docker

# install dependencies

bun install

# start the database

cd apps/backend && docker compose up -d

# run migrations

make migrate-up

# start backend + frontend

turbo dev

# or if turbo is not installed globally

bun dev

```

api docs available at `http://localhost:5000/docs` once the backend is running.

## status

- [x] auth — register, login, logout, refresh token
- [x] handler tests
- [ ] categories + subcategories crud
- [ ] products + variants crud
- [ ] orders
- [ ] checkout with stripe
```
