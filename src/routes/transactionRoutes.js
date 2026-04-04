const express = require("express");
const { body, param, query } = require("express-validator");
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { TYPES, CATEGORIES } = require("../models/Transaction");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get(
  "/",
  [
    query("type").optional().isIn(TYPES).withMessage(`Type must be one of: ${TYPES.join(", ")}`),
    query("category").optional().isIn(CATEGORIES).withMessage("Invalid category"),
    query("startDate").optional().isISO8601().withMessage("startDate must be a valid date"),
    query("endDate").optional().isISO8601().withMessage("endDate must be a valid date"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1–100"),
  ],
  validate,
  // viewer, analyst, admin can all read
  authorize("viewer", "analyst", "admin"),
  getTransactions
);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid transaction ID")],
  validate,
  authorize("viewer", "analyst", "admin"),
  getTransactionById
);

router.post(
  "/",
  authorize("analyst", "admin"),
  [
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number"),
    body("type").isIn(TYPES).withMessage(`Type must be one of: ${TYPES.join(", ")}`),
    body("category").isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(", ")}`),
    body("date").optional().isISO8601().withMessage("date must be a valid ISO date"),
    body("description").optional().isLength({ max: 500 }).withMessage("Description max 500 chars"),
  ],
  validate,
  createTransaction
);

router.put(
  "/:id",
  authorize("analyst", "admin"),
  [
    param("id").isMongoId().withMessage("Invalid transaction ID"),
    body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be a positive number"),
    body("type").optional().isIn(TYPES).withMessage(`Type must be one of: ${TYPES.join(", ")}`),
    body("category").optional().isIn(CATEGORIES).withMessage("Invalid category"),
    body("date").optional().isISO8601().withMessage("date must be a valid ISO date"),
    body("description").optional().isLength({ max: 500 }).withMessage("Description max 500 chars"),
  ],
  validate,
  updateTransaction
);

router.delete(
  "/:id",
  authorize("admin"),
  [param("id").isMongoId().withMessage("Invalid transaction ID")],
  validate,
  deleteTransaction
);

module.exports = router;
