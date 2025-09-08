import { Router } from "express";
import { EvidenceController } from "../controllers/evidenceController";
import { validateRequest } from "../middleware/validation";
import { authenticateToken } from "../middleware/auth";
import {
  createEvidenceSchema,
  linkTagToEvidenceSchema,
} from "../validation/schemas";

const router = Router();

// O controlador será inicializado no app principal
let evidenceController: EvidenceController;

export const setEvidenceController = (controller: EvidenceController) => {
  evidenceController = controller;
};

/**
 * @swagger
 * /evidences:
 *   post:
 *     tags: [Provas]
 *     summary: Cadastra uma nova prova
 *     description: Cria um novo registo de prova. O registered_by é extraído do token JWT do utilizador autenticado.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Dados da nova prova a ser registada.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - safekeeping_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: Smartphone Samsung S22
 *               description:
 *                 type: string
 *                 example: Ecrã partido no canto superior direito, cor preta.
 *               report_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               safekeeping_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Prova criada com sucesso.
 *       400:
 *         description: Erro de validação nos dados fornecidos.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: A safekeeping_id fornecida não foi encontrada.
 */
router.post(
  "/",
  authenticateToken,
  validateRequest({ body: createEvidenceSchema }),
  (req, res) => evidenceController.createEvidence(req, res)
);

/**
 * @swagger
 * /evidences:
 *   get:
 *     tags: [Provas]
 *     summary: Lista todas as provas
 *     description: Retorna uma lista de todas as provas cadastradas no sistema.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de provas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                     example: Faca Apreendida
 *                   description:
 *                     type: string
 *                     example: Faca de cozinha com cabo de madeira, 20cm de lâmina.
 *                   status:
 *                     type: string
 *                     example: Em Custódia
 *                   tag:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       tag_id:
 *                         type: string
 *                   safekeeping:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                   registered_by:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Não autorizado.
 */
router.get("/", authenticateToken, (req, res) =>
  evidenceController.getAllEvidences(req, res)
);

/**
 * @swagger
 * /evidences/{id}:
 *   get:
 *     tags: [Provas]
 *     summary: Obtém detalhes de uma prova
 *     description: Retorna os detalhes de uma prova específica pelo seu ID.
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
 *         description: Detalhes da prova.
 *       404:
 *         description: Prova não encontrada.
 */
router.get("/:id", authenticateToken, (req, res) =>
  evidenceController.getEvidenceById(req, res)
);

/**
 * @swagger
 * /tags/link-evidence:
 *   post:
 *     tags: [Tags]
 *     summary: Inicia o processo de vínculo de uma tag a uma prova
 *     description: Dispara um evento via MQTT para que o leitor de hardware (ESP32) inicie a leitura de uma tag RFID. A resposta final é comunicada via WebSocket.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: O ID da prova à qual a tag será vinculada.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - evidence_id
 *             properties:
 *               evidence_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       202:
 *         description: Processo de leitura iniciado com sucesso. O cliente deve aguardar a resposta via WebSocket.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: A evidence_id fornecida não foi encontrada.
 */
router.post(
  "/link-evidence",
  authenticateToken,
  validateRequest({ body: linkTagToEvidenceSchema }),
  (req, res) => evidenceController.linkTagToEvidence(req, res)
);

export default router;
