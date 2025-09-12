import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPendingScanners() {
  try {
    const pendingScanners = await prisma.pending_scanners.findMany();
    console.log("Scanners pendentes encontrados:", pendingScanners);

    const scanners = await prisma.scanners.findMany();
    console.log("Scanners registrados:", scanners);
  } catch (error) {
    console.error("Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingScanners();
