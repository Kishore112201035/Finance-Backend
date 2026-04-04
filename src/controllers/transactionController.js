const { Transaction } = require("../models/Transaction");

// Helper: build MongoDB filter from query params
const buildFilter = (query) => {
  const filter = {};
  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }
  return filter;
};

// GET /api/transactions
const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const filter = buildFilter(req.query);

    const [data, total] = await Promise.all([
      Transaction.find(filter)
        .populate("createdBy", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      data,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res, next) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate("createdBy", "name email");
    if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });
    res.json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

// POST /api/transactions  (analyst + admin)
const createTransaction = async (req, res, next) => {
  try {
    const tx = await Transaction.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

// PUT /api/transactions/:id  (analyst + admin)
const updateTransaction = async (req, res, next) => {
  try {
    const allowed = ["amount", "type", "category", "date", "description"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const tx = await Transaction.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });
    res.json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/transactions/:id  (admin only — soft delete)
const deleteTransaction = async (req, res, next) => {
  try {
    const tx = await Transaction.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });
    res.json({ success: true, message: "Transaction deleted (soft)" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
