# Finance Data Processing and Access Control Backend

A production-style REST API backend for a finance dashboard system, built with **Node.js**, **Express**, **MongoDB**, and **JWT authentication**. Fully containerised with **Docker + Docker Compose**.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 | Async I/O, fast JSON handling |
| Framework | Express 4 | Minimal, composable, widely understood |
| Database | MongoDB 7 (Mongoose) | Flexible schema, rich aggregation pipeline for dashboard analytics |
| Auth | JWT (jsonwebtoken + bcryptjs) | Stateless, easy to distribute; no session store needed |
| Validation | express-validator | Declarative, per-route validation chains |
| Rate limiting | express-rate-limit | Simple abuse protection out of the box |
| Container | Docker + Docker Compose | Reproducible environment, zero-config local setup |
| Testing | Jest + Supertest | Integration tests against real Express/MongoDB |

---

## Project Structure

```
finance-backend/
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # register / login / me
│   │   ├── userController.js   # CRUD for users (admin only)
│   │   ├── transactionController.js
│   │   └── dashboardController.js  # aggregation endpoints
│   ├── middleware/
│   │   ├── auth.js             # authenticate (JWT) + authorize (RBAC)
│   │   ├── validate.js         # express-validator error formatter
│   │   └── errorHandler.js     # centralised error handler
│   ├── models/
│   │   ├── User.js             # User schema + password hashing
│   │   └── Transaction.js      # Transaction schema + soft-delete pre-hook
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/
│   │   └── token.js            # JWT sign + response helper
│   ├── app.js                  # Express app wiring
│   ├── server.js               # Entry point
│   └── seed.js                 # Demo data seeder
├── tests/
│   └── api.test.js             # Integration tests
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── jest.config.json
└── package.json
```

---

## Quick Start (Docker — Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd finance-backend
cp .env.example .env          # edit JWT_SECRET before production use
```

### 2. Start everything

```bash
docker compose up --build
```

This spins up:
- **finance_app** — Node.js API on `http://localhost:5000`
- **finance_mongo** — MongoDB on `localhost:27017`

### 3. Seed demo data (optional but recommended)

In a second terminal:

```bash
docker compose exec app node src/seed.js
```

This creates three ready-to-use accounts:

| Email | Password | Role |
|---|---|---|
| admin@demo.com | admin123 | admin |
| analyst@demo.com | analyst123 | analyst |
| viewer@demo.com | viewer123 | viewer |

### 4. Verify

```bash
curl http://localhost:5000/health
# {"success":true,"message":"Finance API is running","timestamp":"..."}
```

### 5. Stop

```bash
docker compose down          # keep data
docker compose down -v       # also remove MongoDB volume
```

---

## Running Locally (without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Edit MONGODB_URI to point to your local MongoDB instance

# 3. Start
npm run dev        # nodemon (hot reload)
# or
npm start          # plain node
```

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

All protected endpoints require:
```
Authorization: Bearer <token>
```

---

### Auth

#### `POST /api/auth/register`
Create a new user account.

**Body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "viewer"        // optional: viewer | analyst | admin (default: viewer)
}
```

**Response `201`:**
```json
{
  "success": true,
  "token": "<jwt>",
  "user": { "id": "...", "name": "Alice", "email": "...", "role": "viewer" }
}
```

---

#### `POST /api/auth/login`

**Body:**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response `200`:** same shape as register.

---

#### `GET /api/auth/me` 🔒
Returns the currently authenticated user.

---

### Users *(admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get a single user |
| PATCH | `/api/users/:id` | Update role / name / isActive |
| DELETE | `/api/users/:id` | Delete a user |

**PATCH body example:**
```json
{ "role": "analyst", "isActive": false }
```

---

### Transactions

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/transactions` | all | List with filtering + pagination |
| GET | `/api/transactions/:id` | all | Single transaction |
| POST | `/api/transactions` | analyst, admin | Create |
| PUT | `/api/transactions/:id` | analyst, admin | Update |
| DELETE | `/api/transactions/:id` | admin | Soft delete |

**POST / PUT body:**
```json
{
  "amount": 1500.00,
  "type": "income",
  "category": "salary",
  "date": "2024-05-01",
  "description": "May salary"
}
```

**GET query params:**
| Param | Example | Description |
|---|---|---|
| `type` | `income` | Filter by type |
| `category` | `food` | Filter by category |
| `startDate` | `2024-01-01` | ISO date lower bound |
| `endDate` | `2024-12-31` | ISO date upper bound |
| `page` | `1` | Pagination page (default 1) |
| `limit` | `20` | Items per page (default 20, max 100) |

**Valid types:** `income`, `expense`

**Valid categories:** `salary`, `freelance`, `investment`, `food`, `transport`, `utilities`, `entertainment`, `healthcare`, `education`, `shopping`, `other`

---

### Dashboard *(analyst + admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Total income, expenses, net balance |
| GET | `/api/dashboard/category-breakdown` | Totals grouped by type + category |
| GET | `/api/dashboard/monthly-trends?year=2024` | Monthly income/expense by month |
| GET | `/api/dashboard/recent?limit=10` | Most recent N transactions |

**Summary response example:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 45000,
    "totalExpenses": 18500,
    "netBalance": 26500,
    "totalTransactions": 60
  }
}
```

---

## Role-Based Access Control

| Action | viewer | analyst | admin |
|---|:---:|:---:|:---:|
| Read transactions | ✅ | ✅ | ✅ |
| Create transaction | ❌ | ✅ | ✅ |
| Update transaction | ❌ | ✅ | ✅ |
| Delete transaction (soft) | ❌ | ❌ | ✅ |
| Access dashboard analytics | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

RBAC is enforced by `middleware/auth.js` → `authorize(...roles)` which runs **after** JWT verification on every protected route.

---

## Error Handling

All errors return a consistent JSON shape:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / invalid ID |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but not authorised |
| 404 | Resource not found |
| 409 | Duplicate (e.g. email already registered) |
| 422 | Validation failed (includes `errors` array) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Running Tests

> Tests require a running MongoDB instance (or set `MONGODB_URI_TEST` in your `.env`).

```bash
npm test
```

The test suite covers:
- User registration and login flows
- JWT protection on all routes
- Role-based access enforcement (viewer/analyst/admin)
- Transaction CRUD + soft delete
- Dashboard access control
- Input validation rejection

---

## Assumptions & Design Decisions

1. **Soft delete for transactions** — financial records should not be permanently erased for audit purposes. The `isDeleted` flag hides records from normal queries via a Mongoose pre-hook, but an admin can query with `{ includeDeleted: true }` if needed in future.

2. **Password field excluded by default** — `select: false` on the password field means it is never accidentally leaked in a response, without needing manual omission everywhere.

3. **Register endpoint is open** — In a real system this would be admin-only or invite-only. For this assignment, self-registration is allowed for ease of testing.

4. **No refresh tokens** — JWT expiry is set to 7 days via `JWT_EXPIRES_IN`. A production system would add refresh token rotation.

5. **Rate limiting is global** — Applied to all `/api/*` routes. In production this would be tighter on `/api/auth/login`.

6. **Seeder uses bcryptjs directly** — `insertMany` bypasses Mongoose middleware, so passwords are hashed manually in the seed script.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | `development` | Affects logging verbosity |
| `MONGODB_URI` | `mongodb://localhost:27017/financedb` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Secret for signing JWTs — **change this** |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
