const { Transaction } = require("../models/Transaction");

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const result = await Transaction.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const income = result.find((r) => r._id === "income")?.total || 0;
    const expenses = result.find((r) => r._id === "expense")?.total || 0;

    res.json({
      success: true,
      data: {
        totalIncome: income,
        totalExpenses: expenses,
        netBalance: income - expenses,
        totalTransactions: result.reduce((a, r) => a + r.count, 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/category-breakdown
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const data = await Transaction.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: { type: "$type", category: "$category" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/monthly-trends?year=2024
const getMonthlyTrends = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const data = await Transaction.aggregate([
      {
        $match: {
          isDeleted: false,
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$date" }, type: "$type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    res.json({ success: true, year, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/recent?limit=10
const getRecentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const data = await Transaction.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrends, getRecentActivity };
