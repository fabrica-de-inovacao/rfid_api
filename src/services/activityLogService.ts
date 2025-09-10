import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface LogActivity {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityLogService {
  /**
   * Registra uma atividade no sistema
   */
  static async log(activity: LogActivity): Promise<void> {
    try {
      await (prisma as any).activity_logs.create({
        data: {
          user_id: activity.userId,
          action: activity.action,
          entity_type: activity.entityType,
          entity_id: activity.entityId,
          entity_name: activity.entityName,
          description: activity.description,
          ip_address: activity.ipAddress,
          user_agent: activity.userAgent,
        },
      });
    } catch (error) {
      console.error("Erro ao registrar log de atividade:", error);
    }
  }

  /**
   * Busca atividades recentes do sistema
   */
  static async getRecentActivities(
    limit: number = 50,
    offset: number = 0,
    userId?: string,
    entityType?: string
  ) {
    const where: any = {};

    if (userId) {
      where.user_id = userId;
    }

    if (entityType) {
      where.entity_type = entityType;
    }

    const [activities, total] = await Promise.all([
      (prisma as any).activity_logs.findMany({
        where,
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
        orderBy: {
          created_at: "desc",
        },
        take: limit,
        skip: offset,
      }),
      (prisma as any).activity_logs.count({ where }),
    ]);

    return {
      activities: activities.map((activity: any) => ({
        id: activity.id,
        action: activity.action,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id,
        entity_name: activity.entity_name,
        description: activity.description,
        ip_address: activity.ip_address,
        user_agent: activity.user_agent,
        created_at: activity.created_at,
        user: activity.users,
      })),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Busca estatísticas de atividades
   */
  static async getActivityStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await (prisma as any).activity_logs.groupBy({
      by: ["action", "entity_type"],
      where: {
        created_at: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    const totalActivities = await (prisma as any).activity_logs.count({
      where: {
        created_at: {
          gte: startDate,
        },
      },
    });

    return {
      total_activities: totalActivities,
      period_days: days,
      stats: stats.map((stat: any) => ({
        action: stat.action,
        entity_type: stat.entity_type,
        count: stat._count.id,
      })),
    };
  }

  /**
   * Limpa logs antigos (manutenção)
   */
  static async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await (prisma as any).activity_logs.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

// Funções helper para logs específicos
export class ActivityLogger {
  static async logUserLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await ActivityLogService.log({
      userId,
      action: "LOGIN",
      entityType: "USER",
      entityId: userId,
      description: "Usuário fez login no sistema",
      ipAddress,
      userAgent,
    });
  }

  static async logUserLogout(userId: string, ipAddress?: string) {
    await ActivityLogService.log({
      userId,
      action: "LOGOUT",
      entityType: "USER",
      entityId: userId,
      description: "Usuário fez logout do sistema",
      ipAddress,
    });
  }

  static async logEvidenceCreated(
    userId: string,
    evidenceId: string,
    evidenceName: string,
    ipAddress?: string
  ) {
    await ActivityLogService.log({
      userId,
      action: "CREATE",
      entityType: "EVIDENCE",
      entityId: evidenceId,
      entityName: evidenceName,
      description: `Prova "${evidenceName}" foi criada`,
      ipAddress,
    });
  }

  static async logEvidenceUpdated(
    userId: string,
    evidenceId: string,
    evidenceName: string,
    ipAddress?: string
  ) {
    await ActivityLogService.log({
      userId,
      action: "UPDATE",
      entityType: "EVIDENCE",
      entityId: evidenceId,
      entityName: evidenceName,
      description: `Prova "${evidenceName}" foi atualizada`,
      ipAddress,
    });
  }

  static async logTagLinked(
    userId: string | undefined,
    evidenceId: string,
    evidenceName: string,
    tagId: string,
    ipAddress?: string
  ) {
    await ActivityLogService.log({
      userId,
      action: "TAG_LINK",
      entityType: "EVIDENCE",
      entityId: evidenceId,
      entityName: evidenceName,
      description: `Tag ${tagId} foi vinculada à prova "${evidenceName}"`,
      ipAddress,
    });
  }

  static async logTagScanned(
    userId: string | undefined,
    evidenceId: string,
    evidenceName: string,
    tagId: string,
    scannerId: string
  ) {
    await ActivityLogService.log({
      userId,
      action: "TAG_SCAN",
      entityType: "EVIDENCE",
      entityId: evidenceId,
      entityName: evidenceName,
      description: `Tag ${tagId} da prova "${evidenceName}" foi escaneada pelo scanner ${scannerId}`,
    });
  }

  static async logSafekeepingCreated(
    userId: string,
    safekeepingId: string,
    safekeepingName: string,
    ipAddress?: string
  ) {
    await ActivityLogService.log({
      userId,
      action: "CREATE",
      entityType: "SAFEKEEPING",
      entityId: safekeepingId,
      entityName: safekeepingName,
      description: `Custódia "${safekeepingName}" foi criada`,
      ipAddress,
    });
  }

  static async logSafekeepingUpdated(
    userId: string,
    safekeepingId: string,
    safekeepingName: string,
    ipAddress?: string
  ) {
    await ActivityLogService.log({
      userId,
      action: "UPDATE",
      entityType: "SAFEKEEPING",
      entityId: safekeepingId,
      entityName: safekeepingName,
      description: `Custódia "${safekeepingName}" foi atualizada`,
      ipAddress,
    });
  }

  static async logUserCreated(
    adminId: string,
    newUserId: string,
    newUserName: string,
    ipAddress?: string
  ) {
    await ActivityLogService.log({
      userId: adminId,
      action: "CREATE",
      entityType: "USER",
      entityId: newUserId,
      entityName: newUserName,
      description: `Usuário "${newUserName}" foi criado`,
      ipAddress,
    });
  }

  static async logUserUpdated(
    adminId: string,
    targetUserId: string,
    targetUserName: string,
    ipAddress?: string
  ) {
    await ActivityLogService.log({
      userId: adminId,
      action: "UPDATE",
      entityType: "USER",
      entityId: targetUserId,
      entityName: targetUserName,
      description: `Usuário "${targetUserName}" foi atualizado`,
      ipAddress,
    });
  }

  static async logScannerReport(
    scannerId: string,
    scannerName: string,
    tagsCount: number
  ) {
    await ActivityLogService.log({
      action: "SCANNER_REPORT",
      entityType: "SCANNER",
      entityId: scannerId,
      entityName: scannerName,
      description: `Scanner "${scannerName}" reportou ${tagsCount} tags`,
    });
  }
}
