/**
 * Seed script — creates demo users and transactions.
 * Run: node src/seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { User } = require("./models/User");
const { Transaction } = require("./models/Transaction");

const USERS = [
  { name: "Admin User",   email: "admin@demo.com",   password: "admin123",   role: "admin"   },
  { name: "Analyst User", email: "analyst@demo.com", password: "analyst123", role: "analyst" },
  { name: "Viewer User",  email: "viewer@demo.com",  password: "viewer123",  role: "viewer"  },
];

const randomBetween = (a, b) => +(Math.random() * (b - a) + a).toFixed(2);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const INCOME_CATEGORIES  = ["salary", "freelance", "investment"];
const EXPENSE_CATEGORIES = ["food", "transport", "utilities", "entertainment", "healthcare", "shopping"];

const generateTransactions = (adminId) => {
  const txs = [];
  const now = new Date();

  for (let i = 0; i < 60; i++) {
    const type     = Math.random() > 0.4 ? "expense" : "income";
    const category = type === "income" ? pick(INCOME_CATEGORIES) : pick(EXPENSE_CATEGORIES);
    const date     = new Date(now);
    date.setDate(date.getDate() - i * 5); // spread over ~300 days

    txs.push({
      amount: type === "income" ? randomBetween(500, 5000) : randomBetween(10, 800),
      type,
      category,
      date,
      description: `${type} — ${category} entry #${i + 1}`,
      createdBy: adminId,
    });
  }
  return txs;
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  await User.deleteMany({});
  await Transaction.deleteMany({});
  console.log("Cleared existing data");

  const createdUsers = await User.insertMany(
    await Promise.all(USERS.map(async (u) => {
      const bcrypt = require("bcryptjs");
      return { ...u, password: await bcrypt.hash(u.password, 12) };
    }))
  );
  console.log("Users created:", createdUsers.map((u) => u.email));

  const admin = createdUsers.find((u) => u.role === "admin");
  await Transaction.insertMany(generateTransactions(admin._id));
  console.log("60 transactions seeded");

  await mongoose.disconnect();
  console.log("Done. Seed complete.");
})();
