import { Router } from "express";
import { ScannerController } from "../controllers/scannerController";
import { validateRequest } from "../middleware/validation";
import { validateHardwareApiKey } from "../middleware/hardware";
import { authenticateToken } from "../middleware/auth";
import { scannerReportSchema } from "../validation/schemas";

const router = Router();

// O controlador será inicializado no app principal
let scannerController: ScannerController;

export const setScannerController = (controller: ScannerController) => {
  scannerController = controller;
};

/**
 * @swagger
 * /scans/report:
 *   post:
 *     tags: [Scanners]
 *     summary: Recebe dados de leitura de um scanner
 *     description: Endpoint exclusivo para o hardware de monitorização (Antena M-ID10W) enviar os UIDs das tags detetadas na sala de custódia.
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Chave de API secreta para autenticar o hardware.
 *     requestBody:
 *       description: Payload contendo o MAC Address do scanner e a lista de UIDs de tags lidas.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mac_address
 *               - tags
 *             properties:
 *               mac_address:
 *                 type: string
 *                 example: DE:AD:BE:EF:FE:ED
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["E2001...", "E2002..."]
 *     responses:
 *       204:
 *         description: Dados recebidos e processados com sucesso. Nenhuma resposta no corpo.
 *       401:
 *         description: Chave de API (X-API-Key) inválida ou ausente.
 *       404:
 *         description: Scanner com o mac_address fornecido não foi encontrado no sistema.
 */
router.post(
  "/report",
  validateHardwareApiKey,
  validateRequest({ body: scannerReportSchema }),
  (req, res) => scannerController.processScannerReport(req, res)
);

/**
 * @swagger
 * /scans/status:
 *   get:
 *     tags: [Scanners]
 *     summary: Obtém status de todos os scanners
 *     description: Retorna informações sobre o status de todos os scanners registados no sistema.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de scanners e seus status.
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
 *                   mac_address:
 *                     type: string
 *                   status:
 *                     type: string
 *                   last_scan:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   safekeeping:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *       401:
 *         description: Não autorizado.
 */
router.get("/status", authenticateToken, (req, res) =>
  scannerController.getScannerStatus(req, res)
);

/**
 * @swagger
 * /scans/recent:
 *   get:
 *     tags: [Scanners]
 *     summary: Obtém scans recentes
 *     description: Retorna uma lista dos scans mais recentes registados no sistema.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de scans a retornar.
 *     responses:
 *       200:
 *         description: Lista de scans recentes.
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
 *                   scanner:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       mac_address:
 *                         type: string
 *                   tag:
 *                     type: object
 *                     properties:
 *                       tag_id:
 *                         type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Não autorizado.
 */
router.get("/recent", authenticateToken, (req, res) =>
  scannerController.getRecentScans(req, res)
);

export default router;
