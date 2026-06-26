import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import JobsPage from "./pages/jobs/JobsPage";
import NotesPage from "./pages/notes/NotesPage";
import TasksPage from "./pages/tasks/TasksPage";
import CalendarPage from "./pages/calendar/CalendarPage";
import StudyPage from "./pages/study/StudyPage";
import AssignmentsPage from "./pages/assignments/AssignmentsPage";
import FlashcardsPage from "./pages/flashcards/FlashcardsPage";
import GoalsPage from "./pages/goals/GoalsPage";
import VaultPage from "./pages/vault/VaultPage";
import HashToolsPage from "./pages/hashtools/HashToolsPage";
import SecurityLogsPage from "./pages/securitylogs/SecurityLogsPage";
import ExpensesPage from "./pages/expenses/ExpensesPage";
import HabitsPage from "./pages/habits/HabitsPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="study" element={<StudyPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="flashcards" element={<FlashcardsPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="vault" element={<VaultPage />} />
            <Route path="hash-tools" element={<HashToolsPage />} />
            <Route path="security-logs" element={<SecurityLogsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
