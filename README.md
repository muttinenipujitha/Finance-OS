# Finance Dashboard API

A production-ready REST API for a finance dashboard system with role-based access control, financial record management, and aggregated analytics.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the Server](#running-the-server)
- [Running Tests](#running-tests)
- [API Reference](#api-reference)
- [Role Permissions](#role-permissions)
- [Design Decisions](#design-decisions)
- [Assumptions](#assumptions)

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Runtime      | Node.js 18+                       |
| Language     | TypeScript                        |
| Framework    | Express.js                        |
| Database     | PostgreSQL 14+                    |
| ORM          | Prisma                            |
| Validation   | Zod                               |
| Auth         | JWT (access + refresh token pair) |
| Hashing      | bcryptjs (12 rounds)              |
| Testing      | Jest + Supertest                  |

---

## Project Structure

```
src/
├── config/
│   ├── env.ts              # Typed + validated env vars (Zod)
│   └── database.ts         # Prisma client singleton
├── middleware/
│   ├── authenticate.ts     # JWT verification, attaches req.user
│   ├── authorize.ts        # Role guard factory
│   ├── validate.ts         # Zod request validator
│   └── errorHandler.ts     # Global error handler + catchAsync
├── modules/
│   ├── auth/               # Register, login, refresh, logout, /me
│   ├── users/              # User CRUD + role/status management
│   ├── transactions/       # Financial records CRUD + filtering
│   └── dashboard/          # Summary, trends, categories, recent
├── utils/
│   ├── AppError.ts         # Custom operational error class
│   ├── response.ts         # Standardised response helpers
│   └── pagination.ts       # Page/limit parsing
├── app.ts                  # Express setup, routes, middleware
└── server.ts               # HTTP server + graceful shutdown
prisma/
├── schema.prisma           # Data models + enums
└── seed.ts                 # Seed 3 users + 120 transactions
tests/
├── helpers.ts              # DB cleanup + test user factories
├── auth.test.ts
├── transactions.test.ts
└── dashboard.test.ts
```

---

## Prerequisites

- **Node.js** v18 or higher — https://nodejs.org
- **PostgreSQL** v14 or higher — https://www.postgresql.org/download
- **npm** v9+ (comes with Node.js)

---

## Setup Guide

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd finance-api
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/finance_db"
JWT_ACCESS_SECRET="change-this-to-a-long-random-string"
JWT_REFRESH_SECRET="change-this-to-another-long-random-string"
```

> Generate strong secrets with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 3. Create the PostgreSQL database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql:
CREATE DATABASE finance_db;
\q
```

### 4. Run database migrations

```bash
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Apply schema migrations
```

### 5. Seed the database

```bash
npm run db:seed
```

This creates 3 test users and 120 sample transactions:

| Role    | Email                   | Password      |
|---------|-------------------------|---------------|
| Admin   | admin@finance.com       | Password123!  |
| Analyst | analyst@finance.com     | Password123!  |
| Viewer  | viewer@finance.com      | Password123!  |

### 6. Start the development server

```bash
npm run dev
```

The server starts at **http://localhost:3000**

Check it's running:
```bash
curl http://localhost:3000/health
```

---

## Environment Variables

| Variable               | Required | Default       | Description                            |
|------------------------|----------|---------------|----------------------------------------|
| `DATABASE_URL`         | Yes      | —             | PostgreSQL connection string           |
| `JWT_ACCESS_SECRET`    | Yes      | —             | Secret for signing access tokens       |
| `JWT_REFRESH_SECRET`   | Yes      | —             | Secret for signing refresh tokens      |
| `JWT_ACCESS_EXPIRES_IN`| No       | `15m`         | Access token lifetime                  |
| `JWT_REFRESH_EXPIRES_IN`| No      | `7d`          | Refresh token lifetime                 |
| `PORT`                 | No       | `3000`        | HTTP server port                       |
| `NODE_ENV`             | No       | `development` | `development` / `production` / `test`  |
| `CORS_ORIGIN`          | No       | `http://localhost:5173` | Allowed CORS origin          |

---

## Database

### Schema overview

```
User               RefreshToken         Transaction
────────────────   ─────────────────    ────────────────────
id (uuid)          id (uuid)            id (uuid)
email (unique)     token (unique)       userId (fk → User)
password (bcrypt)  userId (fk → User)   amount (Decimal 15,2)
name               expiresAt            type (INCOME|EXPENSE)
role (enum)        createdAt            category
status (enum)                           date
createdAt                               notes
updatedAt                               createdAt
deletedAt (soft)                        updatedAt
                                        deletedAt (soft)
```

### Useful database commands

```bash
npm run db:migrate      # Run pending migrations
npm run db:generate     # Regenerate Prisma client after schema changes
npm run db:seed         # Seed with sample data
npm run db:studio       # Open Prisma Studio (GUI) at localhost:5555
```

---

## Running the Server

```bash
# Development (auto-restart on file change)
npm run dev

# Production build
npm run build
npm start
```

---

## Running Tests

Tests require a separate test database to avoid wiping your development data.

### 1. Create a test database

```bash
psql -U postgres -c "CREATE DATABASE finance_test;"
```

### 2. Set the test database URL

Add to your `.env`:

```env
# Tests will use this automatically when NODE_ENV=test
DATABASE_URL_TEST="postgresql://postgres:yourpassword@localhost:5432/finance_test"
```

Or create a `.env.test` file:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/finance_test"
JWT_ACCESS_SECRET="test-access-secret-at-least-16-chars"
JWT_REFRESH_SECRET="test-refresh-secret-at-least-16-chars"
NODE_ENV="test"
```

### 3. Apply migrations to test DB

```bash
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/finance_test" npx prisma migrate deploy
```

### 4. Run tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
```

---

## API Reference

All responses follow this envelope:

```json
// Success
{ "success": true, "data": { ... }, "meta": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

---

### Auth

#### `POST /api/v1/auth/register`
Create a new account. Returns tokens immediately.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "Jane Doe"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "user@example.com", "role": "VIEWER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

#### `POST /api/v1/auth/login`

**Body:**
```json
{ "email": "admin@finance.com", "password": "Password123!" }
```

---

#### `POST /api/v1/auth/refresh`
Exchange a refresh token for a new access token (rotates the refresh token).

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

---

#### `POST /api/v1/auth/logout`
Revokes the refresh token.

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

---

#### `GET /api/v1/auth/me`
Returns the currently authenticated user.

**Headers:** `Authorization: Bearer <accessToken>`

---

### Users *(Admin only)*

#### `GET /api/v1/users`

**Query params:**
| Param    | Type   | Example        |
|----------|--------|----------------|
| `page`   | number | `1`            |
| `limit`  | number | `20`           |
| `role`   | enum   | `ANALYST`      |
| `status` | enum   | `ACTIVE`       |
| `search` | string | `john`         |

---

#### `GET /api/v1/users/:id`

#### `PATCH /api/v1/users/:id/role`
```json
{ "role": "ANALYST" }
```

#### `PATCH /api/v1/users/:id/status`
```json
{ "status": "INACTIVE" }
```

#### `DELETE /api/v1/users/:id`
Soft-deletes the user (sets `deletedAt`).

---

### Transactions

#### `GET /api/v1/transactions` *(Viewer, Analyst, Admin)*

**Query params:**
| Param       | Type   | Example        | Description               |
|-------------|--------|----------------|---------------------------|
| `page`      | number | `1`            |                           |
| `limit`     | number | `20`           | Max 100                   |
| `type`      | enum   | `INCOME`       | `INCOME` or `EXPENSE`     |
| `category`  | string | `Salary`       | Partial match             |
| `dateFrom`  | date   | `2024-01-01`   | ISO 8601                  |
| `dateTo`    | date   | `2024-12-31`   | ISO 8601                  |
| `search`    | string | `rent`         | Searches notes field      |
| `sortBy`    | string | `date`         | `date`, `amount`, `createdAt` |
| `sortOrder` | string | `desc`         | `asc` or `desc`           |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": "1500.00",
      "type": "INCOME",
      "category": "Salary",
      "date": "2024-03-01T00:00:00.000Z",
      "notes": null,
      "user": { "id": "...", "name": "Admin User" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 87, "totalPages": 5 }
}
```

---

#### `POST /api/v1/transactions` *(Admin only)*
```json
{
  "amount": 2500.00,
  "type": "INCOME",
  "category": "Freelance",
  "date": "2024-03-15",
  "notes": "Web project payment"
}
```

#### `PATCH /api/v1/transactions/:id` *(Admin only)*
Partial update — any subset of the fields above.

#### `DELETE /api/v1/transactions/:id` *(Admin only)*
Soft-deletes the transaction.

---

### Dashboard

#### `GET /api/v1/dashboard/summary` *(All roles)*

**Query params:** `dateFrom`, `dateTo` (optional ISO dates)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 45000.00,
    "totalExpenses": 18500.00,
    "netBalance": 26500.00,
    "incomeCount": 24,
    "expenseCount": 96,
    "totalTransactions": 120
  }
}
```

---

#### `GET /api/v1/dashboard/recent` *(All roles)*

**Query params:** `limit` (default 10, max 50)

---

#### `GET /api/v1/dashboard/trends` *(Analyst, Admin)*

**Query params:**
| Param    | Default   | Options             |
|----------|-----------|---------------------|
| `period` | `monthly` | `monthly`, `weekly` |
| `months` | `12`      | 1–24                |

**Response:**
```json
{
  "success": true,
  "data": [
    { "period": "2024-01-01", "income": 5000, "expense": 1800, "net": 3200 },
    { "period": "2024-02-01", "income": 6200, "expense": 2100, "net": 4100 }
  ]
}
```

---

#### `GET /api/v1/dashboard/categories` *(Analyst, Admin)*

**Response:**
```json
{
  "success": true,
  "data": [
    { "category": "Salary", "income": 30000, "expense": 0, "net": 30000, "count": 6 },
    { "category": "Rent",   "income": 0, "expense": 7200, "net": -7200, "count": 6 }
  ]
}
```

---

## Role Permissions

| Endpoint                    | Viewer | Analyst | Admin |
|-----------------------------|:------:|:-------:|:-----:|
| Auth (register/login)       | ✓      | ✓       | ✓     |
| GET /transactions           | ✓      | ✓       | ✓     |
| POST/PATCH/DELETE /transactions |    |         | ✓     |
| GET /dashboard/summary      | ✓      | ✓       | ✓     |
| GET /dashboard/recent       | ✓      | ✓       | ✓     |
| GET /dashboard/trends       |        | ✓       | ✓     |
| GET /dashboard/categories   |        | ✓       | ✓     |
| All /users routes           |        |         | ✓     |

---

## Design Decisions

### Feature-sliced modules
Each module (`auth/`, `users/`, `transactions/`, `dashboard/`) owns its controller, service, routes, and schema. This keeps related code together and makes each feature independently understandable.

### Decimal for money
JavaScript `number` (IEEE 754 float) cannot accurately represent decimal values like `0.1 + 0.2`. All amounts are stored as `Decimal(15, 2)` in PostgreSQL and handled via Prisma's `Decimal` type to prevent rounding errors in financial calculations.

### Refresh token rotation
Each call to `/auth/refresh` deletes the old refresh token and issues a new one. This limits the exposure window if a refresh token is ever leaked — an attacker can only use a stolen token once before it's invalidated.

### Soft deletes
Users and transactions are never hard-deleted from the database. A `deletedAt` timestamp is set instead, and all queries filter `WHERE deleted_at IS NULL`. This preserves the audit trail and makes accidental deletions recoverable.

### Authorize middleware as a factory
`authorize('ADMIN')` and `authorize('VIEWER', 'ANALYST', 'ADMIN')` read clearly on the route definition. The role check happens after authentication so `req.user` is always populated.

### Raw SQL for trend aggregation
Prisma's `groupBy` does not support date truncation functions like `DATE_TRUNC`. The trends endpoint uses `prisma.$queryRaw` with a tagged template literal (safe from SQL injection via Prisma's parameterisation) to group by month or week efficiently at the database level.

### Standard response envelope
Every response returns `{ success, data, meta?, error? }`. This gives frontend consumers a consistent shape to handle regardless of the endpoint.

---

## Assumptions

1. **Single organisation** — all users and transactions belong to one shared organisation. Multi-tenancy is not implemented.
2. **Admin creates transactions** — in a real system, transactions might be imported from bank feeds. Here, Admins create them manually via the API.
3. **New users default to VIEWER** — safer than defaulting to ADMIN; an admin must explicitly promote a user.
4. **Refresh tokens stored in DB** — this allows server-side revocation (logout, deactivate user). The trade-off is one extra DB read per refresh call.
5. **No email verification** — registration is immediate. In production you'd send a verification email before activating the account.


<img width="1920" height="1080" alt="Screenshot 2026-04-02 172034" src="https://github.com/user-attachments/assets/fb45c142-06d8-4be6-bcb7-bc5efcd934c4" />

<img width="1920" height="1080" alt="Screenshot 2026-04-02 171306" src="https://github.com/user-attachments/assets/d676d66c-4849-42e0-a3e3-f76cfd23e29c" />

<img width="1920" height="1080" alt="Screenshot 2026-04-02 172022" src="https://github.com/user-attachments/assets/e8f9887b-89d8-4a77-95b9-7c74ad486cb4" />


<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/fc151621-e51c-4e3b-a27a-7ab041c0f64b" />

