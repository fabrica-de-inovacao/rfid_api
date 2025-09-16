import { Router } from "express";
import { CustodyRealtimeController } from "../controllers/custodyRealtimeController";
import { authenticateToken } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { uuidParamSchema } from "../validation/schemas";

const router = Router();

// O controlador será inicializado no app principal
let custodyController: CustodyRealtimeController;

export const setCustodyRealtimeController = (
  controller: CustodyRealtimeController
) => {
  custodyController = controller;
};

/**
 * @swagger
 * tags:
 *   - name: Custody Realtime
 *     description: Monitoramento em tempo real de custódias com dados diretos das antenas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AntennaReading:
 *       type: object
 *       properties:
 *         reading_reader_ip:
 *           type: string
 *           example: "192.168.2.100"
 *         reading_epc_hex:
 *           type: string
 *           example: "E2801191A50300653CF11502"
 *         reading_reader_mac:
 *           type: string
 *           example: "54:43:B2:95:0C:50"
 *         reading_company_id:
 *           type: string
 *           example: "FabIfma"
 *         reading_antenna:
 *           type: string
 *           example: "1"
 *         reading_movement_type:
 *           type: string
 *           example: "1"
 *         reading_created_at:
 *           type: string
 *           example: "2025-09-16 13:48:13"
 *         reading_reader_name:
 *           type: string
 *           example: "AntenaSalaFabTeste"
 *         reading_rpm:
 *           type: string
 *           example: "0"
 *
 *     AntennaCurrentStatus:
 *       type: object
 *       properties:
 *         antenna_ip:
 *           type: string
 *           example: "192.168.2.100"
 *         antenna_mac:
 *           type: string
 *           example: "54:43:B2:95:0C:50"
 *         antenna_name:
 *           type: string
 *           example: "AntenaSalaFabTeste"
 *         total_readings:
 *           type: integer
 *           example: 6
 *         unique_tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["E2801191A50300653CF11502", "E2801191A50300653CF11503"]
 *         readings:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AntennaReading'
 *         last_update:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [online, offline]
 *           example: "online"
 *
 *     CustodyRealtimeStatus:
 *       type: object
 *       properties:
 *         safekeeping_id:
 *           type: string
 *           format: uuid
 *         safekeeping_name:
 *           type: string
 *           example: "Sala de Custódia Principal"
 *         scanner:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               example: "Scanner Sala 101"
 *             mac_address:
 *               type: string
 *               example: "54:43:B2:95:0C:50"
 *             antenna_ip:
 *               type: string
 *               example: "192.168.2.100"
 *             status:
 *               type: string
 *               enum: [online, offline, ativo]
 *         evidences:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 example: "Faca Apreendida"
 *               tag_id:
 *                 type: string
 *                 nullable: true
 *                 example: "E2801191A50300653CF11502"
 *               expected_present:
 *                 type: boolean
 *                 example: true
 *               currently_present:
 *                 type: boolean
 *                 example: false
 *               last_seen_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *         summary:
 *           type: object
 *           properties:
 *             total_evidences:
 *               type: integer
 *               example: 10
 *             expected_present:
 *               type: integer
 *               example: 8
 *             currently_present:
 *               type: integer
 *               example: 6
 *             missing:
 *               type: integer
 *               example: 2
 *             unexpected:
 *               type: integer
 *               example: 0
 *         last_updated:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /custody-realtime/{safekeepingId}/status:
 *   get:
 *     tags: [Custody Realtime]
 *     summary: 🏢 Obter status em tempo real de uma custódia
 *     description: |
 *       Consulta o status atual de uma custódia comparando as evidências esperadas
 *       com as tags atualmente detectadas pelas antenas RFID.
 *
 *       **Funcionalidades:**
 *       - Consulta direta das antenas via HTTP
 *       - Comparação com evidências cadastradas
 *       - Detecção de provas ausentes ou inesperadas
 *       - Atualização via WebSocket para clientes conectados
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: safekeepingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *     responses:
 *       200:
 *         description: Status em tempo real obtido com sucesso
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
 *                   example: "Status em tempo real obtido com sucesso"
 *                 data:
 *                   $ref: '#/components/schemas/CustodyRealtimeStatus'
 *       400:
 *         description: ID da custódia não fornecido
 *       404:
 *         description: Custódia não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.get(
  "/:safekeepingId/status",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => custodyController.getSafekeepingRealtimeStatus(req, res)
);

/**
 * @swagger
 * /custody-realtime/{safekeepingId}/alerts:
 *   get:
 *     tags: [Custody Realtime]
 *     summary: 🚨 Obter alertas de uma custódia
 *     description: |
 *       Identifica provas que estão ausentes quando deveriam estar presentes
 *       ou provas inesperadas que foram detectadas mas não deveriam estar na custódia.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: safekeepingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *     responses:
 *       200:
 *         description: Alertas obtidos com sucesso
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
 *                   example: "Alertas detectados"
 *                 data:
 *                   type: object
 *                   properties:
 *                     has_alerts:
 *                       type: boolean
 *                       example: true
 *                     missing_count:
 *                       type: integer
 *                       example: 2
 *                     unexpected_count:
 *                       type: integer
 *                       example: 0
 *                     missing:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           tag_id:
 *                             type: string
 *                     unexpected:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tag_id:
 *                             type: string
 *                           evidence_name:
 *                             type: string
 *       400:
 *         description: ID da custódia não fornecido
 *       500:
 *         description: Erro interno do servidor
 */
router.get(
  "/:safekeepingId/alerts",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => custodyController.getSafekeepingAlerts(req, res)
);

/**
 * @swagger
 * /custody-realtime/{safekeepingId}/history:
 *   get:
 *     tags: [Custody Realtime]
 *     summary: 📊 Obter histórico de presença de uma custódia
 *     description: |
 *       Retorna o histórico de presença das evidências baseado nos scans realizados
 *       no período especificado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: safekeepingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Período em horas (máximo 7 dias)
 *     responses:
 *       200:
 *         description: Histórico obtido com sucesso
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.get(
  "/:safekeepingId/history",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => custodyController.getSafekeepingPresenceHistory(req, res)
);

/**
 * @swagger
 * /custody-realtime/{safekeepingId}/monitor/start:
 *   post:
 *     tags: [Custody Realtime]
 *     summary: 🔄 Iniciar monitoramento contínuo
 *     description: |
 *       Inicia o monitoramento contínuo de uma custódia com atualizações automáticas
 *       via WebSocket em intervalos regulares.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: safekeepingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da custódia
 *       - in: query
 *         name: interval
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 60
 *           default: 5
 *         description: Intervalo em minutos entre as verificações
 *     responses:
 *       200:
 *         description: Monitoramento iniciado com sucesso
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
  "/:safekeepingId/monitor/start",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => custodyController.startCustodyMonitoring(req, res)
);

/**
 * @swagger
 * /custody-realtime/monitor/{monitoringId}/stop:
 *   delete:
 *     tags: [Custody Realtime]
 *     summary: ⏹️ Parar monitoramento contínuo
 *     description: Para o monitoramento contínuo de uma custódia.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: monitoringId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do monitoramento retornado ao iniciar
 *     responses:
 *       200:
 *         description: Monitoramento parado com sucesso
 *       404:
 *         description: Monitoramento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete("/monitor/:monitoringId/stop", authenticateToken, (req, res) =>
  custodyController.stopCustodyMonitoring(req, res)
);

export default router;
