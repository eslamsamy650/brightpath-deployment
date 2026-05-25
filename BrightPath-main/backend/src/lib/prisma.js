const { PrismaClient } = require('@prisma/client');
const { env } = require('../config/env');

/** @type {PrismaClient | undefined} */
let prisma;

function createPrismaClient() {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function getPrisma() {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

async function connectDatabase() {
  const client = getPrisma();
  await client.$connect();
}

async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}

module.exports = {
  getPrisma,
  connectDatabase,
  disconnectDatabase,
};
