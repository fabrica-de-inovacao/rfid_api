import { Router } from "express";
import { ScannerController } from "../controllers/scannerController";
import { validateRequest } from "../middleware/validation";
import { validateHardwareApiKey } from "../middleware/hardware";
import { convertESP32Format } from "../middleware/esp32Converter";
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
 * tags:
 *   - name: Scanners
 *     description: Gestão completa de scanners RFID e auto-descoberta
 *   - name: Hardware
 *     description: Endpoints exclusivos para comunicação com hardware ESP32
 *   - name: Pending Scanners
 *     description: Sistema de aprovação para scanners desconhecidos
 */

/**
 * @swagger
 * /scans/report:
 *   post:
 *     tags: [Hardware]
 *     summary: 📡 Recebe dados de leitura de scanners ESP32
 *     description: |
 *       **Endpoint exclusivo para hardware ESP32** enviar dados de leitura de tags RFID.
 *
 *       ### 🔧 Formatos Suportados:
 *       - **ESP32 Format**: Array de leituras (convertido automaticamente)
 *       - **Standard Format**: Objeto com mac_address e tags
 *
 *       ### 🔄 Auto-descoberta:
 *       - Scanner desconhecido → Registrado como pendente
 *       - Scanner conhecido → Processa tags normalmente
 *
 *       ### 📊 Processamento:
 *       1. Validação da API Key
 *       2. Conversão de formato (se necessário)
 *       3. Identificação do scanner
 *       4. Processamento das tags
 *       5. Notificação WebSocket em tempo real
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: Dados de leitura do scanner (ESP32 ou formato padrão)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/ScannerReportESP32'
 *               - $ref: '#/components/schemas/ScannerReportStandard'
 *           examples:
 *             ESP32_Format:
 *               summary: 🔧 Formato ESP32 (Array de readings)
 *               value:
 *                 - reading_reader_ip: "192.168.2.100"
 *                   reading_epc_hex: "E2801191A50300653CF0F0D2"
 *                   reading_reader_mac: "54:43:B2:95:0C:50"
 *                   reading_company_id: ""
 *                   reading_antenna: "1"
 *                   reading_movement_type: "1"
 *                   reading_created_at: "2025-09-12 10:00:00"
 *                   reading_reader_name: "ESP32-Scanner"
 *                   reading_rpm: "0"
 *                 - reading_reader_ip: "192.168.2.100"
 *                   reading_epc_hex: "E2801191A50300653CF11532"
 *                   reading_reader_mac: "54:43:B2:95:0C:50"
 *                   reading_company_id: ""
 *                   reading_antenna: "1"
 *                   reading_movement_type: "1"
 *                   reading_created_at: "2025-09-12 10:00:01"
 *                   reading_reader_name: "ESP32-Scanner"
 *                   reading_rpm: "0"
 *             Standard_Format:
 *               summary: 📋 Formato Padrão (Convertido)
 *               value:
 *                 mac_address: "54:43:B2:95:0C:50"
 *                 tags: ["E2801191A50300653CF0F0D2", "E2801191A50300653CF11532"]
 *                 reader_ip: "192.168.2.100"
 *                 reader_name: "ESP32-Scanner"
 *                 readings_count: 2
 *                 unique_tags_count: 2
 *     responses:
 *       200:
 *         description: ✅ Leitura processada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResult'
 *             examples:
 *               Registered_Scanner:
 *                 summary: 🟢 Scanner Registrado
 *                 value:
 *                   scanner:
 *                     name: "Scanner Sala 101"
 *                     safekeeping:
 *                       name: "Depósito Central"
 *                     status: "ativo"
 *                   tags_processed:
 *                     - tag_id: "E2801191A50300653CF0F0D2"
 *                       evidence_id: "123e4567-e89b-12d3-a456-426614174000"
 *                       alert: false
 *                       message: "Tag processada com sucesso"
 *                   timestamp: "2025-09-12T10:00:00.000Z"
 *                   pending: false
 *               Pending_Scanner:
 *                 summary: 🟡 Scanner Pendente
 *                 value:
 *                   scanner:
 *                     name: "Scanner Desconhecido (AA:BB:CC:DD:EE:FF)"
 *                     safekeeping: null
 *                     status: "pending"
 *                   tags_processed: []
 *                   timestamp: "2025-09-12T10:00:00.000Z"
 *                   pending: true
 *                   message: "Scanner registrado como pendente para aprovação"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post(
  "/report",
  validateHardwareApiKey,
  convertESP32Format,
  validateRequest({ body: scannerReportSchema }),
  (req, res) => scannerController?.processScannerReport(req, res)
);

/**
 * @swagger
 * /scans/scanners:
 *   get:
 *     tags: [Scanners]
 *     summary: 📋 Lista todos os scanners registrados
 *     description: |
 *       **Obtém lista completa de scanners** com informações detalhadas.
 *
 *       ### 🎯 Informações Incluídas:
 *       - Status do scanner (ativo, inativo, manutenção)
 *       - Última atividade de scan
 *       - Custódia associada
 *       - Estatísticas de uso
 *
 *       ### 🔍 Filtros Disponíveis:
 *       - Por status
 *       - Por custódia
 *       - Por atividade recente
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ativo, inativo, manutencao]
 *         description: Filtrar por status do scanner
 *       - in: query
 *         name: safekeeping_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por custódia
 *       - in: query
 *         name: include_stats
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir estatísticas detalhadas
 *     responses:
 *       200:
 *         description: ✅ Lista de scanners
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
 *                     $ref: '#/components/schemas/Scanner'
 *                 count:
 *                   type: integer
 *                   example: 12
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Scanners]
 *     summary: ➕ Criar novo scanner manualmente
 *     description: |
 *       **Registra um novo scanner** no sistema manualmente.
 *
 *       ### 📝 Processo:
 *       1. Validação do MAC address (único)
 *       2. Associação com custódia (opcional)
 *       3. Configuração inicial
 *       4. Notificação via WebSocket
 *
 *       ### ⚠️ Validações:
 *       - MAC address deve ser único
 *       - Formato MAC válido
 *       - Custódia deve existir (se fornecida)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, mac_address]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Scanner Sala 205"
 *                 description: Nome identificativo do scanner
 *               mac_address:
 *                 type: string
 *                 example: "54:43:B2:95:0C:50"
 *                 description: Endereço MAC único do scanner
 *               safekeeping_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID da custódia associada (opcional)
 *               description:
 *                 type: string
 *                 example: "Scanner RFID sala de evidências bloco A"
 *                 description: Descrição detalhada (opcional)
 *     responses:
 *       201:
 *         description: ✅ Scanner criado com sucesso
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
 *                   $ref: '#/components/schemas/Scanner'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: ⚠️ MAC address já existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "MAC address já está em uso"
 */
