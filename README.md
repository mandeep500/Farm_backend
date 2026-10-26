# Sekhon Farm Backend API 🌾🚜

Production-ready, secure, scalable RESTful backend service for **Sekhon Farm**, built with **Node.js**, **Fastify**, **TypeScript**, and **Prisma ORM** targeting **MySQL 8.x**.

---

## 🏛️ Architecture & Clean Modular Design

The backend strictly separates responsibilities into distinct layers to guarantee testability, maintainability, and clean code boundaries:

```
Farm_backend/
├── prisma/
│   ├── schema.prisma            # MySQL 8.x Data models with relations & indexes
│   ├── migrations/              # Production SQL migrations
│   └── seed.ts                  # Secure seeding (Admin, patron, deployment test user)
├── src/
│   ├── config/                  # Zod-validated environment configuration
│   ├── controllers/             # HTTP request handling and response formatting
│   ├── db/                      # Prisma Client singleton
│   ├── middlewares/             # Auth, role authorization, Zod validation
│   ├── repositories/            # Encapsulated database operations (no direct Prisma in routes)
│   ├── routes/                  # Route definitions mounted under /api/v1
│   ├── schemas/                 # Zod validation schemas (body, query, params)
│   ├── services/                # Business logic, password hashing, transactions
│   ├── types/                   # TypeScript interfaces and Fastify augmentations
│   ├── utils/                   # Crypto, errors, sanitization, logging helpers
│   ├── app.ts                   # Fastify application factory (Helmet, CORS, Cookies, Rate limiting)
│   └── index.ts                 # Server entry point & graceful shutdown
└── tests/                       # Automated test suite (Vitest + Fastify inject)
```

---

## 🚀 Key Features & Security Guarantees

1. **Authentication & Session Management**:
   - Server-side sessions backed by MySQL `sessions` table.
   - Dual-token support: Secure **HTTP-only, SameSite, Secure cookies** for web browsers + **Bearer token** for API clients.
   - Cryptographically random session IDs (`sess_<64_hex_chars>`).
   - Passwords hashed with **bcrypt (salt rounds 12)**; plain-text passwords never stored.
   - Email normalization (`trim().toLowerCase()`) on registration, login, and queries.
   - Generic authentication errors and dummy timing comparison to protect against user enumeration and timing side-channel attacks.

2. **Cryptographic Password Reset Flow**:
   - Short-lived high-entropy reset tokens generated cryptographically.
   - Database stores **only one-way SHA-256 hashes** of reset tokens.
   - Immediate invalidation of reset tokens upon use.
   - **Atomic session revocation**: On password reset, all active user sessions are invalidated immediately in a single database transaction.

3. **Input Validation with Zod**:
   - Global validation middleware rejects malformed requests before executing business logic.
   - Strict password policy enforced: **8–18 characters**, containing at least one uppercase letter, one lowercase letter, one number, and one special character.
   - Environment variables validated at startup.

4. **Production Security & Hardening**:
   - **`@fastify/helmet`** for secure HTTP response headers.
   - **`@fastify/cors`** restricted to authorized origins (e.g., Sekhon Farm Next.js frontend).
   - **`@fastify/rate-limit`** with strict limits on auth routes (`/register`, `/login`, `/forgot-password`).
   - Request body size capped at 1MB to prevent payload flood attacks.
   - **Zero sensitive logging**: Passwords, tokens, cookies, and secrets are automatically redacted from Pino logs.
   - Graceful shutdown on `SIGINT` / `SIGTERM` closing Fastify and database connections cleanly.

---

## 📋 API Endpoints (`/api/v1`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Health check & MySQL status | No |
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate email & password | No |
| `POST` | `/api/v1/auth/logout` | Invalidate session & clear cookie | Optional |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile | Yes (Session/Bearer) |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset token | No |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token | No |
| `GET` | `/api/v1/users/me` | Retrieve authenticated profile | Yes |
| `PATCH` | `/api/v1/users/me` | Update profile (name, phone) | Yes |
| `GET` | `/api/v1/user/profile` | Frontend alias for profile | Yes |
| `PUT` | `/api/v1/user/profile` | Frontend alias for update | Yes |
| `POST` | `/api/v1/contact` | Submit farm inquiry / contact message | No |

---

## 🛠️ Environment Configuration

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `5000` |
| `DATABASE_URL` | MySQL connection string | `mysql://root@localhost/sekhon_farm?socket=...` |
| `SESSION_SECRET` | Secret key for signing session cookies (min 32 chars) | Random 64-hex string |
| `COOKIE_SECRET` | Secret for Fastify cookie parsing (min 32 chars) | Random 64-hex string |
| `SESSION_TTL_HOURS` | Lifetime of server-side sessions | `72` |
| `PASSWORD_RESET_TTL_MINUTES` | Lifetime of password reset tokens | `15` |
| `CORS_ORIGIN` | Allowed frontend origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `RATE_LIMIT_MAX` | Global rate limit requests per window | `100` |
| `RATE_LIMIT_AUTH_MAX` | Auth route rate limit requests per window | `10` |
| `INITIAL_ADMIN_EMAIL` | Email for initial seeded admin | `admin@sekhonfarm.com` |
| `INITIAL_ADMIN_PASSWORD` | Secure password for seeded admin | `Admin@Sekhon2026!#` |

---

## 🏃 Local Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
```bash
npx prisma migrate deploy
```

### 3. Seed Database (Admin & Deployment Test Users)
```bash
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run dev
```
The server will be live at `http://localhost:5000/api/v1`.

### 5. Build and Start Production Server
```bash
npm run build
npm start
```

### 6. Run Automated Tests
```bash
npm test
```
Runs 21+ automated tests covering registration, duplicate handling, login, logout, authentication cookies, password reset, validation, and profile updates.

---

## 🔗 Integration with Sekhon Farm Next.js Frontend

In the Next.js frontend (`Farm_frontend`):

Update `Farm_frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Start the frontend development server:
```bash
cd ../Farm_frontend
npm run dev
```

The frontend will communicate directly with the local MySQL Fastify backend!

