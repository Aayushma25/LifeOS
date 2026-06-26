require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth.routes");
const jobsRoutes = require("./routes/jobs.routes");
const notesRoutes = require("./routes/notes.routes");
const tasksRoutes = require("./routes/tasks.routes");
const calendarRoutes = require("./routes/calendar.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const subjectsRoutes = require("./routes/subjects.routes");
const assignmentsRoutes = require("./routes/assignments.routes");
const examsRoutes = require("./routes/exams.routes");
const studySessionsRoutes = require("./routes/studySessions.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const flashcardsRoutes = require("./routes/flashcards.routes");
const goalsRoutes = require("./routes/goals.routes");
const vaultRoutes = require("./routes/vault.routes");
const hashToolsRoutes = require("./routes/hashTools.routes");
const securityLogsRoutes = require("./routes/securityLogs.routes");
const expensesRoutes = require("./routes/expenses.routes");
const habitsRoutes = require("./routes/habits.routes");
const contactsRoutes = require("./routes/contacts.routes");
const analyticsRoutes = require("./routes/analytics.routes");

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "35mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/exams", examsRoutes);
app.use("/api/study-sessions", studySessionsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/flashcards", flashcardsRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/vault", vaultRoutes);
app.use("/api/hash-tools", hashToolsRoutes);
app.use("/api/security-logs", securityLogsRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found." }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`LifeOS backend running at http://localhost:${PORT}`);
});
