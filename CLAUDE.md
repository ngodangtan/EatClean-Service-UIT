# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eat Clean API — a Node.js/Express REST API for health-focused meal planning. Features JWT authentication, MongoDB persistence via Mongoose, and AI-powered meal plan generation through LM Studio (local LLM).

## Commands

```bash
npm run dev    # Start dev server with nodemon (port 4000)
npm start      # Start production server
npm install    # Install dependencies
```

No test framework is configured. No linter is configured.

## Architecture

**Pattern:** Controller → Route → Model (standard Express MVC without views)

**Entry point:** `src/index.js` — configures middleware stack (helmet, cors, morgan, rate-limiter, JSON parser), connects to MongoDB, mounts routes under `/api`, serves Swagger docs at `/api/docs`.

**Key directories:**
- `src/controllers/` — business logic per domain (auth, health, mealplan, recipe)
- `src/models/` — Mongoose schemas (User, HealthProfile, MealPlan, Recipe)
- `src/routes/` — Express routers; `index.js` aggregates all route modules
- `src/middleware/auth.js` — JWT Bearer token verification (`requireAuth`)
- `src/config/` — MongoDB connection (`db.js`) and Swagger setup (`swagger.js`)

**Data flow:** User → HealthProfile → MealPlan (AI-generated). Recipes are independent.

## Key Technical Details

- **ES Modules** — uses `import/export` (`"type": "module"` in package.json)
- **Auth** — JWT tokens (7-day expiry), bcrypt password hashing, role-based (user/admin)
- **AI meal plan generation** — `mealplan.controller.js` sends health profile data to LM Studio (`LM_STUDIO_URL` env var, default `localhost:1234`) and parses JSON from LLM response
- **Database** — MongoDB via Mongoose 8.x with `strictQuery: true`; schemas use timestamps and cross-collection references
- **Rate limiting** — 100 requests/minute on `/api` routes

## Environment Variables

Required in `.env` (see `.env.example`):
- `PORT` — server port (default 4000)
- `MONGODB_URI` — MongoDB connection string (Atlas or local)
- `JWT_SECRET` — secret for signing JWT tokens
- `LM_STUDIO_URL` — LM Studio chat completions endpoint

## API Routes

All routes prefixed with `/api`:
- `/api/auth` — register, login, logout, profile, delete user
- `/api/health-profile` — CRUD for user health questionnaire (one per user)
- `/api/meal-plans` — AI generation (`POST /generate`), list with pagination, delete
- `/api/recipes` — public read, authenticated write
- `/health` — health check endpoint (no `/api` prefix)

## Git Workflow

- Main branch: `master`
- Development branch: `develop`
