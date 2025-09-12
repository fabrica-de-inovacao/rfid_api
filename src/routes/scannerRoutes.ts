import { Router } from "express";
import { ScannerController } from "../controllers/scannerController";
import { validateRequest } from "../middleware/validation";
import { validateHardwareApiKey } from "../middleware/hardware";
import { authenticateToken } from "../middleware/auth";
import {
  scannerReportSchema,
  createScannerSchema,
  updateScannerSchema,
  scannerFiltersSchema,
  uuidParamSchema,
} from "../validation/schemas";

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
 *     summary: Obtém scans recentes com suporte a scanners pendentes
 *     description: |
 *       Retorna uma lista dos scans mais recentes registados no sistema.
 *
 *       **Funcionalidade Avançada:**
 *       - Suporte para incluir informações de scanners pendentes
 *       - Filtragem por limite de resultados
 *       - Ordenação por data mais recente
 *
 *       **Casos de Uso:**
 *       - `GET /scans/recent` - Scans normais apenas
 *       - `GET /scans/recent?include_pending=true` - Inclui scanners pendentes
 *       - `GET /scans/recent?limit=50&include_pending=true` - 50 resultados + pendentes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *         description: Número máximo de scans a retornar
 *       - in: query
 *         name: include_pending
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir informações de scanners pendentes de aprovação
 *     responses:
 *       200:
 *         description: Lista de scans recentes com informações detalhadas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ScanWithPendingInfo'
 *             examples:
 *               scans_normais:
 *                 summary: Scans de scanners aprovados
 *                 value:
 *                   - id: "789e0123-e89b-12d3-a456-426614174002"
 *                     scanner:
 *                       name: "Scanner Principal"
 *                       mac_address: "AA:BB:CC:DD:EE:FF"
 *                       status: "online"
 *                     tag:
 *                       tag_id: "35800748970"
 *                     created_at: "2025-09-11T15:45:00Z"
 *                     is_pending: false
 *               com_pendentes:
 *                 summary: Incluindo scanners pendentes
 *                 value:
 *                   - id: "pending-123"
 *                     scanner:
 *                       name: "Scanner-CCDDEEFF"
 *                       mac_address: "CC:DD:EE:FF:00:11"
 *                       status: "pending"
 *                     tag: null
 *                     created_at: "2025-09-11T14:30:00Z"
 *                     is_pending: true
 *                     scan_count: 5
 *       401:
 *         description: Token de autenticação inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/recent", authenticateToken, (req, res) =>
  scannerController.getRecentScans(req, res)
);

// ========== ROTAS ADMINISTRATIVAS DE SCANNERS ==========

/**
 * @swagger
 * /scans/scanners:
 *   post:
 *     tags: [Administração - Scanners]
 *     summary: Cadastrar um novo scanner
 *     description: Cria um novo scanner no sistema. Requer privilégios de administrador.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - mac_address
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Scanner Entrada Principal"
 *                 description: Nome único do scanner
 *               mac_address:
 *                 type: string
 *                 example: "AA:BB:CC:DD:EE:FF"
 *                 description: Endereço MAC único do scanner
 *               safekeeping_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: ID da custódia associada (opcional)
 *               description:
 *                 type: string
 *                 example: "Scanner localizado na entrada principal do cofre"
 *                 description: Descrição adicional do scanner (opcional)
 *     responses:
 *       201:
 *         description: Scanner criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Scanner criado com sucesso"
 *                 data:
 *                   $ref: '#/components/schemas/ScannerDetails'
 *       400:
 *         description: Dados inválidos ou scanner já existe
 *       401:
 *         description: Não autorizado
 */
router.post(
  "/scanners",
  authenticateToken,
  validateRequest({ body: createScannerSchema }),
  (req, res) => scannerController.createScanner(req, res)
);

/**
 * @swagger
 * /scans/scanners:
 *   get:
 *     tags: [Administração - Scanners]
 *     summary: Listar todos os scanners
 *     description: Retorna uma lista de todos os scanners cadastrados no sistema com filtros opcionais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ONLINE, OFFLINE, MAINTENANCE, ERROR]
 *         description: Filtrar por status do scanner
 *       - in: query
 *         name: safekeeping_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por custódia associada
 *       - in: query
 *         name: include_stats
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Incluir estatísticas de uso dos scanners
 *     responses:
 *       200:
 *         description: Lista de scanners retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScannerDetails'
 *       401:
 *         description: Não autorizado
 */
