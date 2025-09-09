import mqtt from "mqtt";
import { config } from "../config/env";
import { MQTTMessage } from "../types";
import { WebSocketService } from "./websocketService";
import { PrismaClient } from "@prisma/client";

export class MQTTService {
  private client: mqtt.MqttClient;
  private isConnected = false;
  private websocketService?: WebSocketService;
  private prisma: PrismaClient;

  constructor(websocketService?: WebSocketService) {
    this.websocketService = websocketService;
    this.prisma = new PrismaClient();
    this.client = mqtt.connect(config.mqtt.brokerUrl, {
      clientId: config.mqtt.clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on("connect", () => {
      console.log("Conectado ao broker MQTT");
      this.isConnected = true;

      // Subscrever aos tópicos necessários
      this.subscribeToTopics();
    });

    this.client.on("error", (error) => {
      console.error("Erro MQTT:", error);
      this.isConnected = false;
    });

    this.client.on("close", () => {
      console.log("Conexão MQTT fechada");
      this.isConnected = false;
    });

    this.client.on("message", (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  private subscribeToTopics() {
    const topics = [
      "rfid/scanner/+/status",
      "rfid/tag/read/response",
      "rfid/tag/link/response",
    ];

    topics.forEach((topic) => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Erro ao subscrever ao tópico ${topic}:`, err);
        } else {
          console.log(`Subscrito ao tópico: ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Mensagem recebida do tópico ${topic}:`, data);

      // Processar mensagem baseada no tópico
      if (topic.startsWith("rfid/scanner/")) {
        this.handleScannerMessage(topic, data);
      } else if (topic === "rfid/tag/read/response") {
        this.handleTagReadResponse(data);
      } else if (topic === "rfid/tag/link/response") {
        this.handleTagLinkResponse(data);
      }
    } catch (error) {
      console.error("Erro ao processar mensagem MQTT:", error);
    }
  }

  private async handleScannerMessage(topic: string, data: any) {
    try {
      // Extrair ID do scanner do tópico
      const topicParts = topic.split("/");
      const scannerId = topicParts[2];

      console.log(`Status do scanner ${scannerId}:`, data);

      // Atualizar status do scanner no banco de dados
      await this.prisma.scanners.updateMany({
        where: {
          mac_address: scannerId,
        },
        data: {
          status: data.status || "online",
          last_scan: new Date(),
        },
      });

      // Notificar via WebSocket sobre mudança de status
      if (this.websocketService) {
        this.websocketService.broadcast({
          type: "scanner_status",
          data: {
            scanner_id: scannerId,
            status: data.status || "online",
            timestamp: new Date(),
            ...data,
          },
          timestamp: new Date(),
        });
      }

      console.log(`Scanner ${scannerId} atualizado com sucesso`);
    } catch (error) {
      console.error(`Erro ao processar mensagem do scanner:`, error);
    }
  }

  private async handleTagReadResponse(data: any) {
    try {
      console.log("Resposta de leitura de tag:", data);

      const { scanner_id, tag_id, evidence_id, success, error_message } = data;

      if (success && tag_id) {
        // Verificar se a tag existe no sistema
        const existingTag = await this.prisma.tags.findUnique({
          where: { tag_id: tag_id },
        });

        if (existingTag) {
          // Verificar se há uma prova vinculada a essa tag
          const evidence = await this.prisma.evidences.findUnique({
            where: { tag_id: existingTag.id },
            include: {
              users: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          });

          if (evidence) {
            // Registrar scan da prova
            await this.prisma.scans.create({
              data: {
                scanner_id: scanner_id,
                tag_id: existingTag.id,
              },
            });

            // Notificar via WebSocket sobre a leitura da prova
            if (this.websocketService) {
              this.websocketService.broadcast({
                type: "evidence_scan",
                data: {
                  evidence,
                  tag_id: existingTag.tag_id,
                  scanner_id,
                  timestamp: new Date(),
                },
                timestamp: new Date(),
              });
            }

            console.log(`Prova ${evidence.name} escaneada com sucesso`);
          } else {
            console.log(`Tag ${tag_id} encontrada mas sem prova vinculada`);
          }
        } else {
          console.log(`Tag ${tag_id} não encontrada no sistema`);
        }
      } else {
        console.error(`Erro na leitura da tag: ${error_message}`);
      }

      // Notificar via WebSocket sobre o resultado da leitura
      if (this.websocketService) {
        this.websocketService.broadcast({
          type: "tag_read_response",
          data: {
            success,
            tag_id,
            scanner_id,
            evidence_id,
            error_message,
            timestamp: new Date(),
          },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error(`Erro ao processar resposta de leitura de tag:`, error);
    }
  }

  private async handleTagLinkResponse(data: any) {
    try {
      console.log("Resposta de vinculação de tag:", data);

      const { scanner_id, tag_id, evidence_id, success, error_message } = data;

      if (success) {
        // Verificar se a tag já existe no sistema
        let tag = await this.prisma.tags.findUnique({
          where: { tag_id: tag_id },
        });

        // Criar nova tag se não existir
        if (!tag) {
          tag = await this.prisma.tags.create({
            data: {
              tag_id: tag_id,
              tag_type: "evidence",
            },
          });
        }

        // Vincular tag à prova
        await this.prisma.evidences.update({
          where: { id: evidence_id },
          data: {
            tag_id: tag.id,
            status: "tagged", // Atualizar status da prova
          },
        });

        // Registrar o scan de vinculação
        await this.prisma.scans.create({
          data: {
            scanner_id: scanner_id,
            tag_id: tag.id,
          },
        });

        console.log(
          `Tag ${tag_id} vinculada à prova ${evidence_id} com sucesso`
        );

        // Notificar via WebSocket sobre a vinculação bem-sucedida
        if (this.websocketService) {
          this.websocketService.broadcast({
            type: "tag_linked",
            data: {
              success: true,
              tag_id,
              evidence_id,
              scanner_id,
              timestamp: new Date(),
            },
            timestamp: new Date(),
          });
        }
      } else {
        console.error(`Erro na vinculação da tag: ${error_message}`);

        // Notificar via WebSocket sobre o erro
        if (this.websocketService) {
          this.websocketService.broadcast({
            type: "error",
            data: {
              message: `Erro na vinculação da tag: ${error_message}`,
              tag_id,
              evidence_id,
              scanner_id,
              timestamp: new Date(),
            },
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error(`Erro ao processar resposta de vinculação de tag:`, error);

      // Notificar via WebSocket sobre erro interno
      if (this.websocketService) {
        this.websocketService.broadcast({
          type: "error",
          data: {
            message: "Erro interno ao processar vinculação de tag",
            error: error instanceof Error ? error.message : "Erro desconhecido",
            timestamp: new Date(),
          },
          timestamp: new Date(),
        });
      }
    }
  }

  public publishMessage(topic: string, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error("Cliente MQTT não está conectado"));
        return;
      }

      const payload = JSON.stringify(message);

      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          console.error(`Erro ao publicar mensagem no tópico ${topic}:`, error);
          reject(error);
        } else {
          console.log(`Mensagem publicada no tópico ${topic}:`, message);
          resolve();
        }
      });
    });
  }

  public async requestTagRead(scannerId: string, evidenceId: string) {
    const message = {
      scanner_id: scannerId,
      evidence_id: evidenceId,
      action: "read_tag",
      timestamp: new Date().toISOString(),
    };

    await this.publishMessage("rfid/tag/read/request", message);
  }

  public async requestTagLink(
    scannerId: string,
    evidenceId: string,
    tagId: string
  ) {
    const message = {
      scanner_id: scannerId,
      evidence_id: evidenceId,
      tag_id: tagId,
      action: "link_tag",
      timestamp: new Date().toISOString(),
    };

    await this.publishMessage("rfid/tag/link/request", message);
  }

  public setWebSocketService(websocketService: WebSocketService) {
    this.websocketService = websocketService;
  }

  public isClientConnected(): boolean {
    return this.isConnected;
  }

  public async close() {
    if (this.client) {
      this.client.end();
    }
    await this.prisma.$disconnect();
  }
}
