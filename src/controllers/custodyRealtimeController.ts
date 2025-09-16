import { Request, Response } from "express";
import { CustodyRealtimeService } from "../services/custodyRealtimeService";
import { WebSocketService } from "../services/websocketService";

export class CustodyRealtimeController {
  private custodyService = new CustodyRealtimeService();
  private websocketService: WebSocketService;

  constructor(websocketService: WebSocketService) {
    this.websocketService = websocketService;
  }

  /**
   * Obter status em tempo real de uma custódia
   */
  getSafekeepingRealtimeStatus = async (
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

      console.log(
        `🏢 [CUSTODY CONTROLLER] Consultando status em tempo real: ${safekeepingId}`
      );

      const status = await this.custodyService.getSafekeepingRealtimeStatus(
        safekeepingId
      );

      if (!status) {
        res.status(404).json({
          success: false,
          message: "Custódia não encontrada",
        });
        return;
      }

      // Notificar via WebSocket sobre a consulta
      this.websocketService.broadcast({
        type: "custody_status_requested",
        data: {
          safekeeping_id: safekeepingId,
          timestamp: new Date(),
          summary: status.summary,
        },
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: "Status em tempo real obtido com sucesso",
        data: status,
      });
    } catch (error) {
      console.error("[getSafekeepingRealtimeStatus] Erro:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  /**
   * Obter alertas de uma custódia (provas ausentes ou inesperadas)
   */
  getSafekeepingAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { safekeepingId } = req.params;

      if (!safekeepingId) {
        res.status(400).json({
          success: false,
          message: "ID da custódia é obrigatório",
        });
        return;
      }

      console.log(
        `🚨 [CUSTODY CONTROLLER] Consultando alertas: ${safekeepingId}`
      );

      const alerts = await this.custodyService.getSafekeepingAlerts(
        safekeepingId
      );

      const hasAlerts =
        alerts.missing.length > 0 || alerts.unexpected.length > 0;

      if (hasAlerts) {
        // Notificar via WebSocket sobre alertas detectados
        this.websocketService.broadcast({
          type: "custody_alerts",
          data: {
            safekeeping_id: safekeepingId,
            alerts,
            timestamp: new Date(),
          },
          timestamp: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: hasAlerts ? "Alertas detectados" : "Nenhum alerta encontrado",
        data: {
          has_alerts: hasAlerts,
          missing_count: alerts.missing.length,
          unexpected_count: alerts.unexpected.length,
          ...alerts,
        },
      });
    } catch (error) {
      console.error("[getSafekeepingAlerts] Erro:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  /**
   * Obter histórico de presença de uma custódia
   */
  getSafekeepingPresenceHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { safekeepingId } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;

      if (!safekeepingId) {
        res.status(400).json({
          success: false,
          message: "ID da custódia é obrigatório",
        });
        return;
      }

      if (hours < 1 || hours > 168) {
        // máximo 7 dias
        res.status(400).json({
          success: false,
          message: "Período deve estar entre 1 e 168 horas",
        });
        return;
      }

      console.log(
        `📊 [CUSTODY CONTROLLER] Consultando histórico: ${safekeepingId} (${hours}h)`
      );

      const history = await this.custodyService.getSafekeepingPresenceHistory(
        safekeepingId,
        hours
      );

      res.status(200).json({
        success: true,
        message: `Histórico de ${hours} horas obtido com sucesso`,
        data: {
          safekeeping_id: safekeepingId,
          period_hours: hours,
          history_points: history.length,
          history,
        },
      });
    } catch (error) {
      console.error("[getSafekeepingPresenceHistory] Erro:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  /**
   * Iniciar monitoramento contínuo de uma custódia (WebSocket)
   */
  startCustodyMonitoring = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { safekeepingId } = req.params;
      const intervalMinutes = parseInt(req.query.interval as string) || 5;

      if (!safekeepingId) {
        res.status(400).json({
          success: false,
          message: "ID da custódia é obrigatório",
        });
        return;
      }

      if (intervalMinutes < 1 || intervalMinutes > 60) {
        res.status(400).json({
          success: false,
          message: "Intervalo deve estar entre 1 e 60 minutos",
        });
        return;
      }

      console.log(
        `🔄 [CUSTODY CONTROLLER] Iniciando monitoramento: ${safekeepingId} (${intervalMinutes}min)`
      );

      // Configurar intervalo de monitoramento
      const monitoringId = `custody_${safekeepingId}_${Date.now()}`;

      const interval = setInterval(async () => {
        try {
          const status = await this.custodyService.getSafekeepingRealtimeStatus(
            safekeepingId
          );
          const alerts = await this.custodyService.getSafekeepingAlerts(
            safekeepingId
          );

          if (status) {
            this.websocketService.broadcast({
              type: "custody_monitoring_update",
              data: {
                monitoring_id: monitoringId,
                status,
                alerts,
                timestamp: new Date(),
              },
              timestamp: new Date(),
            });
          }
        } catch (error) {
          console.error(
            `❌ [CUSTODY MONITORING] Erro no monitoramento ${monitoringId}:`,
            error
          );
        }
      }, intervalMinutes * 60 * 1000);

      // Armazenar o interval para poder cancelar depois (implementação simplificada)
      // Em produção, você deveria usar um sistema mais robusto de jobs
      (global as any).custodyMonitoringIntervals =
        (global as any).custodyMonitoringIntervals || new Map();
      (global as any).custodyMonitoringIntervals.set(monitoringId, interval);

      res.status(200).json({
        success: true,
        message: "Monitoramento iniciado com sucesso",
        data: {
          monitoring_id: monitoringId,
          safekeeping_id: safekeepingId,
          interval_minutes: intervalMinutes,
          status: "active",
        },
      });
    } catch (error) {
      console.error("[startCustodyMonitoring] Erro:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  /**
   * Parar monitoramento contínuo
   */
  stopCustodyMonitoring = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { monitoringId } = req.params;

      if (!monitoringId) {
        res.status(400).json({
          success: false,
          message: "ID do monitoramento é obrigatório",
        });
        return;
      }

      const intervals = (global as any).custodyMonitoringIntervals;
      if (intervals && intervals.has(monitoringId)) {
        clearInterval(intervals.get(monitoringId));
        intervals.delete(monitoringId);

        res.status(200).json({
          success: true,
          message: "Monitoramento parado com sucesso",
          data: {
            monitoring_id: monitoringId,
            status: "stopped",
          },
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Monitoramento não encontrado",
        });
      }
    } catch (error) {
      console.error("[stopCustodyMonitoring] Erro:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };
}
