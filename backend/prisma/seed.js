const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      fullName: "Demo User",
      username: "demo",
      email: "demo@lifeos.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.jobApplication.createMany({
    data: [
      {
        userId: user.id,
        companyName: "Acme Corp",
        position: "Frontend Engineer",
        location: "Remote",
        status: "APPLIED",
        applicationDate: new Date(),
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        companyName: "Globex",
        position: "Security Analyst Intern",
        location: "Amsterdam, NL",
        status: "INTERVIEW_SCHEDULED",
        applicationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.note.createMany({
    data: [
      { userId: user.id, title: "Welcome to LifeOS", content: "This is your first note. Edit or delete it anytime.", category: "General", isPinned: true },
    ],
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      title: "Set up LifeOS",
      description: "Explore the dashboard, jobs tracker, notes, tasks, and calendar.",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
    },
  });

  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: "Mock interview practice",
      type: "INTERVIEW",
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const subject = await prisma.subject.create({
    data: {
      userId: user.id,
      name: "Network Security",
      code: "CYB-301",
      instructor: "Dr. Okafor",
      credits: 4,
      semester: "Spring 2026",
      color: "#5B8FCB",
    },
  });

  await prisma.assignment.create({
    data: {
      userId: user.id,
      subjectId: subject.id,
      title: "Firewall configuration lab report",
      deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      priority: "HIGH",
      status: "IN_PROGRESS",
    },
  });

  await prisma.exam.create({
    data: {
      userId: user.id,
      subjectId: subject.id,
      title: "Midterm exam",
      type: "MIDTERM",
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.flashcard.createMany({
    data: [
      { userId: user.id, subjectId: subject.id, front: "What does CIA stand for in security?", back: "Confidentiality, Integrity, Availability" },
      { userId: user.id, subjectId: subject.id, front: "What port does HTTPS use?", back: "443" },
    ],
  });

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Land a cybersecurity internship",
      description: "Apply broadly, build a portfolio, and practice interviewing.",
      term: "SHORT_TERM",
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.milestone.createMany({
    data: [
      { goalId: goal.id, title: "Update resume and LinkedIn" },
      { goalId: goal.id, title: "Apply to 10 internships" },
      { goalId: goal.id, title: "Complete 2 mock interviews" },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, type: "INCOME", amount: 1200, category: "Income", description: "Part-time job", date: new Date() },
      { userId: user.id, type: "EXPENSE", amount: 450, category: "Rent", date: new Date() },
      { userId: user.id, type: "EXPENSE", amount: 60, category: "Food", date: new Date() },
    ],
  });

  await prisma.budget.create({ data: { userId: user.id, category: "Food", monthlyLimit: 200 } });

  const habit = await prisma.habit.create({
    data: { userId: user.id, name: "Study for 25 minutes", frequency: "DAILY", color: "#5B8FCB" },
  });
  await prisma.habitLog.create({ data: { habitId: habit.id, userId: user.id, date: new Date(new Date().setHours(0, 0, 0, 0)), completed: true } });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Jordan Avery",
      email: "jordan.avery@globex.example",
      company: "Globex",
      position: "Technical Recruiter",
      category: "RECRUITER",
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed complete. Login with username 'demo' / password 'Password123!'");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
