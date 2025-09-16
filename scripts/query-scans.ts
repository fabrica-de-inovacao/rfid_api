import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  // Buscar os 20 scans mais recentes com info de tag e scanner
  const scans = await prisma.scans.findMany({
    orderBy: { created_at: "desc" },
    take: 20,
    include: {
      tags: true,
      scanners: true,
    },
  });

  console.log("\nÚltimos 20 scans (mais recentes primeiro)");
  console.log("----------------------------------------");
  for (const s of scans) {
    const tagCode = s.tags?.tag_id ?? "—";
    const scannerName = s.scanners?.name ?? "—";
    console.log(
      `${s.created_at.toISOString()} | scan_id=${
        s.id
      } | tag=${tagCode} | scanner=${scannerName}`
    );
  }

  // Mostrar o último scan por tag (agregação)
  const lastByTag = await prisma.scans.groupBy({
    by: ["tag_id"],
    _max: { created_at: true },
  });

  console.log("\nÚltimo scan por tag");
  console.log("-------------------");
  for (const row of lastByTag) {
    const tag = await prisma.tags.findUnique({ where: { id: row.tag_id } });
    console.log(
      `tag=${
        tag?.tag_id ?? row.tag_id
      } | last_seen=${row._max?.created_at?.toISOString()}`
    );
  }
}

main()
  .catch((e) => {
    console.error("Erro ao consultar scans:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
