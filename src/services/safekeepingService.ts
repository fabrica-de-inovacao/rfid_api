import { PrismaClient } from "@prisma/client";
import { CreateSafekeepingData, UpdateSafekeepingData } from "../types";

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

  // Obter custódia por ID
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
