import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { validateRequest } from "../middleware/validation";
import { authenticateToken } from "../middleware/auth";
import { loginSchema } from "../validation/schemas";

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Autentica um utilizador
 *     description: Valida as credenciais (e-mail e senha) e retorna um accessToken e um refreshToken em caso de sucesso.
 *     requestBody:
 *       description: Credenciais do utilizador para login.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@email.com
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: umaSenhaForte123
 *     responses:
 *       200:
 *         description: Autenticação bem-sucedida.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: a1b2c3d4-e5f6-...
 *       401:
 *         description: Não autorizado. E-mail ou senha incorretos.
 */
router.post(
  "/login",
  validateRequest({ body: loginSchema }),
  authController.login
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Autenticação]
 *     summary: Obtém dados do utilizador autenticado
 *     description: Retorna as informações do utilizador associado ao accessToken fornecido no cabeçalho de autorização.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informações do utilizador autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                   example: Administrador do Sistema
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: admin@email.com
 *                 cpf:
 *                   type: string
 *                   example: 123.456.789-00
 *                 setor:
 *                   type: string
 *                   example: TI
 *                 admin:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [ativo, inativo]
 *                 tag_id:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *       401:
 *         description: Não autorizado. Token inválido ou expirado.
 */
router.get("/me", authenticateToken, authController.me);

export default router;
