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
