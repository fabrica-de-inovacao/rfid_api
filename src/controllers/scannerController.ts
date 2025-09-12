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
      const scanResult = await this.scannerService.processScannerReport(
        req.body
      );

      // Notificar clientes WebSocket sobre os resultados do scan
      this.websocketService.notifyEvidenceScan(scanResult);

      // Verificar se há alertas (provas fora da custódia correta)
      const alerts = scanResult.tags_processed.filter((tag) => tag.alert);
      if (alerts.length > 0) {
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

      res.status(204).send();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Scanner não encontrado"
      ) {
        res.status(404).json({ message: error.message });
        return;
      }

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
      console.log(
        `[getScannerStatus] Retornando ${scanners.length} scanners:`,
        scanners
      );
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

      console.log(
        `[getRecentScans] Buscando scans com limit: ${limit}, include_pending: ${includePending}`
      );
      const scans = await this.scannerService.getRecentScans(limit, {
        include_pending: includePending,
      });
      console.log(`[getRecentScans] Retornando ${scans.length} scans:`, scans);
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
}
