import { Router } from "express";
import { ActivityController } from "../controllers/activityController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();
const activityController = new ActivityController();

/**
 * @swagger
 * tags:
 *   name: Atividades
 *   description: Gerenciamento de logs e atividades do sistema
 */

/**
 * @swagger
 * /activities/my:
 *   get:
 *     tags: [Atividades]
 *     summary: Obtém atividades do utilizador
 *     description: Retorna as atividades realizadas pelo utilizador autenticado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de registos por página
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [auth, crud, mqtt, system]
 *         description: Filtrar por tipo de atividade
 *     responses:
 *       200:
 *         description: Lista de atividades do utilizador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Não autorizado
 */
// Rotas públicas para usuários autenticados
router.get("/my", authenticateToken, activityController.getMyActivities);

/**
 * @swagger
 * /activities:
 *   get:
 *     tags: [Administração - Atividades]
 *     summary: Lista todas as atividades (Admin)
 *     description: Retorna todas as atividades do sistema. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de registos por página
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [auth, crud, mqtt, system]
 *         description: Filtrar por tipo de atividade
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID do utilizador
 *     responses:
 *       200:
 *         description: Lista de atividades do sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 */
// Rotas administrativas
router.get(
  "/",
  authenticateToken,
  requireAdmin,
  activityController.getRecentActivities
);

/**
 * @swagger
 * /activities/stats:
 *   get:
 *     tags: [Administração - Atividades]
 *     summary: Obtém estatísticas de atividades (Admin)
 *     description: Retorna estatísticas das atividades do sistema. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Período para as estatísticas
 *     responses:
 *       200:
 *         description: Estatísticas das atividades
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityStatsResponse'
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 */
router.get(
  "/stats",
  authenticateToken,
  requireAdmin,
  activityController.getActivityStats
);

export default router;
