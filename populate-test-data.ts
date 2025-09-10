// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// async function populateTestData() {
//   try {
//     console.log("🔍 Verificando dados existentes...");

//     // Verificar dados existentes
//     const existingScans = await prisma.scans.count();
//     const existingScanners = await prisma.scanners.count();
//     const existingTags = await prisma.tags.count();
//     const existingSafekeepings = await prisma.safekeepings.count();

//     console.log(`📊 Dados atuais:`);
//     console.log(`  - Scans: ${existingScans}`);
//     console.log(`  - Scanners: ${existingScanners}`);
//     console.log(`  - Tags: ${existingTags}`);
//     console.log(`  - Safekeepings: ${existingSafekeepings}`);

//     // Se não houver safekeepings, criar um
//     let safekeepingId: string;
//     if (existingSafekeepings === 0) {
//       console.log("📦 Criando safekeeping de teste...");
//       const safekeeping = await prisma.safekeepings.create({
//         data: {
//           name: "Cofre Principal - Teste",
//           location: "Sala de Evidências",
//           temperature: 22.5,
//           humidity: 45.0,
//           status: "ACTIVE",
//         },
//       });
//       safekeepingId = safekeeping.id;
//       console.log(
//         `✅ Safekeeping criado: ${safekeeping.name} (${safekeepingId})`
//       );
//     } else {
//       const safekeeping = await prisma.safekeepings.findFirst();
//       safekeepingId = safekeeping!.id;
//       console.log(`✅ Usando safekeeping existente: ${safekeepingId}`);
//     }

//     // Se não houver scanners, criar alguns
//     if (existingScanners === 0) {
//       console.log("📡 Criando scanners de teste...");

//       const scanner1 = await prisma.scanners.create({
//         data: {
//           name: "Scanner Entrada",
//           mac_address: "00:11:22:33:44:55",
//           safekeeping_id: safekeepingId,
//           status: "ONLINE",
//           last_scan: new Date(),
//         },
//       });

//       const scanner2 = await prisma.scanners.create({
//         data: {
//           name: "Scanner Saída",
//           mac_address: "00:11:22:33:44:66",
//           safekeeping_id: safekeepingId,
//           status: "ONLINE",
//           last_scan: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
//         },
//       });

//       console.log(`✅ Scanners criados:`);
//       console.log(`  - ${scanner1.name} (${scanner1.id})`);
//       console.log(`  - ${scanner2.name} (${scanner2.id})`);
//     }

//     // Se não houver tags, criar algumas
//     if (existingTags === 0) {
//       console.log("🏷️ Criando tags de teste...");

//       const tag1 = await prisma.tags.create({
//         data: {
//           uid: "TAG001",
//           tag_type: "item",
//           status: "ACTIVE",
//         },
//       });

//       const tag2 = await prisma.tags.create({
//         data: {
//           uid: "TAG002",
//           tag_type: "item",
//           status: "ACTIVE",
//         },
//       });

//       const tag3 = await prisma.tags.create({
//         data: {
//           uid: "USER001",
//           tag_type: "user",
//           status: "ACTIVE",
//         },
//       });

//       console.log(`✅ Tags criadas:`);
//       console.log(`  - ${tag1.uid} (${tag1.id})`);
//       console.log(`  - ${tag2.uid} (${tag2.id})`);
//       console.log(`  - ${tag3.uid} (${tag3.id})`);
//     }

//     // Se não houver scans, criar alguns
//     if (existingScans === 0) {
//       console.log("🔍 Criando scans de teste...");

//       const scanners = await prisma.scanners.findMany();
//       const tags = await prisma.tags.findMany();

//       if (scanners.length > 0 && tags.length > 0) {
//         // Criar scans dos últimos dias
//         const scansToCreate = [];

//         for (let i = 0; i < 10; i++) {
//           const randomScanner =
//             scanners[Math.floor(Math.random() * scanners.length)];
//           const randomTag = tags[Math.floor(Math.random() * tags.length)];
//           const scanTime = new Date(Date.now() - i * 60 * 60 * 1000); // i horas atrás

//           scansToCreate.push({
//             scanner_id: randomScanner.id,
//             tag_id: randomTag.id,
//             created_at: scanTime,
//           });
//         }

//         await prisma.scans.createMany({
//           data: scansToCreate,
//         });

//         console.log(`✅ ${scansToCreate.length} scans criados`);
//       }
//     }

//     // Verificar dados finais
//     const finalScans = await prisma.scans.count();
//     const finalScanners = await prisma.scanners.count();
//     const finalTags = await prisma.tags.count();
//     const finalSafekeepings = await prisma.safekeepings.count();

//     console.log(`\n📊 Dados finais:`);
//     console.log(`  - Scans: ${finalScans}`);
//     console.log(`  - Scanners: ${finalScanners}`);
//     console.log(`  - Tags: ${finalTags}`);
//     console.log(`  - Safekeepings: ${finalSafekeepings}`);

//     console.log("\n✅ Dados de teste populados com sucesso!");
//   } catch (error) {
//     console.error("❌ Erro ao popular dados de teste:", error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// populateTestData();
