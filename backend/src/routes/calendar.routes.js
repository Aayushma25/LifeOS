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

// GET /api/calendar?from=&to=
router.get("/", async (req, res, next) => {
  try {
    const { from, to, type } = req.query;
    const where = {
      userId: req.user.id,
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            startsAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const events = await prisma.calendarEvent.findMany({ where, orderBy: { startsAt: "asc" } });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const event = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json(event);
  } catch (err) {
    next(err);
  }
});

const eventValidators = [
  body("title").trim().notEmpty().withMessage("Title is required."),
  body("startsAt").notEmpty().withMessage("Start date/time is required."),
];

router.post("/", eventValidators, handleValidation, async (req, res, next) => {
  try {
    const { title, description, type, startsAt, endsAt, allDay, location } = req.body;
    const event = await prisma.calendarEvent.create({
      data: {
        userId: req.user.id,
        title,
        description: description || null,
        type: type || "EVENT",
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        allDay: !!allDay,
        location: location || null,
      },
    });
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", eventValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Event not found." });

    const { title, description, type, startsAt, endsAt, allDay, location } = req.body;
    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: {
        title,
        description: description ?? existing.description,
        type: type ?? existing.type,
        startsAt: startsAt ? new Date(startsAt) : existing.startsAt,
        endsAt: endsAt ? new Date(endsAt) : existing.endsAt,
        allDay: allDay !== undefined ? !!allDay : existing.allDay,
        location: location ?? existing.location,
      },
    });
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Event not found." });
    await prisma.calendarEvent.delete({ where: { id: req.params.id } });
    res.json({ message: "Event deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
