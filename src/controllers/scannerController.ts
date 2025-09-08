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
      res.status(200).json(scanners);
    } catch (error) {
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
      const scans = await this.scannerService.getRecentScans(limit);
      res.status(200).json(scans);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };
}
