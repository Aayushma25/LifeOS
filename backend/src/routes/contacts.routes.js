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

// GET /api/contacts
router.get("/", async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const contacts = await prisma.contact.findMany({
      where: {
        userId: req.user.id,
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { company: { contains: search } },
                { position: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json(contacts);
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/follow-ups - upcoming and overdue follow-ups
router.get("/follow-ups", async (req, res, next) => {
  try {
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const contacts = await prisma.contact.findMany({
      where: { userId: req.user.id, followUpDate: { not: null, lte: weekAhead } },
      orderBy: { followUpDate: "asc" },
    });
    res.json(contacts);
  } catch (err) {
    next(err);
  }
});

const contactValidators = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email").optional({ checkFalsy: true }).isEmail().withMessage("Email must be valid."),
];

router.post("/", contactValidators, handleValidation, async (req, res, next) => {
  try {
    const { name, email, phone, company, position, category, notes, followUpDate } = req.body;
    const contact = await prisma.contact.create({
      data: {
        userId: req.user.id,
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        position: position || null,
        category: category || "OTHER",
        notes: notes || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", contactValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Contact not found." });

    const { name, email, phone, company, position, category, notes, followUpDate } = req.body;
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        position: position || null,
        category: category ?? existing.category,
        notes: notes ?? existing.notes,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Contact not found." });
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ message: "Contact deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
