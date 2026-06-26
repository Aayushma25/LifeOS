const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/analytics/overview - everything the Analytics Dashboard needs in one call
router.get("/overview", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // ---- Job application pipeline ----
    const jobsByStatusRaw = await prisma.jobApplication.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    });
    const jobsByStatus = jobsByStatusRaw.map((g) => ({ status: g.status, count: g._count.status }));

    // ---- Study hours over the last 8 weeks ----
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
    const studySessions = await prisma.studySession.findMany({
      where: { userId, date: { gte: eightWeeksAgo } },
      select: { date: true, durationMinutes: true },
    });

    const weekBuckets = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfDay(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
      weekBuckets.push({ weekStart, label: `Wk of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, minutes: 0 });
    }
    for (const s of studySessions) {
      const d = new Date(s.date).getTime();
      for (let i = weekBuckets.length - 1; i >= 0; i--) {
        const start = weekBuckets[i].weekStart.getTime();
        const end = start + 7 * 24 * 60 * 60 * 1000;
        if (d >= start && d < end) {
          weekBuckets[i].minutes += s.durationMinutes;
          break;
        }
      }
    }
    const studyHoursByWeek = weekBuckets.map(({ label, minutes }) => ({ week: label, hours: Number((minutes / 60).toFixed(1)) }));

    // ---- Habit streaks ----
    const habits = await prisma.habit.findMany({ where: { userId } });
    const thirtyDaysAgo = startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const habitLogs = await prisma.habitLog.findMany({ where: { userId, date: { gte: thirtyDaysAgo } } });

    const habitStreaks = habits.map((habit) => {
      const logs = habitLogs.filter((l) => l.habitId === habit.id);
      const completed = logs.filter((l) => l.completed).length;
      const daySet = new Set(logs.filter((l) => l.completed).map((l) => startOfDay(l.date).getTime()));
      let streak = 0;
      let cursor = startOfDay(now);
      if (!daySet.has(cursor.getTime())) cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      while (daySet.has(cursor.getTime())) {
        streak++;
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      }
      return { name: habit.name, streak, completionRate: logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0 };
    });

    // ---- Expense reports (last 6 months) ----
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const transactions = await prisma.transaction.findMany({ where: { userId, date: { gte: sixMonthsAgo } } });
    const monthBuckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), income: 0, expense: 0 });
    }
    const monthMap = new Map(monthBuckets.map((b) => [b.key, b]));
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = monthMap.get(key);
      if (!bucket) continue;
      if (t.type === "INCOME") bucket.income += t.amount;
      else bucket.expense += t.amount;
    }
    const expenseReport = monthBuckets.map(({ key, ...rest }) => rest);

    // ---- Goal progress ----
    const goals = await prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { targetDate: "asc" }, take: 8 });
    const goalProgress = goals.map((g) => ({ title: g.title, progress: g.progressPercent, term: g.term }));

    // ---- Productivity trend: tasks completed per day, last 14 days ----
    const fourteenDaysAgo = startOfDay(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
    const tasks = await prisma.task.findMany({
      where: { userId, status: "COMPLETED", updatedAt: { gte: fourteenDaysAgo } },
      select: { updatedAt: true },
    });
    const dayBuckets = [];
    for (let i = 13; i >= 0; i--) {
      const d = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      dayBuckets.push({ key: d.getTime(), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), completed: 0 });
    }
    const dayMap = new Map(dayBuckets.map((b) => [b.key, b]));
    for (const t of tasks) {
      const key = startOfDay(t.updatedAt).getTime();
      const bucket = dayMap.get(key);
      if (bucket) bucket.completed++;
    }
    const productivityTrend = dayBuckets.map(({ label, completed }) => ({ day: label, completed }));

    res.json({
      jobsByStatus,
      studyHoursByWeek,
      habitStreaks,
      expenseReport,
      goalProgress,
      productivityTrend,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
