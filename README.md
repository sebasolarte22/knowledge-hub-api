# Knowledge Hub API

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS_S3-Storage-FF9900?style=for-the-badge&logo=amazons3&logoColor=white" />
  <img src="https://img.shields.io/badge/BullMQ-Queues-FF6B35?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Jest-26_tests-C21325?style=for-the-badge&logo=jest&logoColor=white" />
  <img src="https://img.shields.io/badge/Swagger-Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" />
  <img src="https://img.shields.io/badge/Deployed-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" />
</p>

<p align="center">
  Production-grade <strong>event-driven REST API</strong> for managing developer knowledge resources, built with NestJS, PostgreSQL, Redis, BullMQ and AWS S3.
</p>

<p align="center">
  <a href="https://knowledge-hub-api-kuy2.onrender.com/docs" target="_blank"><strong>→ Live API Docs (Swagger)</strong></a>
</p>

---

## Overview

Developers constantly save resources — docs, tutorials, articles, tools — scattered across bookmarks, notes and browser tabs.

**Knowledge Hub** is a backend system where developers can organize, search and access their technical resources in one place:

- Store and categorize technical resources
- Full-text search with pagination
- Mark favorites
- Upload files directly to S3 (or via presigned URL)
- Secure multi-session authentication

---

## Architecture

```
knowledge-hub-api/
└── api/
    ├── src/
    │   ├── auth/           JWT auth, guards, strategies, session management
    │   ├── resources/      CRUD + search + pagination + S3 upload
    │   ├── categories/     Category management with full CRUD
    │   ├── favorites/      Paginated favorites list
    │   ├── users/          User profile management
    │   ├── storage/        AWS S3 integration + presigned URLs
    │   ├── queues/         BullMQ job queues (email, events)
    │   ├── events/         Domain event publishing
    │   ├── redis/          Redis service with versioned cache
    │   ├── logger/         Winston structured logging
    │   ├── prisma/         Database service
    │   └── common/         Filters, interceptors, decorators, cleanup
    └── prisma/
        └── schema.prisma
```

### Event-Driven Flow

```
Client → API → PostgreSQL
               ↓
            EventBus (Redis)
               ↓
            Worker (BullMQ)
               ↓
         EmailJob / BackgroundTask
```

```mermaid
sequenceDiagram
  Client->>API: Register
  API->>PostgreSQL: Create user
  API->>EventBus: USER_CREATED
  EventBus->>Worker: Consume event
  Worker->>EmailJob: Send welcome email
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11, TypeScript 5 (strict) |
| Database | PostgreSQL 16 + Prisma ORM 6 |
| Cache | Redis + ioredis (versioned cache-aside) |
| Queues | BullMQ with retries + dead letter queue |
| Auth | JWT (access + refresh), Passport.js, bcrypt |
| Storage | AWS S3 + presigned URLs |
| Logging | Winston structured logs |
| Validation | class-validator + class-transformer + Joi |
| Security | Helmet, rate limiting, input sanitization |
| Docs | Swagger / OpenAPI |
| Testing | Jest 30 (unit) + Supertest (e2e) |
| Deploy | Render |

---

## Security

This API implements production-grade security across every layer.

### Authentication
| Feature | Implementation |
|---|---|
| Access tokens | Short-lived JWT signed with `JWT_ACCESS_SECRET` |
| Refresh tokens | Long-lived (7 days), stored hashed (SHA-256) in DB |
| Token rotation | Each refresh issues a new token and revokes the old one |
| Reuse detection | Family-based tracking — reuse revokes the entire token family |
| Token blacklist | Logged-out access tokens stored in Redis until expiry |
| Session tracking | IP address, device, `expiresAt`, `lastUsedAt` per session |
| Session expiry | Sessions auto-expire after 7 days, cleaned by nightly cron |
| Logout all | Revokes all active sessions across all devices |

### API Security
| Feature | Detail |
|---|---|
| Helmet | Security headers: HSTS, XSS protection, clickjacking prevention, CSP |
| Body size limit | Requests capped at 10kb to prevent payload attacks |
| Rate limiting | `RateLimitGuard` on login, register and refresh endpoints |
| Global throttle | `ThrottlerGuard` — 5 req/min per IP (1000 in test env) |
| CSRF protection | `csurf` middleware enabled in production |
| Input sanitization | `@Sanitize()` decorator strips all HTML/scripts from free-text fields |
| Password policy | Min 8 chars, uppercase, number and special character required |
| User enumeration | Register returns generic error regardless of whether email exists |
| Log sanitization | Only email domain logged, never the full address (PII protection) |
| Env validation | Joi schema validates all required env vars at bootstrap — fails fast |
| Strict TypeScript | `noImplicitAny: true` + `strictBindCallApply: true` — zero implicit `any` |

### Auth Flow

```mermaid
sequenceDiagram
  Client->>API: POST /auth/login
  API->>DB: Validate credentials
  API->>Client: accessToken + refreshToken (httpOnly cookie)

  Client->>API: Protected request (Bearer token)
  API->>Redis: Check blacklist
  API->>Client: 200 Response

  Client->>API: POST /auth/refresh (cookie)
  API->>DB: Rotate refresh token
  API->>Client: New accessToken + new cookie

  Client->>API: POST /auth/logout
  API->>Redis: Blacklist access token
  API->>DB: Revoke refresh token
  API->>Client: Clear cookie
