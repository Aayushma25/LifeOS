const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard - aggregated summary for the main dashboard
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      upcomingTasks,
      upcomingEvents,
      recentNotes,
      jobStatsRaw,
      taskStatsRaw,
      upcomingAssignments,
      upcomingExams,
      activeGoals,
      monthTransactions,
      upcomingFollowUps,
      habits,
    ] = await Promise.all([
      prisma.task.findMany({
        where: { userId, status: { not: "COMPLETED" }, dueDate: { not: null, lte: weekAhead } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.calendarEvent.findMany({
        where: { userId, startsAt: { gte: now, lte: weekAhead } },
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
      prisma.note.findMany({
        where: { userId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.jobApplication.groupBy({ by: ["status"], where: { userId }, _count: { status: true } }),
      prisma.task.groupBy({ by: ["status"], where: { userId }, _count: { status: true } }),
      prisma.assignment.findMany({
        where: { userId, status: { not: "GRADED" }, deadline: { not: null, lte: weekAhead } },
        include: { subject: { select: { name: true, color: true } } },
        orderBy: { deadline: "asc" },
        take: 5,
      }),
      prisma.exam.findMany({
        where: { userId, date: { gte: now, lte: weekAhead } },
        include: { subject: { select: { name: true, color: true } } },
        orderBy: { date: "asc" },
        take: 5,
      }),
      prisma.goal.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { targetDate: "asc" },
        take: 5,
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
      prisma.contact.findMany({
        where: { userId, followUpDate: { not: null, lte: weekAhead } },
        orderBy: { followUpDate: "asc" },
        take: 5,
      }),
      prisma.habit.findMany({ where: { userId } }),
    ]);

    const jobCounts = jobStatsRaw.reduce((acc, g) => ({ ...acc, [g.status]: g._count.status }), {});
    const taskCounts = taskStatsRaw.reduce((acc, g) => ({ ...acc, [g.status]: g._count.status }), {});

    const monthIncome = monthTransactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTransactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

    const todayHabitsDue = habits.length;

    res.json({
      now: now.toISOString(),
      upcomingTasks,
      upcomingEvents,
      recentNotes,
      jobSummary: {
        total: Object.values(jobCounts).reduce((a, b) => a + b, 0),
        applied: jobCounts.APPLIED || 0,
        interviews: (jobCounts.INTERVIEW_SCHEDULED || 0) + (jobCounts.INTERVIEWED || 0),
        offers: jobCounts.OFFER_RECEIVED || 0,
      },
      taskSummary: {
        total: Object.values(taskCounts).reduce((a, b) => a + b, 0),
        pending: taskCounts.PENDING || 0,
        inProgress: taskCounts.IN_PROGRESS || 0,
        completed: taskCounts.COMPLETED || 0,
      },
      upcomingAssignments,
      upcomingExams,
      activeGoals,
      expenseSummary: { income: monthIncome, expense: monthExpense, net: monthIncome - monthExpense },
      upcomingFollowUps,
      habitCount: todayHabitsDue,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
