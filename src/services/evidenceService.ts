import { db } from "../config/database";
import { CreateEvidenceData } from "../types";

export class EvidenceService {
  async createEvidence(evidenceData: CreateEvidenceData, registeredBy: string) {
    // Verificar se a custódia existe
    const safekeeping = await db.safekeepings.findUnique({
      where: { id: evidenceData.safekeeping_id },
    });

    if (!safekeeping) {
      throw new Error("Custódia não encontrada");
    }

    // Criar a prova
    const evidence = await db.evidences.create({
      data: {
        ...evidenceData,
        registered_by: registeredBy,
        status: "Em Custódia",
      },
      include: {
        tags: {
          select: {
            id: true,
            tag_id: true,
          },
        },
        safekeepings: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      id: evidence.id,
      name: evidence.name,
      description: evidence.description,
      status: evidence.status,
      tag: evidence.tags,
      safekeeping: evidence.safekeepings,
      registered_by: evidence.users,
      created_at: evidence.created_at,
    };
  }

  async getAllEvidences() {
    const evidences = await db.evidences.findMany({
      include: {
        tags: {
          select: {
            id: true,
            tag_id: true,
          },
        },
        safekeepings: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return evidences.map((evidence: any) => ({
      id: evidence.id,
      name: evidence.name,
      description: evidence.description,
      status: evidence.status,
      tag: evidence.tags,
      safekeeping: evidence.safekeepings,
      registered_by: evidence.users,
      created_at: evidence.created_at,
    }));
  }

  async getEvidenceById(id: string) {
    const evidence = await db.evidences.findUnique({
      where: { id },
      include: {
        tags: {
          select: {
            id: true,
            tag_id: true,
          },
        },
        safekeepings: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!evidence) {
      throw new Error("Prova não encontrada");
    }

    return {
      id: evidence.id,
      name: evidence.name,
      description: evidence.description,
      status: evidence.status,
      tag: evidence.tags,
      safekeeping: evidence.safekeepings,
      registered_by: evidence.users,
      created_at: evidence.created_at,
    };
  }

  async updateEvidenceStatus(id: string, status: string) {
    const evidence = await db.evidences.findUnique({
      where: { id },
    });

    if (!evidence) {
      throw new Error("Prova não encontrada");
    }

    await db.evidences.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }

  async linkTagToEvidence(evidenceId: string, tagId: string) {
    // Verificar se a prova existe
    const evidence = await db.evidences.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      throw new Error("Prova não encontrada");
    }

    // Verificar se a tag existe
    const tag = await db.tags.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new Error("Tag não encontrada");
    }

    // Verificar se a tag já está em uso
    const existingEvidence = await db.evidences.findFirst({
      where: { tag_id: tagId },
    });

    if (existingEvidence) {
      throw new Error("Tag já está vinculada a outra prova");
    }

    // Vincular tag à prova
    await db.evidences.update({
      where: { id: evidenceId },
      data: { tag_id: tagId, updated_at: new Date() },
    });

    return await this.getEvidenceById(evidenceId);
  }
}