router.get(
  "/scanners",
  authenticateToken,
  validateRequest({ query: scannerFiltersSchema }),
  (req, res) => scannerController.listScanners(req, res)
);

/**
 * @swagger
 * /scans/scanners/{id}:
 *   get:
 *     tags: [Administração - Scanners]
 *     summary: Obter detalhes de um scanner
 *     description: Retorna informações detalhadas sobre um scanner específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do scanner
 *     responses:
 *       200:
 *         description: Detalhes do scanner retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ScannerDetails'
 *       404:
 *         description: Scanner não encontrado
 *       401:
 *         description: Não autorizado
 */
router.get(
  "/scanners/:id",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController.getScannerById(req, res)
);

/**
 * @swagger
 * /scans/scanners/{id}:
 *   put:
 *     tags: [Administração - Scanners]
 *     summary: Atualizar um scanner
 *     description: Atualiza as informações de um scanner existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do scanner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Scanner Entrada Principal - Atualizado"
 *               safekeeping_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               description:
 *                 type: string
 *                 example: "Scanner relocado para a nova entrada"
 *               status:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE, MAINTENANCE, ERROR]
 *                 example: "MAINTENANCE"
 *     responses:
 *       200:
 *         description: Scanner atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Scanner atualizado com sucesso"
 *                 data:
 *                   $ref: '#/components/schemas/ScannerDetails'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Scanner não encontrado
 *       401:
 *         description: Não autorizado
 */
router.put(
  "/scanners/:id",
  authenticateToken,
  validateRequest({
    params: uuidParamSchema,
    body: updateScannerSchema,
  }),
  (req, res) => scannerController.updateScanner(req, res)
);

/**
 * @swagger
 * /scans/scanners/{id}:
 *   delete:
 *     tags: [Administração - Scanners]
 *     summary: Deletar um scanner
 *     description: Remove um scanner do sistema. Só é possível deletar scanners sem histórico de scans.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do scanner
 *     responses:
 *       200:
 *         description: Scanner deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Scanner deletado com sucesso"
 *       400:
 *         description: Não é possível deletar scanner com histórico de scans
 *       404:
 *         description: Scanner não encontrado
 *       401:
 *         description: Não autorizado
 */
router.delete(
  "/scanners/:id",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController.deleteScanner(req, res)
);

// ========== ROTAS DE SCANNERS PENDENTES ==========

/**
 * @swagger
 * /scans/pending-scanners:
 *   get:
 *     tags: [Administração - Scanners]
 *     summary: Listar scanners pendentes de aprovação
 *     description: Retorna lista de scanners que foram detectados mas ainda não foram aprovados/cadastrados no sistema.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filtrar por status do scanner pendente
 *     responses:
 *       200:
 *         description: Lista de scanners pendentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       mac_address:
 *                         type: string
 *                         example: "AA:BB:CC:DD:EE:FF"
 *                       suggested_name:
 *                         type: string
 *                         example: "Scanner-CCDDEEFF"
 *                       first_seen:
 *                         type: string
 *                         format: date-time
 *                       last_seen:
 *                         type: string
 *                         format: date-time
 *                       scan_count:
 *                         type: integer
 *                         example: 5
 *                       status:
 *                         type: string
 *                         example: "pending"
 */
router.get("/pending-scanners", authenticateToken, (req, res) =>
  scannerController.listPendingScanners(req, res)
);

/**
 * @swagger
 * /scans/pending-scanners/{id}/approve:
 *   post:
 *     tags: [Administração - Scanners]
 *     summary: Aprovar um scanner pendente
 *     description: Aprova um scanner pendente e o registra oficialmente no sistema.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do scanner pendente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Scanner Sala Principal"
 *               safekeeping_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Scanner aprovado e criado com sucesso
 *       400:
 *         description: Dados inválidos ou scanner já processado
 *       404:
 *         description: Scanner pendente não encontrado
 */
router.post(
  "/pending-scanners/:id/approve",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController.approvePendingScanner(req, res)
);

/**
 * @swagger
 * /scans/pending-scanners/{id}/reject:
 *   post:
 *     tags: [Administração - Scanners]
 *     summary: Rejeitar um scanner pendente
 *     description: Rejeita um scanner pendente, removendo-o da lista de pendências.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do scanner pendente
 *     responses:
 *       200:
 *         description: Scanner rejeitado com sucesso
 *       404:
 *         description: Scanner pendente não encontrado
 */
router.post(
  "/pending-scanners/:id/reject",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController.rejectPendingScanner(req, res)
);

export default router;
