import { db } from "../config/database";
import { ScannerReportData } from "../types";

export interface CreateScannerData {
  name: string;
  mac_address: string;
  safekeeping_id?: string;
  description?: string;
}

export interface UpdateScannerData {
  name?: string;
  safekeeping_id?: string;
  description?: string;
  status?: string;
}

export interface PendingScannerData {
  mac_address: string;
  first_seen: Date;
  last_seen: Date;
  scan_count: number;
  suggested_name?: string;
}

export class ScannerService {
  async processScannerReport(reportData: ScannerReportData) {
    const { mac_address } = reportData;

    // Verificar se o scanner existe
    const scanner = await db.scanners.findUnique({
      where: { mac_address: mac_address.toUpperCase() },
      include: {
        safekeepings: true,
      },
    });

    if (!scanner) {
      // Auto-descoberta: Scanner desconhecido
      console.log(
        `[ScannerService] Scanner desconhecido detectado: ${mac_address}`
      );
      const unknownScannerInfo = await this.registerUnknownScanner(mac_address);

      throw new Error(`Scanner não registrado. ${unknownScannerInfo.message}`);
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
    console.log("[ScannerService] Buscando scanners...");
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

    console.log(
      `[ScannerService] Encontrados ${scanners.length} scanners no banco`
    );

    const result = scanners.map((scanner: any) => ({
      id: scanner.id,
      name: scanner.name,
      mac_address: scanner.mac_address,
      status: scanner.status,
      last_scan: scanner.last_scan,
      safekeeping: scanner.safekeepings,
    }));

    console.log("[ScannerService] Resultado formatado:", result);
    return result;
  }

  async getRecentScans(limit = 100) {
    console.log(
      `[ScannerService] Buscando scans recentes com limite: ${limit}`
    );
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

    console.log(`[ScannerService] Encontrados ${scans.length} scans no banco`);

    const result = scans.map((scan: any) => ({
      id: scan.id,
      scanner: scan.scanners,
      tag: scan.tags,
      created_at: scan.created_at,
    }));

    console.log("[ScannerService] Resultado formatado:", result);
    return result;
  }

  // ========== MÉTODOS DE GERENCIAMENTO DE SCANNERS ==========

  /**
   * Criar um novo scanner
   */
  async createScanner(data: CreateScannerData) {
    console.log(`[ScannerService] Criando scanner: ${data.name}`);

    // Verificar se MAC address já existe
    const existingScanner = await db.scanners.findUnique({
      where: { mac_address: data.mac_address },
    });

    if (existingScanner) {
      throw new Error(`Scanner com MAC address ${data.mac_address} já existe`);
    }

    // Verificar se nome já existe
    const existingName = await db.scanners.findUnique({
      where: { name: data.name },
    });

    if (existingName) {
      throw new Error(`Scanner com nome '${data.name}' já existe`);
    }

    // Verificar se safekeeping existe (se fornecido)
    if (data.safekeeping_id) {
      const safekeeping = await db.safekeepings.findUnique({
        where: { id: data.safekeeping_id },
      });

      if (!safekeeping) {
        throw new Error(
          `Custódia com ID ${data.safekeeping_id} não encontrada`
        );
      }
    }

    const scanner = await db.scanners.create({
      data: {
        name: data.name,
        mac_address: data.mac_address.toUpperCase(),
        safekeeping_id: data.safekeeping_id,
        status: "OFFLINE",
        last_scan: null,
      },
      include: {
        safekeepings: true,
      },
    });

    console.log(`[ScannerService] Scanner criado: ${scanner.id}`);
    return scanner;
  }

  /**
   * Atualizar um scanner existente
   */
  async updateScanner(id: string, data: UpdateScannerData) {
    console.log(`[ScannerService] Atualizando scanner: ${id}`);

    // Verificar se scanner existe
    const existingScanner = await db.scanners.findUnique({
      where: { id },
    });

    if (!existingScanner) {
      throw new Error(`Scanner com ID ${id} não encontrado`);
    }

    // Verificar se novo nome já existe (se fornecido)
    if (data.name && data.name !== existingScanner.name) {
      const existingName = await db.scanners.findUnique({
        where: { name: data.name },
      });

      if (existingName) {
        throw new Error(`Scanner com nome '${data.name}' já existe`);
      }
    }

    // Verificar se safekeeping existe (se fornecido)
    if (data.safekeeping_id) {
      const safekeeping = await db.safekeepings.findUnique({
        where: { id: data.safekeeping_id },
      });

      if (!safekeeping) {
        throw new Error(
          `Custódia com ID ${data.safekeeping_id} não encontrada`
        );
      }
    }

    const scanner = await db.scanners.update({
      where: { id },
      data,
      include: {
        safekeepings: true,
      },
    });

    console.log(`[ScannerService] Scanner atualizado: ${scanner.id}`);
    return scanner;
  }

  /**
   * Deletar um scanner
   */
  async deleteScanner(id: string) {
    console.log(`[ScannerService] Deletando scanner: ${id}`);

    // Verificar se scanner existe
    const existingScanner = await db.scanners.findUnique({
      where: { id },
      include: {
        scans: true,
      },
    });

    if (!existingScanner) {
      throw new Error(`Scanner com ID ${id} não encontrado`);
    }

    // Verificar se há scans associados
    if (existingScanner.scans.length > 0) {
      throw new Error(
        `Não é possível deletar scanner com ${existingScanner.scans.length} scans registrados. Delete os scans primeiro ou use soft delete.`
      );
    }

    await db.scanners.delete({
      where: { id },
    });

    console.log(`[ScannerService] Scanner deletado: ${id}`);
    return { success: true, message: "Scanner deletado com sucesso" };
  }

  /**
   * Obter detalhes de um scanner específico
   */
  async getScannerById(id: string) {
    console.log(`[ScannerService] Buscando scanner: ${id}`);

    const scanner = await db.scanners.findUnique({
      where: { id },
      include: {
        safekeepings: true,
        scans: {
          take: 10,
          orderBy: {
            created_at: "desc",
          },
          include: {
            tags: {
              select: {
                tag_id: true,
              },
            },
          },
        },
      },
    });

    if (!scanner) {
      throw new Error(`Scanner com ID ${id} não encontrado`);
    }

    return {
      ...scanner,
      recent_scans: scanner.scans.map((scan) => ({
        id: scan.id,
        tag_id: scan.tags.tag_id,
        created_at: scan.created_at,
      })),
      scans: undefined, // Remover array original
    };
  }

  /**
   * Auto-descoberta: Registrar tentativa de scanner desconhecido
   */
  async registerUnknownScanner(mac_address: string) {
    console.log(
      `[ScannerService] Registrando scanner desconhecido: ${mac_address}`
    );

    // Tentar encontrar uma entrada de "pending scanner" ou criar uma nova
    // Por simplicidade, vamos usar uma tabela de log ou criar um registro temporário

    // Sugerir nome baseado no MAC address
    const macSuffix = mac_address.slice(-8).replace(/:/g, "");
    const suggestedName = `Scanner-${macSuffix}`;

    return {
      mac_address: mac_address.toUpperCase(),
      suggested_name: suggestedName,
      first_seen: new Date(),
      status: "PENDING_REGISTRATION",
      message: `Scanner desconhecido detectado. MAC: ${mac_address}. Registre-o através do endpoint /api/v1/admin/scanners`,
    };
  }

  /**
   * Listar todos os scanners com filtros opcionais
   */
  async listScanners(filters?: {
    status?: string;
    safekeeping_id?: string;
    include_stats?: boolean;
  }) {
    console.log(`[ScannerService] Listando scanners com filtros:`, filters);

    const whereClause: any = {};

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.safekeeping_id) {
      whereClause.safekeeping_id = filters.safekeeping_id;
    }

    const scanners = await db.scanners.findMany({
      where: whereClause,
      include: {
        safekeepings: true,
        ...(filters?.include_stats && {
          scans: {
            select: {
              id: true,
              created_at: true,
            },
          },
        }),
      },
      orderBy: {
        name: "asc",
      },
    });

    // Se incluir estatísticas, calcular dados adicionais
    if (filters?.include_stats) {
      return scanners.map((scanner) => {
        const scans = (scanner as any).scans || [];
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const scansLast24h = scans.filter(
          (scan: any) => scan.created_at >= oneDayAgo
        ).length;
        const scansLastWeek = scans.filter(
          (scan: any) => scan.created_at >= oneWeekAgo
        ).length;

        return {
          ...scanner,
          stats: {
            total_scans: scans.length,
            scans_last_24h: scansLast24h,
            scans_last_week: scansLastWeek,
            last_scan_ago: scanner.last_scan
              ? Math.floor(
                  (now.getTime() - scanner.last_scan.getTime()) / 1000 / 60
                )
              : null, // minutos
          },
          scans: undefined, // Remover array original
        };
      });
    }

    return scanners;
  }
}