```

---

## API Reference

Base URL: `https://knowledge-hub-api-kuy2.onrender.com`

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Login, returns JWT |
| `POST` | `/auth/refresh` | Cookie | Rotate refresh token |
| `POST` | `/auth/logout` | Bearer | Revoke session |
| `POST` | `/auth/logout-all` | Bearer | Revoke all sessions |
| `GET` | `/auth/sessions` | Bearer | List active sessions |

### Resources

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/resources` | Create resource |
| `GET` | `/resources` | List with pagination + search + filter |
| `GET` | `/resources/:id` | Get by ID |
| `PATCH` | `/resources/:id` | Update (owner or admin) |
| `DELETE` | `/resources/:id` | Delete (owner or admin) |
| `POST` | `/resources/upload` | Upload file via backend |
| `POST` | `/resources/upload-url` | Generate S3 presigned URL |

**Query params for `GET /resources`:**
```
page=1&limit=10&search=nestjs&categoryId=3
```

### Categories

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/categories` | Create category |
| `GET` | `/categories` | List with pagination |
| `PATCH` | `/categories/:id` | Update category |
| `DELETE` | `/categories/:id` | Delete category |

### Favorites

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/favorites/:resourceId` | Add to favorites |
| `DELETE` | `/favorites/:resourceId` | Remove from favorites |
| `GET` | `/favorites` | List favorites with pagination |

All endpoints except register/login require `Authorization: Bearer <token>`.

Paginated responses follow this structure:
```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "lastPage": 5
  }
}
```

---

## Caching Strategy

Resources use a **versioned cache-aside pattern** in Redis:

```
1. Compute version key: cache:version:resources:{userId}
2. Build cache key:     resources:v{version}:{userId}:{page}:{limit}:{search}:{category}
3. Cache hit  → return JSON directly
4. Cache miss → query DB → store in Redis (TTL 60s)
5. On mutation → increment version (auto-invalidates all pages)
```

This avoids scanning or deleting individual keys — a version increment makes all old keys stale instantly.

---

## Environment Variables

```env
# App
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m

# Redis (optional — caching and rate limiting degrade gracefully)
REDIS_URL=redis://localhost:6379

# AWS S3 (optional — required for file uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
```

All required variables are validated at startup via Joi. The app **will not start** if any required variable is missing.

---

## Running Locally

**Prerequisites:** Docker, Node.js 22

```bash
# Clone
git clone https://github.com/sebasolarte22/knowledge-hub-api.git
cd knowledge-hub-api/api

# Install
npm install

# Start infrastructure
docker compose up -d

# Database setup
npx prisma migrate dev

# Start dev server
npm run start:dev
```

API will be available at `http://localhost:4000`
Swagger docs at `http://localhost:4000/docs`

---

## Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires .env.test)
npm run test:e2e
```

**Current coverage:**

| Suite | Tests | Coverage |
|---|---|---|
| AuthService | 12 tests | register, login, refresh, logout (happy path + edge cases) |
| AuthController | 10 tests | all endpoints including cookie handling |
| Other suites | 4 tests | service definitions |
| **Total** | **26 tests** | — |

**E2E test suites:**
- `auth.e2e-spec` — full login/register flow
- `auth.refresh.e2e-spec` — token rotation
- `auth.blacklist.e2e-spec` — token invalidation after logout
- `logout-all.e2e-spec` — multi-session revocation
- `resources.e2e-spec` — resource CRUD
- `users.e2e-spec` — user endpoints

---

## Job Queue & Dead Letter Queue

Failed background jobs follow this flow:

```
Job fails
  ↓
Retry with exponential backoff (3 attempts)
  ↓
Move to Dead Letter Queue (DLQ)
  ↓
Manual inspection / alerting
```

Current event types:
```
USER_CREATED  → welcome email
```

---

## Deployment

The API is deployed on **Render**.

| | |
|---|---|
| Live API | `https://knowledge-hub-api-kuy2.onrender.com` |
| Swagger Docs | `https://knowledge-hub-api-kuy2.onrender.com/docs` |
| Build command | `npm install && npx prisma generate && npm run build` |
| Start command | `node dist/main.js` |

---

## What This Project Demonstrates

This is a **production-style backend** built to showcase real engineering practices:

- Modular NestJS architecture with clear separation of concerns
- Event-driven design with Redis + BullMQ
- Enterprise auth: JWT rotation, token families, blacklisting, session expiry
- Multi-layer security: Helmet, rate limiting, CSRF, input sanitization, PII protection
- Versioned Redis cache-aside pattern
- Strict TypeScript — zero implicit `any` across the entire codebase
- Unit tests covering happy paths, edge cases and security scenarios
- E2E tests with real database isolation
- Joi-based environment validation — fast failure on misconfiguration
- Clean deployment pipeline on Render

---

## Author

**Sebastian Olarte** — Backend Developer
