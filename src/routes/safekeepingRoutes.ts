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

// GET /api/v1/safekeepings/users/available - Deve vir antes da rota /:id
router.get(
  "/users/available",
  requireAdmin,
  safekeepingController.getAvailableUsers.bind(safekeepingController)
);

// POST /api/v1/safekeepings - Criar nova custódia (apenas admin)
router.post(
  "/",
  requireAdmin,
  validateRequest({ body: createSafekeepingSchema }),
  safekeepingController.createSafekeeping.bind(safekeepingController)
);

// GET /api/v1/safekeepings - Listar todas as custódias
router.get(
  "/",
  safekeepingController.getAllSafekeepings.bind(safekeepingController)
);

// GET /api/v1/safekeepings/:id - Obter custódia por ID
router.get(
  "/:id",
  validateRequest({ params: uuidParamSchema }),
  safekeepingController.getSafekeepingById.bind(safekeepingController)
);

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

// DELETE /api/v1/safekeepings/:id - Deletar custódia (apenas admin)
router.delete(
  "/:id",
  requireAdmin,
  validateRequest({ params: uuidParamSchema }),
  safekeepingController.deleteSafekeeping.bind(safekeepingController)
);

// POST /api/v1/safekeepings/:id/users/:userId - Adicionar usuário à custódia (apenas admin)
router.post(
  "/:id/users/:userId",
  requireAdmin,
  validateRequest({ params: safekeepingUserParamsSchema }),
  safekeepingController.addUserToSafekeeping.bind(safekeepingController)
);

// DELETE /api/v1/safekeepings/:id/users/:userId - Remover usuário da custódia (apenas admin)
router.delete(
  "/:id/users/:userId",
  requireAdmin,
  validateRequest({ params: safekeepingUserParamsSchema }),
  safekeepingController.removeUserFromSafekeeping.bind(safekeepingController)
);

export default router;
