import { AntennaCurrentStatusData, AntennaSDCardResponse } from "../types";
import { db } from "../config/database";

export class AntennaService {
  /**
   * Consulta as leituras atuais do SD card de uma antena específica
   */
  async getAntennaSDCardData(
    antennaIP: string
  ): Promise<AntennaCurrentStatusData> {
    try {
      console.log(
        `📡 [ANTENNA SERVICE] Consultando SD card da antena: ${antennaIP}`
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

      const response = await fetch(`http://${antennaIP}/getTagSDCard`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "RFID-API-v6.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as AntennaSDCardResponse;

      console.log(
        `✅ [ANTENNA SERVICE] Dados recebidos da antena ${antennaIP}:`,
        {
          status: response.status,
          message: data.message,
          count_files: data.count_files,
          count_readings: data.count_readings,
          dataSize: data.data.length,
        }
      );

      // Extrair tags únicas das leituras
      const uniqueTags = [
        ...new Set(data.data.map((reading) => reading.reading_epc_hex)),
      ];

      // Pegar informações da primeira leitura para metadados
      const firstReading = data.data[0];

      return {
        antenna_ip: antennaIP,
        antenna_mac: firstReading?.reading_reader_mac || "unknown",
        antenna_name: firstReading?.reading_reader_name || "unknown",
        total_readings: data.count_readings,
        unique_tags: uniqueTags,
        readings: data.data,
        last_update: new Date().toISOString(),
        status: "online",
      };
    } catch (error) {
      console.error(
        `❌ [ANTENNA SERVICE] Erro ao consultar antena ${antennaIP}:`,
        {
          error: error instanceof Error ? error.message : "Erro desconhecido",
          type: error?.constructor?.name || "unknown",
        }
      );

      return {
        antenna_ip: antennaIP,
        antenna_mac: "unknown",
        antenna_name: "unknown",
        total_readings: 0,
        unique_tags: [],
        readings: [],
        last_update: new Date().toISOString(),
        status: "offline",
      };
    }
  }

  /**
   * Consulta as leituras de todas as antenas de uma custódia específica
   */
  async getSafekeepingAntennasData(
    safekeepingId: string
  ): Promise<AntennaCurrentStatusData[]> {
    try {
      console.log(
        `📡 [ANTENNA SERVICE] Buscando scanners da custódia: ${safekeepingId}`
      );

      // Buscar todos os scanners da custódia
      const scanners = await db.scanners.findMany({
        where: {
          safekeeping_id: safekeepingId,
          status: "ativo",
        },
        select: {
          id: true,
          name: true,
          mac_address: true,
        },
      });

      console.log(
        `📡 [ANTENNA SERVICE] Encontrados ${scanners.length} scanners ativos`
      );

      const results: AntennaCurrentStatusData[] = [];

      // Para cada scanner, tentar extrair o IP e consultar
      for (const scanner of scanners) {
        const antennaIP = await this.getAntennaIPByScanner(scanner.id);

        if (antennaIP) {
          const data = await this.getAntennaSDCardData(antennaIP);
          results.push(data);
        }
      }

      return results;
    } catch (error) {
      console.error(
        `❌ [ANTENNA SERVICE] Erro ao buscar dados das antenas:`,
        error
      );
      return [];
    }
  }

  /**
   * Método auxiliar para obter o IP da antena baseado no scanner
   */
  private async getAntennaIPByScanner(
    scannerId: string
  ): Promise<string | null> {
    try {
      const scanner = await db.scanners.findUnique({
        where: { id: scannerId },
      });

      if (scanner) {
        // Mapeamento baseado no MAC address ou nome do scanner
        // Você pode configurar este mapeamento conforme sua infraestrutura
        const ipMappings: { [key: string]: string } = {
          // Por MAC address
          "54:43:B2:95:0C:50": "192.168.2.100",

          // Por nome do scanner
          AntenaSalaFabTeste: "192.168.2.100",
          "Scanner-Sala-101": "192.168.1.101",
          "Scanner-Deposito": "192.168.1.102",

          // Adicione mais mapeamentos conforme necessário
        };

        // Tentar por MAC primeiro, depois por nome
        return (
          ipMappings[scanner.mac_address] || ipMappings[scanner.name] || null
        );
      }

      return null;
    } catch (error) {
      console.error(`❌ [ANTENNA SERVICE] Erro ao obter IP da antena:`, error);
      return null;
    }
  }

  /**
   * Atualiza o status de um scanner baseado na resposta da antena
   */
  async updateScannerStatusFromAntenna(
    scannerId: string,
    isOnline: boolean
  ): Promise<void> {
    try {
      await db.scanners.update({
        where: { id: scannerId },
        data: {
          status: isOnline ? "ativo" : "offline",
          last_scan: isOnline ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error(
        `❌ [ANTENNA SERVICE] Erro ao atualizar status do scanner:`,
        error
      );
    }
  }
}
