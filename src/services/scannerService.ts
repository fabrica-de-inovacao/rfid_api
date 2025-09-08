import { db } from "../config/database";
import { ScannerReportData } from "../types";

export class ScannerService {
  async processScannerReport(reportData: ScannerReportData) {
    const { mac_address } = reportData;

    // Verificar se o scanner existe
    const scanner = await db.scanners.findUnique({
      where: { mac_address },
      include: {
        safekeepings: true,
      },
    });

    if (!scanner) {
      throw new Error("Scanner não encontrado");
    }

    // Atualizar último scan do scanner
    await db.scanners.update({
      where: { id: scanner.id },
      data: {
        last_scan: new Date(),
        status: "ativo",
      },
    });

    // Extrair tags do formato correto
    let tagsToProcess: string[] = [];

    if (reportData.tag_reads) {
      // Formato novo com tag_reads
      tagsToProcess = reportData.tag_reads.map((read) => read.tag_id);
      console.log(
        `Processando ${reportData.tag_reads.length} tag reads do formato novo`
      );
    } else if (reportData.tags) {
      // Formato antigo com tags
      tagsToProcess = reportData.tags;
      console.log(
        `Processando ${reportData.tags.length} tags do formato antigo`
      );
    }

    // Processar cada tag detectada
    const results = [];

    for (const tagUid of tagsToProcess) {
      try {
        // Buscar a tag na base de dados
        const tag = await db.tags.findUnique({
          where: { tag_id: tagUid },
          include: {
            evidences: {
              include: {
                safekeepings: true,
                users: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (tag && tag.evidences) {
          // Registar o scan
          await db.scans.create({
            data: {
              scanner_id: scanner.id,
              tag_id: tag.id,
            },
          });

          // Verificar se a prova está na custódia correta
          const evidence = tag.evidences;
          const isInCorrectSafekeeping =
            evidence.safekeeping_id === scanner.safekeeping_id;

          if (!isInCorrectSafekeeping) {
            // Prova detectada fora da custódia correta
            await this.updateEvidenceStatus(evidence.id, "Fora da Custódia");
          } else {
            // Prova na custódia correta
            await this.updateEvidenceStatus(evidence.id, "Em Custódia");
          }

          results.push({
            tag_uid: tagUid,
            evidence: {
              id: evidence.id,
              name: evidence.name,
              status: isInCorrectSafekeeping
                ? "Em Custódia"
                : "Fora da Custódia",
              safekeeping: evidence.safekeepings?.name,
              registered_by: evidence.users.name,
            },
            scanner: {
              name: scanner.name,
              safekeeping: scanner.safekeepings?.name,
            },
            alert: !isInCorrectSafekeeping,
          });
        } else {
          // Tag não encontrada ou não vinculada a uma prova
          results.push({
            tag_uid: tagUid,
            evidence: null,
            scanner: {
              name: scanner.name,
              safekeeping: scanner.safekeepings?.name,
            },
            alert: false,
          });
        }
      } catch (error) {
        console.error(`Erro ao processar tag ${tagUid}:`, error);
      }
    }

    return {
      scanner: {
        name: scanner.name,
        safekeeping: scanner.safekeepings?.name,
      },
      tags_processed: results,
      timestamp: new Date(),
    };
  }

  private async updateEvidenceStatus(evidenceId: string, status: string) {
    await db.evidences.update({
      where: { id: evidenceId },
      data: {
        status,
        updated_at: new Date(),
      },
    });
  }

  async getScannerStatus() {
    const scanners = await db.scanners.findMany({
      include: {
        safekeepings: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return scanners.map((scanner: any) => ({
      id: scanner.id,
      name: scanner.name,
      mac_address: scanner.mac_address,
      status: scanner.status,
      last_scan: scanner.last_scan,
      safekeeping: scanner.safekeepings,
    }));
  }

  async getRecentScans(limit = 100) {
    const scans = await db.scans.findMany({
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        scanners: {
          select: {
            name: true,
            mac_address: true,
          },
        },
        tags: {
          select: {
            tag_id: true,
          },
        },
      },
    });

    return scans.map((scan: any) => ({
      id: scan.id,
      scanner: scan.scanners,
      tag: scan.tags,
      created_at: scan.created_at,
    }));
  }
}
