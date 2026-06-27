# Air-Pilote — Backend

NestJS + PostgreSQL API for **Air-Pilote**.

## Stack

- **NestJS** — HTTP framework + module system + global guards/filters
- **TypeScript** — strict
- **PostgreSQL + MikroORM** — Data Mapper + Unit of Work
- **Argon2id** — password hashing (behind `PasswordHasher` port)
- **JWT** — access + rotating refresh tokens with family detection
- **ESLint `no-restricted-imports`** — layer guard (domain → none, application → domain, infrastructure → all)
- **Jest** — unit + integration tests
- **testcontainers** — Postgres integration tests

## Architecture

Hexagonal / DDD per bounded context. Each context follows
`domain` (pure TS, no framework) → `application` (ports + use cases) →
`infrastructure` (NestJS / ORM / JWT / crypto adapters).

Bounded contexts:

- **identity** — registration, login, JWT access + refresh with family detection,
  Argon2id hashing, httpOnly Secure SameSite=Strict refresh cookie.
- **game-records** — score persistence (score + durationMs), per-player history,
  high score.

A shared kernel exposes a `UserExists` query port invoked by the global
`AuthGuard` so protected endpoints reject non-existent users with a clean 401
instead of an FK 500.

## Repo

This is one of three independent git repos in the Air-Pilote workspace:

- `backend/` — this repo (API)
- `frontend/` — React + TS + PixiJS game client
- `openspec/` — SDD planning context (OpenSpec artifacts)

The workspace root is **not** a git repo by design. Each repo deploys and rolls
back independently.

## Quick Start (Docker)

The easiest way to run the backend is with Docker Compose — it spins up PostgreSQL
and the NestJS API together, runs migrations automatically, and exposes port 3000.

### Prerequisites

- Docker + Docker Compose v2

### Run

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

### Environment Variables

All variables have sensible defaults for local development. Override them via a
`.env` file or inline shell exports:

| Variable | Default | Description |
|----------|---------|-------------|
| `PG_HOST` | `postgres` (Docker) / `localhost` (local) | PostgreSQL host |
| `PG_PORT` | `5432` | PostgreSQL port |
| `PG_DB` | `air-pilote` | Database name |
| `PG_USER` | `postgres` | Database user |
| `PG_PASSWORD` | `postgres` | Database password |
| `JWT_ACCESS_SECRET` | dev fallback (warns) | HS256 signing secret for access tokens (≥16 chars) |
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `production` (Docker) | Set `production` for Secure cookies |

### Production JWT Secret

For anything beyond local dev, set a strong `JWT_ACCESS_SECRET`:

```bash
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

Without it the server prints a warning and falls back to an insecure dev secret.

### Volumes

Docker Compose creates a named volume `pg-data` for PostgreSQL persistence. Remove
it with `docker compose down -v` (this **destroys** the database).

## Local Development (no Docker)

```bash
npm install
npm run start:dev
```

Requires a running PostgreSQL instance. Set `PG_HOST`, `PG_USER`, `PG_PASSWORD`
etc. via env or `.env` file. Run migrations manually:

```bash
npx mikro-orm migration:up
```

## Testing

```bash
npm test            # Jest unit tests (in-memory fakes)
npm run test:cov    # with coverage
```

Integration tests use testcontainers (requires Docker daemon):

```bash
npm test            # runs unit + integration suites together
```

## API Endpoints

### Auth (`/auth`)

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/auth/register` | Public | `{ email, password }` | Register + issue tokens |
| POST | `/auth/login` | Public | `{ email, password }` | Login + issue tokens |
| POST | `/auth/refresh` | Cookie | — | Rotate refresh token (httpOnly cookie) |
| POST | `/auth/logout` | Bearer | — | Revoke token family + clear cookies |

### Game Records (`/game-records`)

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/game-records` | Bearer | `{ score, durationMs }` | Persist a completed game session |
| GET | `/game-records/high-score` | Bearer | — | Get player's best score |
| GET | `/game-records` | Bearer | `?limit=10&offset=0` | List player's game history |
