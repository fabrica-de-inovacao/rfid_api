import { Router } from "express";
import { SafekeepingController } from "../controllers/safekeepingController";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import {
  createSafekeepingSchema,
  updateSafekeepingSchema,
  uuidParamSchema,
} from "../validation/schemas";
import { z } from "zod";

const router = Router();
const safekeepingController = new SafekeepingController();

// Schema para validar parâmetros de rota com id e userId
const safekeepingUserParamsSchema = z.object({
  id: z.string().uuid("ID da custódia deve ser um UUID válido"),
  userId: z.string().uuid("ID do usuário deve ser um UUID válido"),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Safekeeping:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único da custódia
 *         name:
 *           type: string
 *           description: Nome da custódia
 *         manager_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID do gestor da custódia
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização
 *         users:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             setor:
 *               type: string
 *         _count:
 *           type: object
 *           properties:
 *             evidences:
 *               type: integer
 *               description: Número de provas na custódia
 *             scanners:
 *               type: integer
 *               description: Número de scanners na custódia
 *             users_safekeepings:
 *               type: integer
 *               description: Número de usuários vinculados
 *     CreateSafekeepingRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Nome da custódia
 *         manager_id:
 *           type: string
 *           format: uuid
 *           description: ID do gestor da custódia
 *     UpdateSafekeepingRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nome da custódia
 *         manager_id:
 *           type: string
 *           format: uuid
 *           description: ID do gestor da custódia
 */

// Todas as rotas de safekeepings requerem autenticação
router.use(authenticateToken);

/**
 * @swagger
 * /safekeepings/users/available:
 *   get:
 *     tags: [Administração - Custódias]
 *     summary: Lista utilizadores disponíveis (Admin)
 *     description: Retorna lista de utilizadores disponíveis para serem vinculados a uma custódia. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de utilizadores disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 */
// GET /api/v1/safekeepings/users/available - Deve vir antes da rota /:id
router.get(
  "/users/available",
  requireAdmin,
  safekeepingController.getAvailableUsers.bind(safekeepingController)
);

/**
 * @swagger
 * /safekeepings:
 *   post:
 *     tags: [Administração - Custódias]
 *     summary: Cria nova custódia (Admin)
 *     description: Cria uma nova custódia no sistema. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Dados da nova custódia
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSafekeepingRequest'
 *     responses:
 *       201:
 *         description: Custódia criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SafekeepingResponse'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 */
// POST /api/v1/safekeepings - Criar nova custódia (apenas admin)
router.post(
  "/",
  requireAdmin,
  validateRequest({ body: createSafekeepingSchema }),
  safekeepingController.createSafekeeping.bind(safekeepingController)
);

/**
 * @swagger
 * /safekeepings:
 *   get:
 *     tags: [Custódias]
 *     summary: Lista todas as custódias
 *     description: Retorna lista de todas as custódias do sistema com contadores de provas e scanners.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de custódias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SafekeepingResponse'
 *       401:
 *         description: Não autorizado
 */
// GET /api/v1/safekeepings - Listar todas as custódias
router.get(
  "/",
  safekeepingController.getAllSafekeepings.bind(safekeepingController)
);

/**
 * @swagger
 * /safekeepings/{id}:
 *   get:
 *     tags: [Custódias]
 *     summary: Obtém detalhes de uma custódia
 *     description: Retorna os detalhes de uma custódia específica pelo seu ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *     responses:
 *       200:
 *         description: Detalhes da custódia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SafekeepingResponse'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Custódia não encontrada
 */
// GET /api/v1/safekeepings/:id - Obter custódia por ID
router.get(
  "/:id",
  validateRequest({ params: uuidParamSchema }),
  safekeepingController.getSafekeepingById.bind(safekeepingController)
);

/**
 * @swagger
 * /safekeepings/{id}:
 *   put:
 *     tags: [Administração - Custódias]
 *     summary: Atualiza uma custódia (Admin)
 *     description: Atualiza os dados de uma custódia existente. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *     requestBody:
 *       description: Dados para atualização da custódia
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSafekeepingRequest'
 *     responses:
 *       200:
 *         description: Custódia atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SafekeepingResponse'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 *       404:
 *         description: Custódia não encontrada
 */
// PUT /api/v1/safekeepings/:id - Atualizar custódia (apenas admin)
router.put(
  "/:id",
  requireAdmin,
  validateRequest({
    params: uuidParamSchema,
    body: updateSafekeepingSchema,
  }),
  safekeepingController.updateSafekeeping.bind(safekeepingController)
);

/**
 * @swagger
 * /safekeepings/{id}:
 *   delete:
 *     tags: [Administração - Custódias]
 *     summary: Remove uma custódia (Admin)
 *     description: Remove uma custódia do sistema. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *     responses:
 *       204:
 *         description: Custódia removida com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 *       404:
 *         description: Custódia não encontrada
 */
// DELETE /api/v1/safekeepings/:id - Deletar custódia (apenas admin)
router.delete(
  "/:id",
  requireAdmin,
  validateRequest({ params: uuidParamSchema }),
  safekeepingController.deleteSafekeeping.bind(safekeepingController)
);

/**
 * @swagger
 * /safekeepings/{id}/users/{userId}:
 *   post:
 *     tags: [Administração - Custódias]
 *     summary: Adiciona utilizador à custódia (Admin)
 *     description: Vincula um utilizador a uma custódia específica. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do utilizador
 *     responses:
 *       200:
 *         description: Utilizador adicionado à custódia com sucesso
 *       400:
 *         description: Utilizador já está vinculado à custódia
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 *       404:
 *         description: Custódia ou utilizador não encontrado
 */
// POST /api/v1/safekeepings/:id/users/:userId - Adicionar usuário à custódia (apenas admin)
router.post(
  "/:id/users/:userId",
  requireAdmin,
  validateRequest({ params: safekeepingUserParamsSchema }),
  safekeepingController.addUserToSafekeeping.bind(safekeepingController)
);

/**
 * @swagger
 * /safekeepings/{id}/users/{userId}:
 *   delete:
 *     tags: [Administração - Custódias]
 *     summary: Remove utilizador da custódia (Admin)
 *     description: Remove a vinculação de um utilizador de uma custódia específica. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do utilizador
 *     responses:
 *       204:
 *         description: Utilizador removido da custódia com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Proibido. O utilizador não é um administrador
 *       404:
 *         description: Custódia, utilizador ou vinculação não encontrada
 */
// DELETE /api/v1/safekeepings/:id/users/:userId - Remover usuário da custódia (apenas admin)
router.delete(
  "/:id/users/:userId",
  requireAdmin,
  validateRequest({ params: safekeepingUserParamsSchema }),
  safekeepingController.removeUserFromSafekeeping.bind(safekeepingController)
);

export default router;
