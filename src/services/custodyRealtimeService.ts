import { SafekeepingRealtimeStatus } from "../types";
import { db } from "../config/database";
import { AntennaService } from "./antennaService";

export class CustodyRealtimeService {
  private antennaService = new AntennaService();

  /**
   * Obtém o status em tempo real de uma custódia específica
   */
  async getSafekeepingRealtimeStatus(
    safekeepingId: string
  ): Promise<SafekeepingRealtimeStatus | null> {
    try {
      console.log(
        `🏢 [CUSTODY REALTIME] Buscando status da custódia: ${safekeepingId}`
      );

      // Buscar informações da custódia
      const safekeeping = await db.safekeepings.findUnique({
        where: { id: safekeepingId },
        include: {
          evidences: {
            include: {
              tags: true,
            },
          },
          scanners: {
            where: { status: "ativo" },
          },
        },
      });

      if (!safekeeping) {
        return null;
      }

      // Consultar dados atuais das antenas
      const antennasData = await this.antennaService.getSafekeepingAntennasData(
        safekeepingId
      );

      // Combinar todas as tags detectadas pelas antenas
      const currentlyDetectedTags = new Set<string>();
      antennasData.forEach((antenna) => {
        antenna.unique_tags.forEach((tag) => currentlyDetectedTags.add(tag));
      });

      console.log(
        `📡 [CUSTODY REALTIME] Tags detectadas atualmente:`,
        Array.from(currentlyDetectedTags)
      );

      // Processar cada evidência
      const evidences = safekeeping.evidences.map((evidence) => {
        const tagId = evidence.tags?.tag_id;
        const isCurrentlyPresent = tagId
          ? currentlyDetectedTags.has(tagId)
          : false;
        const expectedPresent = evidence.status === "Em Custódia";

        return {
          id: evidence.id,
          name: evidence.name,
          tag_id: tagId || null,
          expected_present: expectedPresent,
          currently_present: isCurrentlyPresent,
          last_seen_at: evidence.updated_at, // ou buscar do histórico de scans
          status_changed_at: new Date(), // timestamp da mudança de status
        };
      });

      // Calcular estatísticas
      const totalEvidences = evidences.length;
      const expectedPresent = evidences.filter(
        (e) => e.expected_present
      ).length;
      const currentlyPresent = evidences.filter(
        (e) => e.currently_present
      ).length;
      const missing = evidences.filter(
        (e) => e.expected_present && !e.currently_present
      ).length;
      const unexpected = evidences.filter(
        (e) => !e.expected_present && e.currently_present
      ).length;

      // Pegar informações do primeiro scanner (assumindo um scanner por custódia)
      const primaryScanner = safekeeping.scanners[0];
      const primaryAntenna = antennasData[0];

      const result: SafekeepingRealtimeStatus = {
        safekeeping_id: safekeeping.id,
        safekeeping_name: safekeeping.name,
        scanner: {
          id: primaryScanner?.id || "unknown",
          name: primaryScanner?.name || "No Scanner",
          mac_address: primaryScanner?.mac_address || "unknown",
          antenna_ip: primaryAntenna?.antenna_ip || undefined,
          status: primaryAntenna?.status || "offline",
          last_scan: primaryScanner?.last_scan || undefined,
        },
        evidences,
        summary: {
          total_evidences: totalEvidences,
          expected_present: expectedPresent,
          currently_present: currentlyPresent,
          missing,
          unexpected,
        },
        last_updated: new Date(),
      };

      console.log(`✅ [CUSTODY REALTIME] Status calculado:`, {
        safekeeping: result.safekeeping_name,
        total: result.summary.total_evidences,
        present: result.summary.currently_present,
        missing: result.summary.missing,
        unexpected: result.summary.unexpected,
      });

      return result;
    } catch (error) {
      console.error(`❌ [CUSTODY REALTIME] Erro ao obter status:`, error);
      return null;
    }
  }

  /**
   * Compara o status atual com o esperado e retorna alertas
   */
  async getSafekeepingAlerts(safekeepingId: string): Promise<{
    missing: Array<{ id: string; name: string; tag_id: string }>;
    unexpected: Array<{ tag_id: string; evidence_name?: string }>;
  }> {
    const status = await this.getSafekeepingRealtimeStatus(safekeepingId);

    if (!status) {
      return { missing: [], unexpected: [] };
    }

    const missing = status.evidences
      .filter((e) => e.expected_present && !e.currently_present && e.tag_id)
      .map((e) => ({
        id: e.id,
        name: e.name,
        tag_id: e.tag_id!,
      }));

    const unexpected = status.evidences
      .filter((e) => !e.expected_present && e.currently_present && e.tag_id)
      .map((e) => ({
        tag_id: e.tag_id!,
        evidence_name: e.name,
      }));

    return { missing, unexpected };
  }

  /**
   * Obtém o histórico de presença de uma custódia
   */
  async getSafekeepingPresenceHistory(
    safekeepingId: string,
    hours: number = 24
  ): Promise<
    Array<{
      timestamp: Date;
      tags_present: string[];
      evidences_present: number;
      total_evidences: number;
    }>
  > {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      // Buscar scans recentes da custódia
      const recentScans = await db.scans.findMany({
        where: {
          scanners: {
            safekeeping_id: safekeepingId,
          },
          created_at: {
            gte: cutoffTime,
          },
        },
        include: {
          tags: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Agrupar por períodos de tempo (ex: a cada hora)
      const history: Array<{
        timestamp: Date;
        tags_present: string[];
        evidences_present: number;
        total_evidences: number;
      }> = [];

      // Implementação simplificada - você pode melhorar a lógica de agrupamento
      const groupedScans = new Map<string, string[]>();

      recentScans.forEach((scan) => {
        const hourKey = new Date(scan.created_at)
          .toISOString()
          .substring(0, 13); // YYYY-MM-DDTHH
        if (!groupedScans.has(hourKey)) {
          groupedScans.set(hourKey, []);
        }
        groupedScans.get(hourKey)!.push(scan.tags.tag_id);
      });

      // Converter para o formato de retorno
      for (const [hourKey, tags] of groupedScans.entries()) {
        const uniqueTags = [...new Set(tags)];
        history.push({
          timestamp: new Date(hourKey + ":00:00.000Z"),
          tags_present: uniqueTags,
          evidences_present: uniqueTags.length,
          total_evidences: 0, // seria necessário calcular baseado no estado naquele momento
        });
      }

      return history.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    } catch (error) {
      console.error(`❌ [CUSTODY REALTIME] Erro ao obter histórico:`, error);
      return [];
    }
  }
}
