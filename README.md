# 🩸 Blood Donation Platform Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-indigo?logo=prisma)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-Cloud-red?logo=redis)](https://redis.io/)
[![Biome](https://img.shields.io/badge/Biome-Linter%20%26%20Formatter-orange?logo=biome)](https://biomejs.dev/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0%20Swagger-green?logo=swagger)](https://swagger.io/)

A production-ready, mission-critical backend engine designed to connect blood donors with patients in urgent need. Built with a domain-driven, feature-sliced modular architecture in strict TypeScript, featuring medical cooldown tracking, privacy-preserving emergency feeds, administrative verification gates, and mutual contact disclosure.

---

## 📑 Table of Contents

- [Architectural Highlights](#-architectural-highlights)
- [Technology Stack](#-technology-stack)
- [System Architecture & Module Layout](#-system-architecture--module-layout)
- [Complete API Reference](#-complete-api-reference)
  - [System & Health](#system--health)
  - [Module 1: Authentication (`/api/v1/auth`)](#module-1-authentication-apiv1auth)
  - [Module 2: User & Profile Management (`/api/v1/users`)](#module-2-user--profile-management-apiv1users)
  - [Module 3: Blood Donation Requests (`/api/v1/requests`)](#module-3-blood-donation-requests-apiv1requests)
  - [Module 4: Donor Response Matching (`/api/v1/requests/:id/responses`)](#module-4-donor-response-matching-apiv1requestsidresponses)
- [Local Development Setup](#-local-development-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Database Initialization](#3-database-initialization)
  - [4. Start Development Server](#4-start-development-server)
  - [5. Quality & Verification Scripts](#5-quality--verification-scripts)
- [Interactive API Documentation (Swagger)](#-interactive-api-documentation-swagger)
- [Cloud Deployment (Render Guide)](#-cloud-deployment-render-guide)
  - [Service Settings](#service-settings)
  - [Environment Variables Checklist](#environment-variables-checklist)
- [Security & Core Invariants](#-security--core-invariants)

---

## 🌟 Architectural Highlights

1. **Two-Step Registration with Redis Staging**:
   - User registrations are temporarily staged in Redis with a 6-digit cryptographic OTP (15-minute TTL). Zero database clutter for unverified accounts.
2. **Medical Safety & 90-Day Donation Cooldown Engine**:
   - Strict 90-day recovery cooldown enforced before donors can respond to new blood requests.
   - Dynamic calculation of days remaining and donor eligibility metrics on user profile queries.
3. **Public Emergency Feed with Privacy Safeguards**:
   - Public feeds display active emergencies without exposing requester contact numbers.
   - Requester phone numbers are unlocked **only** when an eligible donor submits a verified response.
4. **Administrative Verification Gate**:
   - Blood requests enter `PENDING_APPROVAL` status upon submission.
   - Super admins verify patient documentation and urgency before promoting requests to `ACTIVE`.
5. **Standardized Querying & Pagination**:
   - Centralized query builder (`buildPrismaQuery` and `calculatePaginationMeta`) providing consistent search, filtering, and pagination envelopes across all collection endpoints.
6. **Graceful Shutdown & Cloud-Hardened**:
   - Dual-signal (`SIGTERM`, `SIGINT`) lifecycle handling that closes active HTTP listeners and cleanly drains database and Redis connection pools.
   - Reverse proxy trust configuration (`trust proxy: 1`) preventing IP-lockout behind cloud load balancers.

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js 20+ (ESM) | High-performance asynchronous execution engine |
| **Language** | TypeScript 5.7+ (Strict) | Compile-time type safety across database and HTTP layers |
| **Framework** | Express 4.21+ | Robust HTTP routing and middleware pipeline |
| **Database** | PostgreSQL | Relational storage with strict schema constraints |
| **ORM** | Prisma 7 (`@prisma/adapter-pg`) | Multi-file Prisma schemas with native connection pooling |
| **Caching / Staging** | Redis Cloud | In-memory OTP staging, token revocation, rate limiting |
| **Validation** | Zod | Runtime validation for env, requests, queries, and responses |
| **Documentation** | `@asteasolutions/zod-to-openapi` + Swagger UI | Auto-generated OpenAPI 3.0 specification |
| **Code Quality** | Biome 1.9+ | High-speed linting and formatting (4-space indentation) |
| **Build Bundler** | `tsup` (esbuild) | High-speed ESM bundling for production |

---

## 📂 System Architecture & Module Layout

The codebase strictly adheres to a **Domain-Driven Feature-Sliced Modular Architecture**:

```
blood_donation_backend/
├── prisma/
│   ├── models/                # Multi-file Prisma domain models
│   │   ├── user.prisma
│   │   ├── profile.prisma
│   │   ├── blood_request.prisma
│   │   └── donation_response.prisma
│   ├── enums.prisma           # Shared database enums (Role, BloodGroup, Status)
│   ├── migrations/            # Version-controlled SQL migrations
│   └── schema.prisma          # Prisma client and generator definition
├── src/
│   ├── config/                # Environment variables and Redis clients
│   │   ├── env.ts             # Fail-fast Zod environment validation
│   │   └── redis.ts           # Singleton Redis client with exponential backoff
│   ├── docs/                  # OpenAPI registry and Swagger route setup
│   ├── errors/                # Centralized AppError and exception wrappers
│   ├── middlewares/           # Authentication, RBAC, Rate Limiting, Validation
│   ├── modules/               # Domain-Driven feature modules
│   │   ├── auth/              # Registration, OTP verification, Login, Token Refresh
│   │   ├── users/             # Profile completion, Metrics, Availability toggle
│   │   ├── requests/          # Request CRUD, Admin approval/rejection, Fulfillment
│   │   └── responses/         # Strict matching engine, Responded donor list
│   ├── services/              # Cross-module infrastructure services (Email, Nodemailer)
│   ├── templates/emails/      # EJS email templates for OTP verification
│   ├── utils/                 # Prisma connection pool, QueryBuilder, JWT, Admin seeder
│   ├── app.ts                 # Express application setup, security middlewares, routes
│   └── server.ts              # Server bootstrap and graceful shutdown listeners
├── tsup.config.ts             # Production build configuration
├── biome.json                 # Linter and formatter rules
└── package.json
```

---

## 📡 Complete API Reference

Base URL: `http://localhost:5000` (or your deployed cloud domain)  
All responses follow a standardized JSON envelope:
```json
{
    "success": true,
    "statusCode": 200,
    "message": "Operation completed successfully",
    "data": { ... }
}
```

### System & Health

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Liveness probe returning process uptime, environment, and Redis connectivity |
| `GET` | `/api/v1` | Public | Root API discovery endpoint |
| `GET` | `/api-docs` | Public | Interactive Swagger UI documentation explorer |
| `GET` | `/api-docs/json` | Public | Raw OpenAPI 3.0 specification in JSON format |

---

### Module 1: Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Validates email & password, stages credentials in Redis, and dispatches OTP |
| `POST` | `/api/v1/auth/verify-otp` | Public | Verifies 6-digit OTP, creates verified user in PostgreSQL, returns JWTs |
| `POST` | `/api/v1/auth/resend-otp` | Public | Generates and sends a new OTP for staged registration |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials, sets `refreshToken` cookie, returns `accessToken` |
| `POST` | `/api/v1/auth/refresh-token` | Public | Rotates JWT tokens using cookie or request body `refreshToken` |

---

### Module 2: User & Profile Management (`/api/v1/users`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/users/complete-profile` | `USER` | Step 2 profile setup (phone, blood group, district, area, last donation date) |
| `GET` | `/api/v1/users/me` | `USER` | Retrieves authenticated user profile, donation metrics, and eligibility status |
| `PATCH` | `/api/v1/users/availability` | `USER` | Toggles donor availability state (`isAvailableForDonation`) |

---

### Module 3: Blood Donation Requests (`/api/v1/requests`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/requests` | `USER` (Profile Complete) | Submits blood request into `PENDING_APPROVAL` status |
| `GET` | `/api/v1/requests` | Public / `USER` | Paginated public feed of `ACTIVE` requests (requester phone hidden) |
| `GET` | `/api/v1/requests/pending` | `ADMIN` | Admin review queue of requests awaiting verification |
| `GET` | `/api/v1/requests/:id` | Public / `USER` | Detailed view of single request (phone revealed to owner, admin, or donor) |
| `PATCH` | `/api/v1/requests/:id/approve` | `ADMIN` | Verification gate: transitions request from `PENDING_APPROVAL` to `ACTIVE` |
| `PATCH` | `/api/v1/requests/:id/reject` | `ADMIN` | Rejection gate: transitions request to `REJECTED` with mandatory reason |
| `PATCH` | `/api/v1/requests/:id/fulfill` | Requester / `ADMIN` | Completion gate: transitions request from `ACTIVE` to `FULFILLED` |

---

### Module 4: Donor Response Matching (`/api/v1/requests/:id/responses`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/requests/:id/responses` | `USER` (Profile Complete) | Responds to active request (validates exact blood match & 90d cooldown; unlocks phone) |
| `GET` | `/api/v1/requests/:id/responses` | Requester / `ADMIN` | Paginated list of donors who responded, including verified contact info |

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **PostgreSQL**: Local instance or remote pooled database
- **Redis**: Local Redis server (`localhost:6379`) or free cloud instance (e.g., Redis Cloud)
- **Git**

### 1. Clone and Install
```bash
git clone https://github.com/your-username/blood_donation_backend.git
cd blood_donation_backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Fill in the required configuration:
```ini
NODE_ENV=development
PORT=5000
CORS_ORIGIN=*
ENABLE_DOCS=true

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/blood_donation_db?schema=public"

# Redis (Local or Cloud)
REDIS_URL="redis://localhost:6379"

# Authentication Secrets (generate random strings with 32+ characters)
JWT_ACCESS_SECRET="your_super_secret_jwt_access_key_min_32_characters"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your_super_secret_jwt_refresh_key_min_32_characters"
JWT_REFRESH_EXPIRES_IN="7d"

# Default Admin Seeder (created automatically on server bootstrap)
ADMIN_EMAIL="admin@gmail.com"
ADMIN_PASSWORD="AdminSecurePassword123!"
ADMIN_NAME="System Administrator"
ADMIN_PHONE="01700000000"

# Email Configuration (defaults to ethereal.email for local testing)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Blood Donation Platform <noreply@blooddonation.org>"
```

### 3. Database Initialization
Generate the Prisma Client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start Development Server
```bash
npm run dev
```
The server will boot with automatic hot-reloading:
```
=======================================================
  Blood Donation Platform API Server Running
  Environment : development
  Port        : 5000
  Health Check: http://localhost:5000/health
  API Base    : http://localhost:5000/api/v1
  API Docs    : http://localhost:5000/api-docs
=======================================================
```

### 5. Quality & Verification Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run typecheck` | Validates TypeScript strict mode (`tsc --noEmit`) |
| `npm run check` | Runs Biome linter and formatter verification |
| `npm run check:fix` | Automatically formats and fixes Biome lint issues |
| `npm run build` | Generates Prisma client and compiles ESM bundle with `tsup` |
| `npm run prisma:studio` | Opens visual Prisma database GUI in your browser |

---

## 📖 Interactive API Documentation (Swagger)

When `ENABLE_DOCS=true`, the API automatically serves a fully interactive Swagger UI:
- **URL**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **Features**:
  - Test any endpoint directly from the browser.
  - Authorize requests using Bearer JWT tokens.
  - View full schema definitions, required parameters, and response envelopes.

---

## ☁️ Cloud Deployment (Render Guide)

The application is pre-configured and hardened for cloud deployment on platforms like **Render**.

### Service Settings

1. Create a **New Web Service** connected to your GitHub repository.
2. Configure the following parameters:
   - **Runtime:** `Node`
   - **Node Version:** `20` or higher
   - **Build Command:** `npm install && npm run build`
   - **Pre-Deploy Command:** `npx prisma migrate deploy`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** `Yes`

### Environment Variables Checklist

Set these environment variables in your Render Dashboard:

| Key | Example Value / Notes |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render default) |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` |
| `REDIS_URL` | `redis://default:password@host:port` (Redis Cloud) |
| `JWT_ACCESS_SECRET` | 32+ character secure random string |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_SECRET` | 32+ character secure random string |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://your-frontend-domain.com` (or `*`) |
| `ENABLE_DOCS` | `true` (or `false` to disable in production) |
| `ADMIN_EMAIL` | `admin@platform.com` |
| `ADMIN_PASSWORD` | Strong password (8+ characters) |
| `ADMIN_NAME` | `Platform Administrator` |
| `ADMIN_PHONE` | `01700000000` |
| `SMTP_HOST` | `smtp.gmail.com` (or SendGrid, Resend) |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-smtp-app-password` |
| `SMTP_FROM` | `Blood Donation <noreply@yourdomain.com>` |

---

## 🔒 Security & Core Invariants

- **Reverse Proxy IP Resolution**: Configured with `app.set('trust proxy', 1)` to prevent shared IP rate limit lockouts behind cloud load balancers.
- **Fail-Fast Configuration**: Server crashes on bootstrap if required environment variables are missing or malformed.
- **Cross-Site Cookie Security**: In production, cookies are automatically set with `sameSite: 'none'` and `secure: true` for reliable cross-domain frontend-to-backend communication.
- **Strict Role-Based Access Control**: Sensitive administrative endpoints (`approve`, `reject`, `pending`) are strictly restricted to users with the `ADMIN` role.
- **Single Donor Response Invariant**: Database-level unique constraint (`@@unique([requestId, donorId])`) guarantees donors cannot spam multiple responses to the same request.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

