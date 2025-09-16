import { PrismaClient, evidences, tags, scans } from "@prisma/client";
import { CreateSafekeepingData, UpdateSafekeepingData } from "../types";
import { config } from "../config/env";

const prisma = new PrismaClient();

export class SafekeepingService {
  // Criar nova custódia
  async createSafekeeping(data: CreateSafekeepingData) {
    try {
      const safekeeping = await prisma.safekeepings.create({
        data: {
          name: data.name,
          manager_id: data.manager_id || null,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              setor: true,
            },
          },
          _count: {
            select: {
              evidences: true,
              scanners: true,
              users_safekeepings: true,
            },
          },
        },
      });

      return safekeeping;
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("Já existe uma custódia com este nome");
      }
      throw new Error(`Erro ao criar custódia: ${error.message}`);
    }
  }

  // Listar todas as custódias
  async getAllSafekeepings(page = 1, limit = 10, search?: string) {
    try {
      const offset = (page - 1) * limit;

      const whereClause = search
        ? {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {};

      const [safekeepings, total] = await Promise.all([
        prisma.safekeepings.findMany({
          where: whereClause,
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                setor: true,
              },
            },
            _count: {
              select: {
                evidences: true,
                scanners: true,
                users_safekeepings: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
          skip: offset,
          take: limit,
        }),
        prisma.safekeepings.count({
          where: whereClause,
        }),
      ]);

      return {
        safekeepings,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      throw new Error(`Erro ao listar custódias: ${error.message}`);
    }
  }

  // Obter custódia detalhada por ID com opções avançadas
  async getSafekeepingDetailsById(
    id: string,
    options: {
      include_items?: boolean;
      include_scanners?: boolean;
      items_page?: number;
      items_per_page?: number;
      presence_threshold_minutes?: number;
      presence_threshold_seconds?: number;
    } = {}
  ) {
    try {
      const {
        include_items = false,
        include_scanners = false,
        items_page = 1,
        items_per_page = 50,
        presence_threshold_minutes,
        presence_threshold_seconds,
      } = options;

      // Buscar custódia básica com manager
      const safekeeping = await prisma.safekeepings.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              setor: true,
            },
          },
        },
      });

      if (!safekeeping) {
        throw new Error("Custódia não encontrada");
      }

      // Estrutura base da resposta
      const result: any = {
        id: safekeeping.id,
        name: safekeeping.name,
        description: null, // campo não existe no schema atual, mas incluído para futuro
        manager: safekeeping.users
          ? {
              id: safekeeping.users.id,
              name: safekeeping.users.name,
              email: safekeeping.users.email,
              phone: null, // campo não existe no schema atual
            }
          : null,
        created_at: safekeeping.created_at,
        updated_at: safekeeping.updated_at,
      };

      // Incluir scanners se solicitado
      if (include_scanners) {
        const scanners = await prisma.scanners.findMany({
          where: { safekeeping_id: id },
          select: {
            id: true,
            name: true,
            mac_address: true,
            status: true,
            last_scan: true,
          },
          orderBy: { name: "asc" },
        });

        result.scanners = scanners.map(
          (scanner: {
            id: string;
            name: string;
            mac_address: string;
            status: string | null;
            last_scan: Date | null;
          }) => ({
            id: scanner.id,
            name: scanner.name,
            mac_address: scanner.mac_address,
            status: scanner.status?.toUpperCase() || "OFFLINE", // garantir UPPERCASE
            last_scan: scanner.last_scan,
            antenna_id: null, // campo não existe no schema atual
            location: null, // campo não existe no schema atual
          })
        );
      }

      // Incluir items/evidências se solicitado
      if (include_items) {
        const skip = (items_page - 1) * items_per_page;
        // Calcular threshold final: prioridade para seconds; senão usa minutes; fallback para env em segundos
        const thresholdMs =
          presence_threshold_seconds !== undefined
            ? presence_threshold_seconds * 1000
            : presence_threshold_minutes !== undefined
            ? presence_threshold_minutes * 60 * 1000
            : config.rfid.presenceTimeoutSeconds * 1000;
        const presenceThreshold = new Date(Date.now() - thresholdMs);

        // Buscar evidências com paginação
        const [evidences, totalEvidences] = await Promise.all([
          prisma.evidences.findMany({
            where: { safekeeping_id: id },
            include: {
              tags: {
                include: {
                  scans: {
                    where: { scanner_id: { not: null } },
                    take: 1,
                    orderBy: { created_at: "desc" },
                    include: {
                      scanners: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                },
              },
            },
            skip,
            take: items_per_page,
            orderBy: { name: "asc" },
          }),
          prisma.evidences.count({
            where: { safekeeping_id: id },
          }),
        ]);

        const items = evidences.map(
          (
            evidence: evidences & {
              tags:
                | (tags & {
                    scans: (scans & {
                      scanners: { id: string; name: string } | null;
                    })[];
                  })
                | null;
            }
          ) => {
            const lastScan = evidence.tags?.scans?.[0];
            const lastSeenAt = lastScan?.created_at || null;
            const isPresent = lastSeenAt
              ? lastSeenAt >= presenceThreshold
              : false;

            return {
              id: evidence.id,
              tag_id: evidence.tags?.tag_id || null,
              name: evidence.name,
              description: evidence.description,
              last_seen_at: lastSeenAt,
              last_seen_by_scanner_id: lastScan?.scanners?.id || null,
              present: isPresent,
              metadata: {
                status: evidence.status,
                registered_by: null, // simplificado por ora
              },
            };
          }
        );

        // Contagem de presença
        const totalPresent = items.filter(
          (i: { present: boolean }) => i.present
        ).length;
        const totalAbsent = items.length - totalPresent;

        result.items = {
          data: items,
          meta: {
            total: totalEvidences,
            page: items_page,
            per_page: items_per_page,
            total_pages: Math.ceil(totalEvidences / items_per_page),
            total_present: totalPresent,
            total_absent: totalAbsent,
          },
        };
      }

      return result;
    } catch (error: any) {
      throw new Error(`Erro ao obter detalhes da custódia: ${error.message}`);
    }
  }

  // Obter custódia por ID (método original mantido para compatibilidade)
  async getSafekeepingById(id: string) {
    try {
      const safekeeping = await prisma.safekeepings.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              setor: true,
            },
          },
          evidences: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              created_at: true,
              tag_id: true,
            },
            orderBy: {
              created_at: "desc",
            },
          },
          scanners: {
            select: {
              id: true,
              mac_address: true,
              name: true,
              status: true,
              last_scan: true,
            },
          },
          users_safekeepings: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  setor: true,
                },
              },
            },
          },
          _count: {
            select: {
              evidences: true,
              scanners: true,
              users_safekeepings: true,
            },
          },
        },
      });

      if (!safekeeping) {
        throw new Error("Custódia não encontrada");
      }

      return safekeeping;
    } catch (error: any) {
      throw new Error(`Erro ao buscar custódia: ${error.message}`);
    }
  }

  // Atualizar custódia
  async updateSafekeeping(id: string, data: UpdateSafekeepingData) {
    try {
      const safekeeping = await prisma.safekeepings.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.manager_id !== undefined && { manager_id: data.manager_id }),
          updated_at: new Date(),
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              setor: true,
            },
          },
          _count: {
            select: {
              evidences: true,
              scanners: true,
              users_safekeepings: true,
            },
          },
        },
      });

      return safekeeping;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new Error("Custódia não encontrada");
      }
      if (error.code === "P2002") {
        throw new Error("Já existe uma custódia com este nome");
      }
      throw new Error(`Erro ao atualizar custódia: ${error.message}`);
    }
  }

  // Deletar custódia
  async deleteSafekeeping(id: string) {
    try {
      // Verificar se existem provas vinculadas
      const evidenceCount = await prisma.evidences.count({
        where: { safekeeping_id: id },
      });

      if (evidenceCount > 0) {
        throw new Error(
          "Não é possível deletar custódia com provas vinculadas"
        );
      }

      // Verificar se existem scanners vinculados
      const scannerCount = await prisma.scanners.count({
        where: { safekeeping_id: id },
      });

      if (scannerCount > 0) {
        throw new Error(
          "Não é possível deletar custódia com scanners vinculados"
        );
      }

      await prisma.safekeepings.delete({
        where: { id },
      });

      return { message: "Custódia deletada com sucesso" };
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new Error("Custódia não encontrada");
      }
      throw error;
    }
  }

  // Adicionar usuário à custódia
  async addUserToSafekeeping(safekeepingId: string, userId: string) {
    try {
      // Verificar se a custódia existe
      const safekeeping = await prisma.safekeepings.findUnique({
        where: { id: safekeepingId },
      });

      if (!safekeeping) {
        throw new Error("Custódia não encontrada");
      }

      // Verificar se o usuário existe
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Verificar se a relação já existe
      const existingRelation = await prisma.users_safekeepings.findFirst({
        where: {
          user_id: userId,
          safekeeping_id: safekeepingId,
        },
      });

      if (existingRelation) {
        throw new Error("Usuário já está vinculado a esta custódia");
      }

      // Criar a relação
      const relation = await prisma.users_safekeepings.create({
        data: {
          user_id: userId,
          safekeeping_id: safekeepingId,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              setor: true,
            },
          },
        },
      });

      return relation;
    } catch (error: any) {
      throw new Error(`Erro ao adicionar usuário à custódia: ${error.message}`);
    }
  }

  // Remover usuário da custódia
  async removeUserFromSafekeeping(safekeepingId: string, userId: string) {
    try {
      const relation = await prisma.users_safekeepings.findFirst({
        where: {
          user_id: userId,
          safekeeping_id: safekeepingId,
        },
      });

      if (!relation) {
        throw new Error("Usuário não está vinculado a esta custódia");
      }

      await prisma.users_safekeepings.delete({
        where: {
          user_id_safekeeping_id: {
            user_id: userId,
            safekeeping_id: safekeepingId,
          },
        },
      });

      return { message: "Usuário removido da custódia com sucesso" };
    } catch (error: any) {
      throw new Error(`Erro ao remover usuário da custódia: ${error.message}`);
    }
  }

  // Obter usuários disponíveis para vincular à custódia
  async getAvailableUsers() {
    try {
      const users = await prisma.users.findMany({
        where: {
          status: "ativo",
        },
        select: {
          id: true,
          name: true,
          email: true,
          setor: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return users;
    } catch (error: any) {
      throw new Error(`Erro ao buscar usuários disponíveis: ${error.message}`);
    }
  }
}
