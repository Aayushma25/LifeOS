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

// GET /api/jobs - list with search/filter/sort
router.get("/", async (req, res, next) => {
  try {
    const { search, status, sortBy = "createdAt", sortDir = "desc" } = req.query;

    const where = {
      userId: req.user.id,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search } },
              { position: { contains: search } },
              { location: { contains: search } },
              { recruiterName: { contains: search } },
            ],
          }
        : {}),
    };

    const allowedSort = ["createdAt", "deadline", "applicationDate", "companyName", "status"];
    const orderBy = { [allowedSort.includes(sortBy) ? sortBy : "createdAt"]: sortDir === "asc" ? "asc" : "desc" };

    const jobs = await prisma.jobApplication.findMany({ where, orderBy });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/stats - dashboard analytics
router.get("/stats", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const grouped = await prisma.jobApplication.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    });

    const counts = grouped.reduce((acc, g) => {
      acc[g.status] = g._count.status;
      return acc;
    }, {});

    const total = await prisma.jobApplication.count({ where: { userId } });

    res.json({
      total,
      applied: counts.APPLIED || 0,
      interviews: (counts.INTERVIEW_SCHEDULED || 0) + (counts.INTERVIEWED || 0),
      offers: counts.OFFER_RECEIVED || 0,
      accepted: counts.ACCEPTED || 0,
      rejected: counts.REJECTED || 0,
      byStatus: counts,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id
router.get("/:id", async (req, res, next) => {
  try {
    const job = await prisma.jobApplication.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!job) return res.status(404).json({ error: "Job application not found." });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

const jobValidators = [
  body("companyName").trim().notEmpty().withMessage("Company name is required."),
  body("position").trim().notEmpty().withMessage("Position is required."),
  body("recruiterEmail").optional({ checkFalsy: true }).isEmail().withMessage("Recruiter email must be valid."),
  body("jobUrl").optional({ checkFalsy: true }).isURL().withMessage("Job URL must be a valid URL."),
];

// POST /api/jobs
router.post("/", jobValidators, handleValidation, async (req, res, next) => {
  try {
    const data = req.body;
    const job = await prisma.jobApplication.create({
      data: {
        userId: req.user.id,
        companyName: data.companyName,
        position: data.position,
        department: data.department || null,
        location: data.location || null,
        salary: data.salary || null,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        recruiterName: data.recruiterName || null,
        recruiterEmail: data.recruiterEmail || null,
        jobUrl: data.jobUrl || null,
        notes: data.notes || null,
        status: data.status || "WISHLIST",
      },
    });
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

// PUT /api/jobs/:id
router.put("/:id", jobValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.jobApplication.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Job application not found." });

    const data = req.body;
    const job = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: {
        companyName: data.companyName,
        position: data.position,
        department: data.department || null,
        location: data.location || null,
        salary: data.salary || null,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        recruiterName: data.recruiterName || null,
        recruiterEmail: data.recruiterEmail || null,
        jobUrl: data.jobUrl || null,
        notes: data.notes || null,
        status: data.status,
      },
    });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.jobApplication.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Job application not found." });
    await prisma.jobApplication.delete({ where: { id: req.params.id } });
    res.json({ message: "Job application deleted." });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/export/csv
router.get("/export/csv", async (req, res, next) => {
  try {
    const jobs = await prisma.jobApplication.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" } });
    const headers = ["Company", "Position", "Department", "Location", "Salary", "Application Date", "Deadline", "Status", "Recruiter Name", "Recruiter Email", "Job URL", "Notes"];
    const rows = jobs.map((j) => [
      j.companyName, j.position, j.department || "", j.location || "", j.salary || "",
      j.applicationDate ? j.applicationDate.toISOString().slice(0, 10) : "",
      j.deadline ? j.deadline.toISOString().slice(0, 10) : "",
      j.status, j.recruiterName || "", j.recruiterEmail || "", j.jobUrl || "", (j.notes || "").replace(/\n/g, " "),
    ]);

    const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=job-applications.csv");
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
