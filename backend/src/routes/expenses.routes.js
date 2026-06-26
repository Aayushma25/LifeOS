const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

function monthBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

// GET /api/expenses/transactions
router.get("/transactions", async (req, res, next) => {
  try {
    const { type, category, from, to } = req.query;
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
        ...(type ? { type } : {}),
        ...(category ? { category } : {}),
        ...(from || to
          ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      orderBy: { date: "desc" },
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// GET /api/expenses/summary - current month totals + budget comparison
router.get("/summary", async (req, res, next) => {
  try {
    const { start, end } = monthBounds(new Date());
    const [transactions, budgets] = await Promise.all([
      prisma.transaction.findMany({ where: { userId: req.user.id, date: { gte: start, lt: end } } }),
      prisma.budget.findMany({ where: { userId: req.user.id } }),
    ]);

    const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

    const byCategory = {};
    for (const t of transactions.filter((t) => t.type === "EXPENSE")) {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    }

    const budgetComparison = budgets.map((b) => ({
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spent: byCategory[b.category] || 0,
      remaining: b.monthlyLimit - (byCategory[b.category] || 0),
      overBudget: (byCategory[b.category] || 0) > b.monthlyLimit,
    }));

    res.json({ income, expense, net: income - expense, byCategory, budgetComparison });
  } catch (err) {
    next(err);
  }
});

// GET /api/expenses/monthly?months=6 - for charts
router.get("/monthly", async (req, res, next) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 24);
    const now = new Date();
    const earliest = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id, date: { gte: earliest } },
    });

    const buckets = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }), income: 0, expense: 0 });
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));

    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      if (t.type === "INCOME") bucket.income += t.amount;
      else bucket.expense += t.amount;
    }

    res.json(buckets.map(({ key, ...rest }) => rest));
  } catch (err) {
    next(err);
  }
});

const transactionValidators = [
  body("type").isIn(["INCOME", "EXPENSE"]).withMessage("Type must be INCOME or EXPENSE."),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number."),
  body("category").trim().notEmpty().withMessage("Category is required."),
];

router.post("/transactions", transactionValidators, handleValidation, async (req, res, next) => {
  try {
    const { type, amount, category, description, date } = req.body;
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        type,
        amount: Number(amount),
        category,
        description: description || null,
        date: date ? new Date(date) : new Date(),
      },
    });
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

router.put("/transactions/:id", transactionValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Transaction not found." });

    const { type, amount, category, description, date } = req.body;
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        type,
        amount: Number(amount),
        category,
        description: description ?? existing.description,
        date: date ? new Date(date) : existing.date,
      },
    });
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

router.delete("/transactions/:id", async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Transaction not found." });
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ message: "Transaction deleted." });
  } catch (err) {
    next(err);
  }
});

// GET /api/expenses/transactions/export/csv
router.get("/transactions/export/csv", async (req, res, next) => {
  try {
    const transactions = await prisma.transaction.findMany({ where: { userId: req.user.id }, orderBy: { date: "desc" } });
    const headers = ["Date", "Type", "Category", "Amount", "Description"];
    const rows = transactions.map((t) => [
      new Date(t.date).toISOString().slice(0, 10),
      t.type,
      t.category,
      t.amount.toFixed(2),
      (t.description || "").replace(/\n/g, " "),
    ]);
    const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// ---- Budgets ----

router.get("/budgets", async (req, res, next) => {
  try {
    const budgets = await prisma.budget.findMany({ where: { userId: req.user.id }, orderBy: { category: "asc" } });
    res.json(budgets);
  } catch (err) {
    next(err);
  }
});

const budgetValidators = [
  body("category").trim().notEmpty().withMessage("Category is required."),
  body("monthlyLimit").isFloat({ gt: 0 }).withMessage("Monthly limit must be a positive number."),
];

router.post("/budgets", budgetValidators, handleValidation, async (req, res, next) => {
  try {
    const { category, monthlyLimit } = req.body;
    const budget = await prisma.budget.upsert({
      where: { userId_category: { userId: req.user.id, category } },
      update: { monthlyLimit: Number(monthlyLimit) },
      create: { userId: req.user.id, category, monthlyLimit: Number(monthlyLimit) },
    });
    res.status(201).json(budget);
  } catch (err) {
    next(err);
  }
});

router.delete("/budgets/:id", async (req, res, next) => {
  try {
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Budget not found." });
    await prisma.budget.delete({ where: { id: req.params.id } });
    res.json({ message: "Budget deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
