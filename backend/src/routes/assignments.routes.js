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

// GET /api/assignments
router.get("/", async (req, res, next) => {
  try {
    const { status, subjectId, search } = req.query;
    const assignments = await prisma.assignment.findMany({
      where: {
        userId: req.user.id,
        ...(status ? { status } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(search ? { title: { contains: search } } : {}),
      },
      include: { subject: { select: { id: true, name: true, color: true } } },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    });
    res.json(assignments);
  } catch (err) {
    next(err);
  }
});

const validators = [body("title").trim().notEmpty().withMessage("Title is required.")];

router.post("/", validators, handleValidation, async (req, res, next) => {
  try {
    const { title, subjectId, deadline, priority, status, submissionDate, notes } = req.body;
    const assignment = await prisma.assignment.create({
      data: {
        userId: req.user.id,
        title,
        subjectId: subjectId || null,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || "MEDIUM",
        status: status || "NOT_STARTED",
        submissionDate: submissionDate ? new Date(submissionDate) : null,
        notes: notes || null,
      },
    });
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.assignment.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Assignment not found." });

    const { title, subjectId, deadline, priority, status, submissionDate, notes } = req.body;
    const assignment = await prisma.assignment.update({
      where: { id: req.params.id },
      data: {
        title,
        subjectId: subjectId === "" ? null : subjectId ?? existing.subjectId,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority ?? existing.priority,
        status: status ?? existing.status,
        submissionDate: submissionDate ? new Date(submissionDate) : existing.submissionDate,
        notes: notes ?? existing.notes,
      },
    });
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "GRADED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const existing = await prisma.assignment.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Assignment not found." });

    const data = { status };
    if (status === "SUBMITTED" && !existing.submissionDate) data.submissionDate = new Date();

    const assignment = await prisma.assignment.update({ where: { id: req.params.id }, data });
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.assignment.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Assignment not found." });
    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.json({ message: "Assignment deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
