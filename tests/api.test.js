/**
 * Integration tests — uses an in-memory MongoDB instance via mongoose.
 * Run: npm test
 *
 * NOTE: These tests use a real Express app against a real (local) MongoDB.
 * For a CI/CD pipeline you would swap in mongodb-memory-server.
 */
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const { User } = require("../src/models/User");
const { Transaction } = require("../src/models/Transaction");

// Use a dedicated test DB
const TEST_DB = process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/financedb_test";

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  await User.deleteMany({});
  await Transaction.deleteMany({});
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const createUser = async (role = "admin") => {
  const res = await request(app).post("/api/auth/register").send({
    name: `Test ${role}`,
    email: `${role}@test.com`,
    password: "password123",
    role,
  });
  return res.body.token;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
describe("Auth", () => {
  test("register a new user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Alice",
      email: "alice@test.com",
      password: "secret123",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("viewer"); // default role
  });

  test("login with valid credentials", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Bob",
      email: "bob@test.com",
      password: "secret123",
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@test.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("reject login with wrong password", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Carol",
      email: "carol@test.com",
      password: "secret123",
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "carol@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  test("return 422 on missing email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "X", password: "pass123" });
    expect(res.status).toBe(422);
  });
});

// ─── Transactions ─────────────────────────────────────────────────────────────
describe("Transactions", () => {
  test("admin can create a transaction", async () => {
    const token = await createUser("admin");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 500, type: "income", category: "salary" });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(500);
  });

  test("viewer cannot create a transaction", async () => {
    const token = await createUser("viewer");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 200, type: "expense", category: "food" });
    expect(res.status).toBe(403);
  });

  test("viewer can read transactions", async () => {
    const adminToken = await createUser("admin");
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 100, type: "expense", category: "food" });

    const viewerToken = await createUser("viewer");
    const res = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test("reject invalid amount", async () => {
    const token = await createUser("admin");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: -50, type: "income", category: "salary" });
    expect(res.status).toBe(422);
  });

  test("soft delete by admin", async () => {
    const token = await createUser("admin");
    const create = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 300, type: "expense", category: "food" });

    const id = create.body.data._id;
    const del = await request(app)
      .delete(`/api/transactions/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);

    // should not appear in list after soft delete
    const list = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.data.find((t) => t._id === id)).toBeUndefined();
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
describe("Dashboard", () => {
  test("analyst can access summary", async () => {
    const token = await createUser("analyst");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("netBalance");
  });

  test("viewer cannot access dashboard summary", async () => {
    const token = await createUser("viewer");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
