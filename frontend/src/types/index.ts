export type Role = "ADMIN" | "USER";

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export type JobStatus =
  | "WISHLIST"
  | "APPLIED"
  | "ASSESSMENT"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWED"
  | "OFFER_RECEIVED"
  | "REJECTED"
  | "ACCEPTED";

export interface JobApplication {
  id: string;
  companyName: string;
  position: string;
  department?: string | null;
  location?: string | null;
  salary?: string | null;
  applicationDate?: string | null;
  deadline?: string | null;
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  jobUrl?: string | null;
  notes?: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  tags: string;
  isPinned: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  labels: string;
  parentId?: string | null;
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export type EventType = "EVENT" | "DEADLINE" | "EXAM" | "INTERVIEW" | "MEETING";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type: EventType;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  location?: string | null;
}

export interface DashboardData {
  now: string;
  upcomingTasks: Task[];
  upcomingEvents: CalendarEvent[];
  recentNotes: Note[];
  jobSummary: { total: number; applied: number; interviews: number; offers: number };
  taskSummary: { total: number; pending: number; inProgress: number; completed: number };
  upcomingAssignments: Assignment[];
  upcomingExams: Exam[];
  activeGoals: Goal[];
  expenseSummary: { income: number; expense: number; net: number };
  upcomingFollowUps: Contact[];
  habitCount: number;
}

// ===================== PHASE 2 =====================

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  instructor?: string | null;
  credits: number;
  semester?: string | null;
  color: string;
  grade?: string | null;
  _count?: { assignments: number; exams: number; attendance: number; flashcards: number };
  assignments?: Assignment[];
  exams?: Exam[];
  studySessions?: StudySession[];
  attendance?: AttendanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED";

export interface Assignment {
  id: string;
  title: string;
  subjectId?: string | null;
  subject?: { id: string; name: string; color: string } | null;
  deadline?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: AssignmentStatus;
  submissionDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type ExamType = "QUIZ" | "MIDTERM" | "FINAL" | "PRACTICAL" | "OTHER";

export interface Exam {
  id: string;
  title: string;
  subjectId?: string | null;
  subject?: { id: string; name: string; color: string } | null;
  type: ExamType;
  date: string;
  notes?: string | null;
}

export interface StudySession {
  id: string;
  subjectId?: string | null;
  subject?: { id: string; name: string; color: string } | null;
  date: string;
  durationMinutes: number;
  notes?: string | null;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  status: AttendanceStatus;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subjectId?: string | null;
  subject?: { id: string; name: string; color: string } | null;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt?: string | null;
  createdAt: string;
}

export type GoalTerm = "SHORT_TERM" | "LONG_TERM";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  dueDate?: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  term: GoalTerm;
  status: GoalStatus;
  targetDate?: string | null;
  progressPercent: number;
  milestones: Milestone[];
  createdAt: string;
}

// ===================== PHASE 3 =====================

export interface VaultEntryMeta {
  id: string;
  website: string;
  username?: string | null;
  hasNotes: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultRevealResult {
  password: string;
  notes: string | null;
}

export interface HashResult {
  hashes: { md5: string; sha1: string; sha256: string; sha512: string };
  byteLength: number;
  fileName: string | null;
}

export type LogType = "LINUX_AUTH" | "WEB_ACCESS" | "GENERIC";
export type IpFlag = "BRUTE_FORCE" | "SUSPICIOUS" | "NORMAL";

export interface IpBreakdownEntry {
  ip: string;
  total: number;
  failed: number;
  successful: number;
  flag: IpFlag;
}

export interface LogAnalysisSummary {
  id: string;
  fileName: string;
  logType: LogType;
  totalLines: number;
  totalEvents: number;
  failedEvents: number;
  uniqueIps: number;
  createdAt: string;
}

export interface LogAnalysisDetail extends LogAnalysisSummary {
  ipBreakdown: IpBreakdownEntry[];
  sampleEvents: string[];
}

// ===================== PHASE 4 =====================

export type TransactionType = "INCOME" | "EXPENSE";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
}

export interface BudgetComparison {
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  overBudget: boolean;
}

export interface ExpenseSummary {
  income: number;
  expense: number;
  net: number;
  byCategory: Record<string, number>;
  budgetComparison: BudgetComparison[];
}

export interface MonthlyExpensePoint {
  label: string;
  income: number;
  expense: number;
}

export type HabitFrequency = "DAILY" | "WEEKLY";

export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  color: string;
  streak: number;
  completionRate: number;
  completedToday: boolean;
  history: { date: string; completed: boolean }[];
}

export type ContactCategory = "RECRUITER" | "CLIENT" | "NETWORKING" | "OTHER";

export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  category: ContactCategory;
  notes?: string | null;
  followUpDate?: string | null;
  createdAt: string;
}

export interface AnalyticsOverview {
  jobsByStatus: { status: string; count: number }[];
  studyHoursByWeek: { week: string; hours: number }[];
  habitStreaks: { name: string; streak: number; completionRate: number }[];
  expenseReport: { label: string; income: number; expense: number }[];
  goalProgress: { title: string; progress: number; term: string }[];
  productivityTrend: { day: string; completed: number }[];
}
