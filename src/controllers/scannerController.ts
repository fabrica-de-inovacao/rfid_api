import { Request, Response } from "express";
import { ScannerService } from "../services/scannerService";
import { WebSocketService } from "../services/websocketService";

export class ScannerController {
  private scannerService = new ScannerService();
  private websocketService: WebSocketService;

  constructor(websocketService: WebSocketService) {
    this.websocketService = websocketService;
  }

  processScannerReport = async (req: Request, res: Response): Promise<void> => {
    try {
      // 🔍 LOG: Requisição recebida no endpoint /scans/report
      console.log("📡 [SCANNER ENDPOINT] Requisição recebida:", {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        contentLength: req.get("Content-Length"),
        bodyType: Array.isArray(req.body) ? "ESP32_ARRAY" : "STANDARD_OBJECT",
        bodySize: JSON.stringify(req.body).length,
        headers: {
          "x-api-key": req.get("X-API-Key") ? "***PRESENTE***" : "AUSENTE",
          "content-type": req.get("Content-Type"),
        },
      });

      // 🔍 LOG: Dados recebidos (estrutura)
      if (Array.isArray(req.body)) {
        console.log("📡 [SCANNER DATA] Formato ESP32 detectado:", {
          totalReadings: req.body.length,
          firstReading: req.body[0]
            ? {
                mac: req.body[0].reading_reader_mac,
                ip: req.body[0].reading_reader_ip,
                name: req.body[0].reading_reader_name,
                epc: req.body[0].reading_epc_hex,
              }
            : null,
          uniqueMACs: [...new Set(req.body.map((r) => r.reading_reader_mac))],
          uniqueEPCs: [...new Set(req.body.map((r) => r.reading_epc_hex))],
        });
      } else {
        console.log("📡 [SCANNER DATA] Formato padrão detectado:", {
          mac: req.body.mac_address,
          ip: req.body.reader_ip,
          name: req.body.reader_name,
          tagsCount: req.body.tags?.length || 0,
          tags: req.body.tags,
        });
      }

      const scanResult = await this.scannerService.processScannerReport(
        req.body
      );

      // 🔍 LOG: Resultado do processamento
      console.log("✅ [SCAN RESULT] Processamento concluído:", {
        timestamp: new Date().toISOString(),
        scanner: {
          name: scanResult.scanner?.name,
          status: scanResult.scanner?.status,
          safekeeping:
            typeof scanResult.scanner?.safekeeping === "string"
              ? scanResult.scanner.safekeeping
              : scanResult.scanner?.safekeeping || null,
        },
        tagsProcessed: scanResult.tags_processed?.length || 0,
        pending: scanResult.pending || false,
        alerts:
          scanResult.tags_processed?.filter((tag) => tag.alert)?.length || 0,
        processedTags:
          scanResult.tags_processed?.map((tag) => ({
            tagUid: tag.tag_uid,
            evidenceId: tag.evidence?.id || null,
            evidenceName: tag.evidence?.name || null,
            alert: tag.alert || false,
            scannerName: tag.scanner?.name || "Unknown",
          })) || [],
      });

      // Notificar clientes WebSocket sobre os resultados do scan
      this.websocketService.notifyEvidenceScan(scanResult);

      // Verificar se há alertas (provas fora da custódia correta)
      const alerts = scanResult.tags_processed.filter((tag) => tag.alert);
      if (alerts.length > 0) {
        console.log("🚨 [ALERT] Alertas detectados:", {
          count: alerts.length,
          alerts: alerts.map((alert) => ({
            tagUid: alert.tag_uid,
            evidenceId: alert.evidence?.id || null,
            evidenceName: alert.evidence?.name || null,
            evidenceStatus: alert.evidence?.status || null,
            currentSafekeeping: alert.evidence?.safekeeping || null,
            scannerSafekeeping: alert.scanner?.safekeeping || null,
          })),
        });

        this.websocketService.broadcast({
          type: "evidence_scan",
          data: {
            type: "alert",
            message: `${alerts.length} prova(s) detectada(s) fora da custódia correta`,
            alerts,
          },
          timestamp: new Date(),
        });
      }

      console.log("📤 [RESPONSE] Enviando status 204 (No Content)");
      res.status(204).send();
    } catch (error) {
      // 🔍 LOG: Erro no processamento
      console.error("❌ [SCANNER ERROR] Erro ao processar requisição:", {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : null,
        requestData: {
          bodyType: Array.isArray(req.body) ? "ESP32_ARRAY" : "STANDARD_OBJECT",
          bodySize: JSON.stringify(req.body).length,
          ip: req.ip || req.connection.remoteAddress,
        },
      });

      if (
        error instanceof Error &&
        error.message === "Scanner não encontrado"
      ) {
        console.log(
          "📤 [RESPONSE] Enviando status 404 (Scanner não encontrado)"
        );
        res.status(404).json({ message: error.message });
        return;
      }

      console.log("📤 [RESPONSE] Enviando status 400 (Bad Request)");
      res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Erro ao processar relatório do scanner",
      });
    }
  };

  getScannerStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const scanners = await this.scannerService.getScannerStatus();
      res.status(200).json(scanners);
    } catch (error) {
      console.error("[getScannerStatus] Erro:", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  getRecentScans = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const includePending = req.query.include_pending === "true";

      const scans = await this.scannerService.getRecentScans(limit, {
        include_pending: includePending,
      });
      res.status(200).json(scans);
    } catch (error) {
      console.error("[getRecentScans] Erro:", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  // ========== ENDPOINTS ADMINISTRATIVOS DE SCANNERS ==========

  /**
   * Criar um novo scanner
   */
  createScanner = async (req: Request, res: Response): Promise<void> => {
    try {
      const scanner = await this.scannerService.createScanner(req.body);
      res.status(201).json({
        success: true,
        message: "Scanner criado com sucesso",
        data: scanner,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao criar scanner",
      });
    }
  };

  /**
   * Listar todos os scanners
   */
  listScanners = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, safekeeping_id, include_stats } = req.query;

      const filters = {
        ...(status && { status: status as string }),
        ...(safekeeping_id && { safekeeping_id: safekeeping_id as string }),
        include_stats: include_stats === "true",
      };

      const scanners = await this.scannerService.listScanners(filters);
      res.status(200).json({
        success: true,
        data: scanners,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao listar scanners",
      });
    }
  };

  /**
   * Obter detalhes de um scanner específico
   */
  getScannerById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const scanner = await this.scannerService.getScannerById(id);

      res.status(200).json({
        success: true,
        data: scanner,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Scanner não encontrado",
      });
    }
  };

  /**
   * Atualizar um scanner existente
   */
  updateScanner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const scanner = await this.scannerService.updateScanner(id, req.body);

      res.status(200).json({
        success: true,
        message: "Scanner atualizado com sucesso",
        data: scanner,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao atualizar scanner",
      });
    }
  };

  /**
   * Deletar um scanner
   */
  deleteScanner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.scannerService.deleteScanner(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao deletar scanner",
      });
    }
  };

  // ========== ENDPOINTS DE SCANNERS PENDENTES ==========

  /**
   * Listar scanners pendentes
   */
  listPendingScanners = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.query;
      const pendingScanners = await this.scannerService.listPendingScanners({
        status: status as string,
      });

      res.status(200).json({
        success: true,
        data: pendingScanners,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro ao listar scanners pendentes",
      });
    }
  };

  /**
   * Aprovar um scanner pendente (criar scanner oficial)
   */
  approvePendingScanner = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, safekeeping_id } = req.body;

      const result = await this.scannerService.approvePendingScanner(id, {
        name,
        safekeeping_id,
      });

      res.status(201).json({
        success: true,
        message: "Scanner aprovado e criado com sucesso",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao aprovar scanner",
      });
    }
  };

  /**
   * Rejeitar um scanner pendente
   */
  rejectPendingScanner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.scannerService.rejectPendingScanner(id);

      res.status(200).json({
        success: true,
        message: "Scanner rejeitado com sucesso",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao rejeitar scanner",
      });
    }
  };

  // ========== NOVOS ENDPOINTS PARA MONITORAMENTO EM TEMPO REAL ==========

  /**
   * Consultar leituras atuais do SD card de uma antena específica
   */
  getAntennaSDCardData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { antennaIP } = req.params;

      if (!antennaIP) {
        res.status(400).json({
          success: false,
          message: "IP da antena é obrigatório",
        });
        return;
      }

      const { AntennaService } = await import("../services/antennaService");
      const antennaService = new AntennaService();

      const data = await antennaService.getAntennaSDCardData(antennaIP);

      res.status(200).json({
        success: true,
        message: "Dados do SD card obtidos com sucesso",
        data,
      });
    } catch (error) {
      console.error("[getAntennaSDCardData] Erro:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  /**
   * Consultar dados de todas as antenas de uma custódia
   */
  getSafekeepingAntennasData = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { safekeepingId } = req.params;

      if (!safekeepingId) {
        res.status(400).json({
          success: false,
          message: "ID da custódia é obrigatório",
        });
        return;
      }

      const { AntennaService } = await import("../services/antennaService");
      const antennaService = new AntennaService();

      const data = await antennaService.getSafekeepingAntennasData(
        safekeepingId
      );

      res.status(200).json({
        success: true,
        message: `Dados de ${data.length} antena(s) obtidos com sucesso`,
        data,
      });
    } catch (error) {
      console.error("[getSafekeepingAntennasData] Erro:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };
}
