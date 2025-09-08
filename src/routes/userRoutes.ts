import { Router } from "express";
import { UserController } from "../controllers/userController";
import { validateRequest } from "../middleware/validation";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import {
  createUserSchema,
  updateUserSchema,
  uuidParamSchema,
} from "../validation/schemas";

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Administração - Utilizadores]
 *     summary: Lista todos os utilizadores (Admin)
 *     description: Retorna uma lista de todos os utilizadores do sistema. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de utilizadores.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Não autorizado.
 *       403:
 *         description: Proibido. O utilizador não é um administrador.
 */
router.get("/", authenticateToken, requireAdmin, userController.getAllUsers);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Administração - Utilizadores]
 *     summary: Cria um novo utilizador (Admin)
 *     description: Regista um novo utilizador no sistema. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Dados do novo utilizador.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - cpf
 *               - setor
 *               - senha
 *             properties:
 *               name:
 *                 type: string
 *                 example: Novo Agente
 *               email:
 *                 type: string
 *                 format: email
 *                 example: agente@email.com
 *               cpf:
 *                 type: string
 *                 example: 987.654.321-99
 *               setor:
 *                 type: string
 *                 example: Perícia
 *               senha:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: outraSenhaForte456
 *               admin:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Utilizador criado com sucesso.
 *       409:
 *         description: Conflito. O e-mail ou CPF já está em uso.
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  validateRequest({ body: createUserSchema }),
  userController.createUser
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Administração - Utilizadores]
 *     summary: Obtém detalhes de um utilizador (Admin)
 *     description: Retorna os detalhes de um utilizador específico pelo seu ID. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detalhes do utilizador.
 *       404:
 *         description: Utilizador não encontrado.
 */
router.get(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateRequest({ params: uuidParamSchema }),
  userController.getUserById
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Administração - Utilizadores]
 *     summary: Atualiza um utilizador (Admin)
 *     description: Atualiza os dados de um utilizador existente. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       description: Campos a serem atualizados. A senha não é atualizada por este endpoint.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               cpf:
 *                 type: string
 *               setor:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ativo, inativo]
 *               admin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Utilizador atualizado com sucesso.
 */
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateRequest({ params: uuidParamSchema, body: updateUserSchema }),
  userController.updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Administração - Utilizadores]
 *     summary: Desativa um utilizador (Admin)
 *     description: Realiza uma exclusão lógica, alterando o status do utilizador para 'inativo'. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Utilizador desativado com sucesso. Nenhum conteúdo na resposta.
 */
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateRequest({ params: uuidParamSchema }),
  userController.deactivateUser
);

export default router;