router.get("/scanners", authenticateToken, (req, res) =>
  scannerController?.listScanners(req, res)
);

router.post(
  "/scanners",
  authenticateToken,
  validateRequest({ body: createScannerSchema }),
  (req, res) => scannerController?.createScanner(req, res)
);

/**
 * @swagger
 * /scans/scanners/{id}:
 *   get:
 *     tags: [Scanners]
 *     summary: 🔍 Obter detalhes de um scanner específico
 *     description: |
 *       **Obtém informações detalhadas** de um scanner por ID.
 *
 *       ### 📊 Dados Incluídos:
 *       - Informações básicas do scanner
 *       - Custódia associada
 *       - Histórico de atividades
 *       - Estatísticas de uso
 *       - Últimas tags processadas
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do scanner
 *       - in: query
 *         name: include_history
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir histórico de scans
 *     responses:
 *       200:
 *         description: ✅ Detalhes do scanner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Scanner'
 *                     - type: object
 *                       properties:
 *                         safekeepings:
 *                           $ref: '#/components/schemas/Safekeeping'
 *                         recent_scans:
 *                           type: array
 *                           items:
 *                             type: object
 *                         stats:
 *                           type: object
 *                           properties:
 *                             total_scans:
 *                               type: integer
 *                             tags_processed:
 *                               type: integer
 *                             uptime_percentage:
 *                               type: number
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   put:
 *     tags: [Scanners]
 *     summary: ✏️ Atualizar configurações do scanner
 *     description: |
 *       **Atualiza configurações** de um scanner existente.
 *
 *       ### 🔧 Campos Atualizáveis:
 *       - Nome do scanner
 *       - Custódia associada
 *       - Status operacional
 *       - Descrição
 *
 *       ### 🚫 Restrições:
 *       - MAC address não pode ser alterado
 *       - Scanner deve existir
 *       - Custódia deve ser válida (se fornecida)
 *     security:
 *       - BearerAuth: []
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
 *                 example: "Scanner Sala 205 - Atualizado"
 *               safekeeping_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [ativo, inativo, manutencao]
 *               description:
 *                 type: string
 *                 example: "Scanner principal do bloco A"
 *     responses:
 *       200:
 *         description: ✅ Scanner atualizado
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
 *                   $ref: '#/components/schemas/Scanner'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     tags: [Scanners]
 *     summary: 🗑️ Remover scanner do sistema
 *     description: |
 *       **Remove um scanner** do sistema permanentemente.
 *
 *       ### ⚠️ Atenção:
 *       - Operação irreversível
 *       - Histórico de scans é mantido
 *       - Requer confirmação administrativa
 *
 *       ### 📊 Impacto:
 *       - Scanner não receberá mais dados
 *       - Relatórios históricos preservados
 *       - Notificação via WebSocket
 *     security:
 *       - BearerAuth: []
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
 *         description: ✅ Scanner removido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "Scanner removido com sucesso"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  "/scanners/:id",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController?.getScannerById(req, res)
);

router.put(
  "/scanners/:id",
  authenticateToken,
  validateRequest({ params: uuidParamSchema, body: updateScannerSchema }),
  (req, res) => scannerController?.updateScanner(req, res)
);

router.delete(
  "/scanners/:id",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController?.deleteScanner(req, res)
);

/**
 * @swagger
 * /scans/pending-scanners:
 *   get:
 *     tags: [Pending Scanners]
 *     summary: 📋 Lista scanners pendentes de aprovação
 *     description: |
 *       **Obtém lista de scanners** detectados automaticamente aguardando aprovação.
 *
 *       ### 🔍 Auto-descoberta:
 *       - Scanners desconhecidos são registrados automaticamente
 *       - Status inicial: "pending"
 *       - Informações coletadas: MAC, IP, nome sugerido
 *
 *       ### 📊 Dados Incluídos:
 *       - Primeira e última detecção
 *       - Contagem de tentativas de scan
 *       - Nome sugerido baseado no MAC
 *       - Status de aprovação
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending]
 *           default: pending
 *         description: Filtrar por status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [first_seen, last_seen, scan_count]
 *           default: last_seen
 *         description: Ordenar por campo
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordem de classificação
 *     responses:
 *       200:
 *         description: ✅ Lista de scanners pendentes
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
 *                     $ref: '#/components/schemas/PendingScanner'
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_pending:
 *                       type: integer
 *                     newest_detection:
 *                       type: string
 *                       format: date-time
 *                     most_active:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/pending-scanners", authenticateToken, (req, res) =>
  scannerController?.listPendingScanners(req, res)
);

/**
 * @swagger
 * /scans/pending-scanners/{id}/approve:
 *   post:
 *     tags: [Pending Scanners]
 *     summary: ✅ Aprovar scanner pendente
 *     description: |
 *       **Aprova um scanner pendente** e o registra como ativo no sistema.
 *
 *       ### 🔄 Processo de Aprovação:
 *       1. Validação do scanner pendente
 *       2. Verificação de duplicatas
 *       3. Criação do scanner ativo
 *       4. Remoção da lista de pendentes
 *       5. Notificação via WebSocket
 *
 *       ### 📝 Dados Obrigatórios:
 *       - Nome do scanner
 *       - Custódia associada (opcional)
 *
 *       ### ✨ Pós-aprovação:
 *       - Scanner fica disponível para receber dados
 *       - Histórico de tentativas preservado
 *       - Status atualizado para "ativo"
 *     security:
 *       - BearerAuth: []
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Scanner Bloco A - Sala 205"
 *                 description: Nome oficial do scanner
 *               safekeeping_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID da custódia associada (opcional)
 *               description:
 *                 type: string
 *                 example: "Scanner principal do depósito central"
 *                 description: Descrição detalhada (opcional)
 *           example:
 *             name: "Scanner Bloco A - Sala 205"
 *             safekeeping_id: "123e4567-e89b-12d3-a456-426614174000"
 *             description: "Scanner RFID para monitoramento de evidências"
 *     responses:
 *       200:
 *         description: ✅ Scanner aprovado com sucesso
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
 *                   example: "Scanner aprovado e registrado com sucesso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     scanner:
 *                       $ref: '#/components/schemas/Scanner'
 *                     previous_attempts:
 *                       type: integer
 *                       example: 15
 *                     approved_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: ❌ Scanner pendente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Scanner pendente não encontrado"
 *       409:
 *         description: ⚠️ Scanner já está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Scanner com este MAC já está registrado"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/pending-scanners/:id/approve",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController?.approvePendingScanner(req, res)
);

/**
 * @swagger
 * /scans/pending-scanners/{id}:
 *   delete:
 *     tags: [Pending Scanners]
 *     summary: ❌ Rejeitar scanner pendente
 *     description: |
 *       **Rejeita um scanner pendente** e o remove da lista de aprovação.
 *
 *       ### 🚫 Processo de Rejeição:
 *       1. Localização do scanner pendente
 *       2. Remoção da base de dados
 *       3. Log da ação administrativa
 *       4. Notificação via WebSocket
 *
 *       ### ⚠️ Consequências:
 *       - Scanner é removido permanentemente
 *       - Futuras tentativas serão registradas novamente
 *       - Histórico de tentativas é perdido
 *
 *       ### 💡 Alternativa:
 *       - Use aprovação com status "inativo" para manter controle
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do scanner pendente para rejeitar
 *     responses:
 *       200:
 *         description: ✅ Scanner rejeitado
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
 *                   example: "Scanner pendente rejeitado e removido"
 *                 data:
 *                   type: object
 *                   properties:
 *                     rejected_scanner:
 *                       type: object
 *                       properties:
 *                         mac_address:
 *                           type: string
 *                         attempts:
 *                           type: integer
 *                         rejected_at:
 *                           type: string
 *                           format: date-time
 *                         rejected_by:
 *                           type: string
 *       404:
 *         description: ❌ Scanner pendente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Scanner pendente não encontrado"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete(
  "/pending-scanners/:id",
  authenticateToken,
  validateRequest({ params: uuidParamSchema }),
  (req, res) => scannerController?.rejectPendingScanner(req, res)
);

/**
 * @swagger
 * /scans/status:
 *   get:
 *     tags: [Scanners]
 *     summary: 📊 Status geral do sistema de scanners
 *     description: |
 *       **Visão geral completa** do status de todos os scanners do sistema.
 *
 *       ### 📈 Métricas Incluídas:
 *       - Scanners ativos vs inativos
 *       - Scanners pendentes de aprovação
 *       - Atividade recente (24h)
 *       - Performance e uptime
 *       - Alertas e problemas
 *
 *       ### 🎯 Ideal Para:
 *       - Dashboard administrativo
 *       - Monitoramento em tempo real
 *       - Relatórios de status
 *       - Health checks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_inactive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir scanners inativos
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           enum: ['1h', '24h', '7d', '30d']
 *           default: '24h'
 *         description: Período para métricas de atividade
 *     responses:
 *       200:
 *         description: ✅ Status do sistema
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_scanners:
 *                           type: integer
 *                           example: 15
 *                         active_scanners:
 *                           type: integer
 *                           example: 12
 *                         inactive_scanners:
 *                           type: integer
 *                           example: 2
 *                         maintenance_scanners:
 *                           type: integer
 *                           example: 1
 *                         pending_scanners:
 *                           type: integer
 *                           example: 3
 *                     activity:
 *                       type: object
 *                       properties:
 *                         scans_last_24h:
 *                           type: integer
 *                           example: 1247
 *                         tags_processed:
 *                           type: integer
 *                           example: 856
 *                         alerts_generated:
 *                           type: integer
 *                           example: 5
 *                     performance:
 *                       type: object
 *                       properties:
 *                         average_response_time:
 *                           type: number
 *                           example: 0.234
 *                         uptime_percentage:
 *                           type: number
 *                           example: 99.8
 *                         error_rate:
 *                           type: number
 *                           example: 0.02
 *                     top_scanners:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           scan_count:
 *                             type: integer
 *                           last_activity:
 *                             type: string
 *                             format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/status", authenticateToken, (req, res) =>
  scannerController?.getScannerStatus(req, res)
);

/**
 * @swagger
 * /scans/recent:
 *   get:
 *     tags: [Scanners]
 *     summary: 🕒 Histórico recente de scans
 *     description: |
 *       **Obtém histórico recente** de todas as atividades de scan do sistema.
 *
 *       ### 📋 Dados Incluídos:
 *       - Timestamp de cada scan
 *       - Scanner responsável
 *       - Tags processadas
 *       - Status de processamento
 *       - Alertas gerados
 *
 *       ### 🔍 Filtros Disponíveis:
 *       - Por período de tempo
 *       - Por scanner específico
 *       - Por status de processamento
 *       - Por tipo de alerta
 *
 *       ### 📊 Ordenação:
 *       - Por data (mais recente primeiro)
 *       - Paginação disponível
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Número máximo de registros
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Número de registros para pular
 *       - in: query
 *         name: scanner_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por scanner específico
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Mostrar apenas scans após esta data
 *       - in: query
 *         name: include_pending
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir tentativas de scanners pendentes
 *     responses:
 *       200:
 *         description: ✅ Histórico de scans
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
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       scanner:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                       tags_processed:
 *                         type: integer
 *                       alerts_generated:
 *                         type: integer
 *                       processing_time:
 *                         type: number
 *                       status:
 *                         type: string
 *                         enum: [success, warning, error, pending]
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     has_more:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/recent", authenticateToken, (req, res) =>
  scannerController?.getRecentScans(req, res)
);

/**
 * @swagger
 * components:
 *   responses:
 *     Unauthorized:
 *       description: ❌ Token de autenticação inválido ou ausente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             message: "Token inválido ou expirado"
 *     BadRequest:
 *       description: ❌ Dados inválidos na requisição
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             message: "Dados inválidos"
 *             error: "MAC address é obrigatório"
 *     NotFound:
 *       description: ❌ Recurso não encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             message: "Scanner não encontrado"
 *     InternalError:
 *       description: ❌ Erro interno do servidor
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             message: "Erro interno do servidor"
 *             error: "Database connection failed"
 */

