const express = require("express");
const { query } = require("express-validator");
const {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getRecentActivity,
} = require("../controllers/dashboardController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

// All dashboard routes: authenticated, analyst + admin (viewers excluded)
router.use(authenticate, authorize("analyst", "admin"));

router.get("/summary", getSummary);
router.get("/category-breakdown", getCategoryBreakdown);

router.get(
  "/monthly-trends",
  [
    query("year")
      .optional()
      .isInt({ min: 2000, max: 2100 })
      .withMessage("Year must be a valid 4-digit year"),
  ],
  validate,
  getMonthlyTrends
);

router.get(
  "/recent",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  validate,
  getRecentActivity
);

module.exports = router;
