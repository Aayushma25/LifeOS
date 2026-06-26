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

// GET /api/notes
router.get("/", async (req, res, next) => {
  try {
    const { search, category, archived, favorite } = req.query;
    const where = {
      userId: req.user.id,
      isArchived: archived === "true" ? true : archived === "false" ? false : undefined,
      isFavorite: favorite === "true" ? true : undefined,
      ...(category ? { category } : {}),
      ...(search
        ? { OR: [{ title: { contains: search } }, { content: { contains: search } }, { tags: { contains: search } }] }
        : {}),
    };

    const notes = await prisma.note.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!note) return res.status(404).json({ error: "Note not found." });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

const noteValidators = [body("title").trim().notEmpty().withMessage("Title is required.")];

router.post("/", noteValidators, handleValidation, async (req, res, next) => {
  try {
    const { title, content = "", category, tags = "" } = req.body;
    const note = await prisma.note.create({
      data: { userId: req.user.id, title, content, category: category || null, tags },
    });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", noteValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Note not found." });

    const { title, content, category, tags, isPinned, isArchived, isFavorite } = req.body;
    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: {
        title,
        content: content ?? existing.content,
        category: category ?? existing.category,
        tags: tags ?? existing.tags,
        ...(isPinned !== undefined && { isPinned }),
        ...(isArchived !== undefined && { isArchived }),
        ...(isFavorite !== undefined && { isFavorite }),
      },
    });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notes/:id/toggle - quick toggle pin/archive/favorite
router.patch("/:id/toggle", async (req, res, next) => {
  try {
    const { field } = req.body; // "isPinned" | "isArchived" | "isFavorite"
    if (!["isPinned", "isArchived", "isFavorite"].includes(field)) {
      return res.status(400).json({ error: "Invalid field to toggle." });
    }
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Note not found." });

    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: { [field]: !existing[field] },
    });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Note not found." });
    await prisma.note.delete({ where: { id: req.params.id } });
    res.json({ message: "Note deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