// ========== NOVOS ENDPOINTS PARA MONITORAMENTO EM TEMPO REAL ==========

/**
 * @swagger
 * /scans/antenna/{antennaIP}/sdcard:
 *   get:
 *     tags: [Scanners]
 *     summary: 📡 Consultar leituras atuais do SD card de uma antena
 *     description: |
 *       Consulta diretamente o endpoint `/getTagSDCard` de uma antena específica
 *       para obter as leituras armazenadas no cartão SD em tempo real.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: antennaIP
 *         required: true
 *         schema:
 *           type: string
 *         description: "IP da antena (ex: 192.168.2.100)"
 *         example: "192.168.2.100"
 *     responses:
 *       200:
 *         description: Dados do SD card obtidos com sucesso
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
 *                   example: "Dados do SD card obtidos com sucesso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     antenna_ip:
 *                       type: string
 *                       example: "192.168.2.100"
 *                     antenna_mac:
 *                       type: string
 *                       example: "54:43:B2:95:0C:50"
 *                     antenna_name:
 *                       type: string
 *                       example: "AntenaSalaFabTeste"
 *                     total_readings:
 *                       type: integer
 *                       example: 6
 *                     unique_tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["E2801191A50300653CF11502"]
 *                     readings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AntennaReading'
 *                     status:
 *                       type: string
 *                       enum: [online, offline]
 *                       example: "online"
 *       400:
 *         description: "IP da antena não fornecido"
 *       500:
 *         description: "Erro ao consultar antena (offline, timeout, etc.)"
 */
router.get("/antenna/:antennaIP/sdcard", authenticateToken, (req, res) =>
  scannerController.getAntennaSDCardData(req, res)
);

/**
 * @swagger
 * /scans/safekeeping/{safekeepingId}/antennas:
 *   get:
 *     tags: [Scanners]
 *     summary: 📡 Consultar todas as antenas de uma custódia
 *     description: |
 *       Consulta os dados de SD card de todas as antenas associadas aos scanners
 *       de uma custódia específica.
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
 *         description: Dados das antenas obtidos com sucesso
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
 *                   example: "Dados de 2 antena(s) obtidos com sucesso"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AntennaCurrentStatus'
 *       400:
 *         description: ID da custódia não fornecido
 *       500:
 *         description: Erro interno do servidor
 */
router.get(
  "/safekeeping/:safekeepingId/antennas",
  authenticateToken,
  (req, res) => scannerController.getSafekeepingAntennasData(req, res)
);

export default router;
