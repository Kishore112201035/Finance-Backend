const mongoose = require("mongoose");

const TYPES = ["income", "expense"];
const CATEGORIES = [
  "salary",
  "freelance",
  "investment",
  "food",
  "transport",
  "utilities",
  "entertainment",
  "healthcare",
  "education",
  "shopping",
  "other",
];

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be positive"],
    },
    type: {
      type: String,
      enum: TYPES,
      required: [true, "Type is required"],
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: [true, "Category is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false, // soft delete
    },
  },
  { timestamps: true }
);

// Exclude soft-deleted records by default
transactionSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = { Transaction, TYPES, CATEGORIES };
