import { Request, Response } from "express";
import { ActivityLogService } from "../services/activityLogService";
import { AuthenticatedRequest } from "../types";
import { z } from "zod";

const getActivitiesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  user_id: z.string().uuid().optional(),
  entity_type: z
    .enum(["USER", "EVIDENCE", "SAFEKEEPING", "SCANNER", "TAG"])
    .optional(),
});

const getStatsSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

export class ActivityController {
  /**
   * @swagger
   * /api/v1/activities:
   *   get:
   *     tags:
   *       - Atividades
   *     summary: Listar atividades recentes
   *     description: Retorna uma lista paginada das atividades mais recentes do sistema
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Número máximo de atividades por página
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Número de atividades para pular
   *       - in: query
   *         name: user_id
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filtrar por ID do usuário
   *       - in: query
   *         name: entity_type
   *         schema:
   *           type: string
   *           enum: ["USER", "EVIDENCE", "SAFEKEEPING", "SCANNER", "TAG"]
   *         description: Filtrar por tipo de entidade
   *     responses:
   *       200:
   *         description: Lista de atividades retornada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     activities:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ActivityResponse'
   *                     total:
   *                       type: integer
   *                       example: 150
   *                     limit:
   *                       type: integer
   *                       example: 50
   *                     offset:
   *                       type: integer
   *                       example: 0
   *                     hasMore:
   *                       type: boolean
   *                       example: true
   *       400:
   *         description: Parâmetros inválidos
   *       401:
   *         description: Não autorizado
   */
  async getRecentActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit, offset, user_id, entity_type } = getActivitiesSchema.parse(
        req.query
      );

      const result = await ActivityLogService.getRecentActivities(
        limit,
        offset,
        user_id,
        entity_type
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Parâmetros inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      console.error("Erro ao buscar atividades:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/activities/stats:
   *   get:
   *     tags:
   *       - Atividades
   *     summary: Obter estatísticas de atividades
   *     description: Retorna estatísticas das atividades do sistema em um período específico
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 365
   *           default: 30
   *         description: Número de dias para calcular estatísticas
   *     responses:
   *       200:
   *         description: Estatísticas retornadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/ActivityStatsResponse'
   *       400:
   *         description: Parâmetros inválidos
   *       401:
   *         description: Não autorizado
   */
  async getActivityStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { days } = getStatsSchema.parse(req.query);

      const stats = await ActivityLogService.getActivityStats(days);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Parâmetros inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      console.error("Erro ao buscar estatísticas:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/activities/my:
   *   get:
   *     tags:
   *       - Atividades
   *     summary: Listar minhas atividades
   *     description: Retorna uma lista das atividades do usuário autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Número máximo de atividades por página
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Número de atividades para pular
   *     responses:
   *       200:
   *         description: Lista de atividades do usuário retornada com sucesso
   *       401:
   *         description: Não autorizado
   */
  async getMyActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit, offset } = getActivitiesSchema.parse(req.query);
      const userId = req.user!.id;

      const result = await ActivityLogService.getRecentActivities(
        limit,
        offset,
        userId
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Parâmetros inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      console.error("Erro ao buscar atividades do usuário:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
}
