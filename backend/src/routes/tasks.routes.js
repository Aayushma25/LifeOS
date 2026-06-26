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

// GET /api/tasks - top-level tasks with their subtasks
router.get("/", async (req, res, next) => {
  try {
    const { status, priority, search } = req.query;
    const where = {
      userId: req.user.id,
      parentId: null,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(search ? { title: { contains: search } } : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      include: { subtasks: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { subtasks: true },
    });
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

const taskValidators = [body("title").trim().notEmpty().withMessage("Title is required.")];

router.post("/", taskValidators, handleValidation, async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, labels, parentId, status } = req.body;

    if (parentId) {
      const parent = await prisma.task.findFirst({ where: { id: parentId, userId: req.user.id } });
      if (!parent) return res.status(400).json({ error: "Parent task not found." });
    }

    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        title,
        description: description || null,
        priority: priority || "MEDIUM",
        status: status || "PENDING",
        dueDate: dueDate ? new Date(dueDate) : null,
        labels: labels || "",
        parentId: parentId || null,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", taskValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Task not found." });

    const { title, description, priority, dueDate, labels, status } = req.body;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title,
        description: description ?? existing.description,
        priority: priority ?? existing.priority,
        status: status ?? existing.status,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        labels: labels ?? existing.labels,
      },
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/status - quick status change (used by Kanban drag/drop)
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Task not found." });

    const task = await prisma.task.update({ where: { id: req.params.id }, data: { status } });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Task not found." });
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
