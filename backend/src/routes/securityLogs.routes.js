const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { analyzeLog } = require("../utils/logAnalyzer");

const router = express.Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5MB of log text is plenty for a local tool

// GET /api/security-logs - history of past analyses (summary only)
router.get("/", async (req, res, next) => {
  try {
    const analyses = await prisma.logAnalysis.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        logType: true,
        totalLines: true,
        totalEvents: true,
        failedEvents: true,
        uniqueIps: true,
        createdAt: true,
      },
    });
    res.json(analyses);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const analysis = await prisma.logAnalysis.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!analysis) return res.status(404).json({ error: "Analysis not found." });
    res.json({
      ...analysis,
      ipBreakdown: JSON.parse(analysis.ipBreakdown),
      sampleEvents: JSON.parse(analysis.sampleEvents),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/security-logs/analyze
router.post(
  "/analyze",
  [
    body("content").isString().notEmpty().withMessage("Log content is required."),
    body("fileName").optional().isString(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { content, fileName } = req.body;
      if (content.length > MAX_CONTENT_LENGTH) {
        return res.status(413).json({ error: "Log content is too large. Try a smaller file or a recent excerpt." });
      }

      const result = analyzeLog(content);

      const saved = await prisma.logAnalysis.create({
        data: {
          userId: req.user.id,
          fileName: fileName || "pasted-log.txt",
          logType: result.logType,
          totalLines: result.totalLines,
          totalEvents: result.totalEvents,
          failedEvents: result.failedEvents,
          uniqueIps: result.uniqueIps,
          ipBreakdown: JSON.stringify(result.ipBreakdown),
          sampleEvents: JSON.stringify(result.sampleEvents),
        },
      });

      res.status(201).json({ ...saved, ipBreakdown: result.ipBreakdown, sampleEvents: result.sampleEvents });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/security-logs/:id/export/csv
router.get("/:id/export/csv", async (req, res, next) => {
  try {
    const analysis = await prisma.logAnalysis.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!analysis) return res.status(404).json({ error: "Analysis not found." });

    const ipBreakdown = JSON.parse(analysis.ipBreakdown);
    const headers = ["IP Address", "Total Events", "Failed", "Successful", "Flag"];
    const rows = ipBreakdown.map((s) => [s.ip, s.total, s.failed, s.successful, s.flag]);
    const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=log-analysis-${analysis.id.slice(0, 8)}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.logAnalysis.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Analysis not found." });
    await prisma.logAnalysis.delete({ where: { id: req.params.id } });
    res.json({ message: "Analysis deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
