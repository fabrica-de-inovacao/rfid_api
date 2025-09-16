import { PrismaClient } from "@prisma/client";
import { WebSocketService } from "./websocketService";
import { config } from "../config/env";

export class PresenceMonitorService {
  private prisma: PrismaClient;
  private websocketService?: WebSocketService;
  private intervalId?: NodeJS.Timeout;

  constructor(websocketService?: WebSocketService) {
    this.prisma = new PrismaClient();
    this.websocketService = websocketService;
  }

  /**
   * Inicia o monitoramento automático de presença
   */
  public startMonitoring() {
    console.log("🔍 Iniciando monitoramento de presença de tags...");

    // Executar no intervalo configurável
    const interval = config.rfid.presencePollMs;
    console.log(`⏱️ Intervalo do PresenceMonitor: ${interval}ms`);
    this.intervalId = setInterval(async () => {
      await this.checkAbsentTags();
    }, interval);

    // Executar uma vez imediatamente
    this.checkAbsentTags();
  }

  /**
   * Para o monitoramento automático
   */
  public stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log("⏹️ Monitoramento de presença parado");
    }
  }

  /**
   * Verifica tags que devem ser consideradas ausentes baseado nos scans recentes
   */
  private async checkAbsentTags() {
    try {
      const timeoutSeconds = config.rfid.presenceTimeoutSeconds;
      const cutoffTime = new Date(Date.now() - timeoutSeconds * 1000);

      console.log(
        `🕒 Verificando tags não detectadas há mais de ${timeoutSeconds}s (desde ${cutoffTime.toISOString()})`
      );

      // Buscar evidências em custódia que não têm scan recente
      const potentiallyAbsentTags = await this.prisma.evidences.findMany({
        where: {
          safekeeping_id: { not: null }, // Apenas evidências em custódia
        },
        include: {
          safekeepings: {
            select: {
              id: true,
              name: true,
            },
          },
          tags: {
            select: {
              id: true,
              tag_id: true,
              scans: {
                where: { scanner_id: { not: null } },
                orderBy: {
                  created_at: "desc",
                },
                take: 1, // Último scan
              },
            },
          },
        },
      });

      const absentTags = potentiallyAbsentTags.filter((evidence) => {
        if (!evidence.tags?.scans || evidence.tags.scans.length === 0) {
          return true; // Nunca foi detectada
        }

        const lastScan = evidence.tags.scans[0];
        return lastScan.created_at < cutoffTime; // Último scan muito antigo
      });

      if (absentTags.length > 0) {
        console.log(
          `⚠️ Encontradas ${absentTags.length} tags que devem ser consideradas ausentes`
        );

        for (const evidence of absentTags) {
          await this.markTagAsAbsent(evidence);
        }
      } else {
        console.log(
          "✅ Todas as tags em custódia foram detectadas recentemente"
        );
      }
    } catch (error) {
      console.error("❌ Erro ao verificar tags ausentes:", error);
    }
  }

  /**
   * Marca uma tag como ausente e notifica via WebSocket
   */
  private async markTagAsAbsent(evidence: any) {
    try {
      console.log(
        `⚠️ Detectando ausência de evidência: ${evidence.name} (${evidence.tags?.tag_id})`
      );

      const lastScan = evidence.tags?.scans?.[0];
      const lastSeenAt = lastScan?.created_at || evidence.created_at;

      // Importante: NÃO criar registros na tabela 'scans' para ausência.
      // Gravar um 'scan' aqui faria o sistema entender que a tag foi
      // detectada recentemente, mascarando a ausência e causando
      // inconsistências no cálculo de presença. Em vez disso, apenas
      // notificamos via WebSocket. Persistência de ausência deve ser feita
      // em uma estrutura apropriada (ex.: activity_logs ou uma tabela
      // específica), não como 'scan'.

      // Preparar dados para WebSocket
      const alertData = {
        evidence: {
          id: evidence.id,
          name: evidence.name,
          tag_id: evidence.tags?.tag_id,
          safekeeping: evidence.safekeepings?.name,
          status: "AUSENTE",
        },
        last_seen_at: lastSeenAt,
        timeout_seconds: config.rfid.presenceTimeoutSeconds,
        detected_at: new Date(),
      };

      // Notificar via WebSocket
      if (this.websocketService) {
        this.websocketService.broadcast({
          type: "evidence_absence_alert",
          data: alertData,
          timestamp: new Date(),
        });

        console.log("📡 Alerta de ausência enviado via WebSocket");
      }

      console.log(
        `✅ Ausência da evidência ${evidence.name} detectada e notificada`
      );
    } catch (error) {
      console.error(
        `❌ Erro ao processar ausência da evidência (${evidence.name}):`,
        error
      );
    }
  }

  /**
   * Força verificação imediata de tags ausentes
   */
  public async forceCheck(): Promise<void> {
    await this.checkAbsentTags();
  }

  /**
   * Define o serviço WebSocket para notificações
   */
  public setWebSocketService(websocketService: WebSocketService) {
    this.websocketService = websocketService;
  }

  /**
   * Cleanup dos recursos
   */
  public async close() {
    this.stopMonitoring();
    await this.prisma.$disconnect();
  }
}
