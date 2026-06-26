const { PrismaClient } = require("@prisma/client");

// Single shared Prisma instance
const prisma = new PrismaClient();

module.exports = prisma;
