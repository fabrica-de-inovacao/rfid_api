import mqtt from "mqtt";
import { config } from "../config/env";
import { MQTTMessage } from "../types";
import { WebSocketService } from "./websocketService";
import { PrismaClient } from "@prisma/client";
import { ActivityLogger } from "./activityLogService";

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
      console.log("=== MQTT MESSAGE RECEIVED ===");
      console.log("Topic:", topic);
      console.log("Raw Message Buffer:", message);
      console.log("Raw Message String:", message.toString());

      const data = JSON.parse(message.toString());
      console.log("Parsed JSON Data:", JSON.stringify(data, null, 2));
      console.log("Data Type:", typeof data);
      console.log("Data Keys:", Object.keys(data));
      console.log("=============================");

      // Processar mensagem baseada no tópico
      if (topic.startsWith("rfid/scanner/")) {
        console.log("🔍 Routing to handleScannerMessage");
        this.handleScannerMessage(topic, data);
      } else if (topic === "rfid/tag/read/response") {
        console.log("🏷️ Routing to handleTagReadResponse");
        this.handleTagReadResponse(data);
      } else if (topic === "rfid/tag/link/response") {
        console.log("🔗 Routing to handleTagLinkResponse");
        this.handleTagLinkResponse(data);
      } else {
        console.log("❌ Unknown topic, no handler found");
      }
    } catch (error) {
      console.error("❌ Erro ao processar mensagem MQTT:", error);
      console.error("Raw message that failed:", message.toString());
    }
  }

  private async handleScannerMessage(topic: string, data: any) {
    try {
      console.log("🔍 === HANDLE SCANNER MESSAGE ===");
      console.log("Topic received:", topic);
      console.log("Full data received:", JSON.stringify(data, null, 2));

      // Extrair ID do scanner do tópico
      const topicParts = topic.split("/");
      console.log("Topic parts:", topicParts);
      const scannerId = topicParts[2];
      console.log("Extracted scanner ID:", scannerId);

      console.log(`Scanner ${scannerId} data analysis:`);
      console.log("- Data type:", typeof data);
      console.log("- Data keys:", Object.keys(data));
      console.log(
        "- Status field:",
        data.status,
        "(type:",
        typeof data.status,
        ")"
      );

      // Atualizar status do scanner no banco de dados
      console.log("💾 Updating scanner in database with data:", {
        where: { mac_address: scannerId },
        data: { status: data.status || "online", last_scan: new Date() },
      });

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
        console.log("📡 Sending WebSocket notification for scanner status");
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
      } else {
        console.log("⚠️ WebSocket service not available");
      }

      console.log(`✅ Scanner ${scannerId} atualizado com sucesso`);
      console.log("🔍 === END HANDLE SCANNER MESSAGE ===");
    } catch (error) {
      console.error(`❌ Erro ao processar mensagem do scanner:`, error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
    }
  }

  private async handleTagReadResponse(data: any) {
    try {
      console.log("🏷️ === HANDLE TAG READ RESPONSE ===");
      console.log("Full data received:", JSON.stringify(data, null, 2));
      console.log("Data structure analysis:");
      console.log("- Type:", typeof data);
      console.log("- Keys:", Object.keys(data));
      console.log("- Values:", Object.values(data));

      // Log actual fields (check for both formats)
      console.log("Actual fields extraction:");
      console.log(
        "- scanner_id:",
        data.scanner_id,
        "(type:",
        typeof data.scanner_id,
        ")"
      );
      console.log("- tag_id:", data.tag_id, "(type:", typeof data.tag_id, ")");
      console.log(
        "- tag_uid:",
        data.tag_uid,
        "(type:",
        typeof data.tag_uid,
        ")"
      );
      console.log(
        "- evidence_id:",
        data.evidence_id,
        "(type:",
        typeof data.evidence_id,
        ")"
      );
      console.log(
        "- success:",
        data.success,
        "(type:",
        typeof data.success,
        ")"
      );
      console.log(
        "- error_message:",
        data.error_message,
        "(type:",
        typeof data.error_message,
        ")"
      );

      // Adaptar para diferentes formatos de dados
      const scanner_id = data.scanner_id;
      const tag_id = data.tag_id || data.tag_uid; // Usar tag_uid se tag_id não existir
      const tag_uid = data.tag_uid;
      const evidence_id = data.evidence_id;
      const success =
        data.success !== undefined
          ? data.success
          : evidence_id && tag_id
          ? true
          : false;
      const error_message = data.error_message;

      console.log("Adapted values:");
      console.log("- scanner_id:", scanner_id);
      console.log("- tag_id (adapted):", tag_id);
      console.log("- tag_uid:", tag_uid);
      console.log("- evidence_id:", evidence_id);
      console.log("- success (inferred):", success);
      console.log("- error_message:", error_message);

      if (success && tag_id) {
        console.log("✅ Success condition met, proceeding with tag lookup...");
        // Verificar se a tag existe no sistema
        console.log("🔍 Searching for tag in database with tag_id:", tag_id);
        const existingTag = await this.prisma.tags.findUnique({
          where: { tag_id: tag_id },
        });

        console.log(
          "Database tag search result:",
          existingTag ? "FOUND" : "NOT FOUND"
        );
        if (existingTag) {
          console.log(
            "Found tag details:",
            JSON.stringify(existingTag, null, 2)
          );
          // Verificar se há uma prova vinculada a essa tag
          console.log(
            "🔍 Searching for evidence linked to tag ID:",
            existingTag.id
          );
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

          console.log(
            "Evidence search result:",
            evidence ? "FOUND" : "NOT FOUND"
          );
          if (evidence) {
            console.log(
              "Found evidence details:",
              JSON.stringify(evidence, null, 2)
            );
            // Registrar scan da prova
            console.log("💾 Creating scan record with data:", {
              scanner_id: scanner_id,
              tag_id: existingTag.id,
            });

            const scanRecord = await this.prisma.scans.create({
              data: {
                scanner_id: scanner_id,
                tag_id: existingTag.id,
              },
            });

            console.log(
              "✅ Scan record created:",
              JSON.stringify(scanRecord, null, 2)
            );

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

            // Log da atividade de scan
            await ActivityLogger.logTagScanned(
              undefined, // Não temos userId no contexto do MQTT
              evidence.id,
              evidence.name,
              tag_id,
              scanner_id || "unknown"
            );

            console.log(`✅ Prova ${evidence.name} escaneada com sucesso`);
          } else {
            console.log(`⚠️ Tag ${tag_id} encontrada mas sem prova vinculada`);
            console.log("Tag exists but no evidence is linked to it");
          }
        } else {
          console.log(`❌ Tag ${tag_id} não encontrada no sistema`);
          console.log("This tag_id does not exist in the tags table");
        }
      } else {
        console.log(
          "❌ Failed condition - either success is false or tag_id is missing"
        );
        console.log("- success:", success);
        console.log("- tag_id:", tag_id);
        console.error(`Erro na leitura da tag: ${error_message}`);
      }

      // Notificar via WebSocket sobre o resultado da leitura
      console.log("📡 Preparing WebSocket notification...");
      const websocketData = {
        success,
        tag_id,
        scanner_id,
        evidence_id,
        error_message,
        timestamp: new Date(),
      };
      console.log(
        "WebSocket data to send:",
        JSON.stringify(websocketData, null, 2)
      );

      if (this.websocketService) {
        console.log("✅ Sending WebSocket broadcast");
        this.websocketService.broadcast({
          type: "tag_read_response",
          data: websocketData,
          timestamp: new Date(),
        });
      } else {
        console.log("⚠️ WebSocket service not available");
      }

      console.log("🏷️ === END HANDLE TAG READ RESPONSE ===");
    } catch (error) {
      console.error(`❌ Erro ao processar resposta de leitura de tag:`, error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
    }
  }

  private async handleTagLinkResponse(data: any) {
    try {
      console.log("🔗 === HANDLE TAG LINK RESPONSE ===");
      console.log("Full data received:", JSON.stringify(data, null, 2));
      console.log("Data structure analysis:");
      console.log("- Type:", typeof data);
      console.log("- Keys:", Object.keys(data));

      // Log actual fields received
      console.log("Actual fields received:");
      console.log(
        "- evidence_id:",
        data.evidence_id,
        "(type:",
        typeof data.evidence_id,
        ")"
      );
      console.log(
        "- tag_uid:",
        data.tag_uid,
        "(type:",
        typeof data.tag_uid,
        ")"
      );

      // Also check for alternative field names
      console.log("Alternative field checks:");
      console.log(
        "- scanner_id:",
        data.scanner_id,
        "(type:",
        typeof data.scanner_id,
        ")"
      );
      console.log("- tag_id:", data.tag_id, "(type:", typeof data.tag_id, ")");
      console.log(
        "- success:",
        data.success,
        "(type:",
        typeof data.success,
        ")"
      );
      console.log(
        "- error_message:",
        data.error_message,
        "(type:",
        typeof data.error_message,
        ")"
      );

      // Adaptar para a estrutura real recebida
      const evidence_id = data.evidence_id;
      const tag_uid = data.tag_uid; // Campo real recebido
      const tag_id = data.tag_id || data.tag_uid; // Usar tag_uid se tag_id não existir
      const scanner_id = data.scanner_id; // Pode não vir na resposta
      const success =
        data.success !== undefined
          ? data.success
          : evidence_id && tag_uid
          ? true
          : false; // Inferir sucesso
      const error_message = data.error_message;

      console.log("Adapted values:");
      console.log("- evidence_id:", evidence_id);
      console.log("- tag_uid:", tag_uid);
      console.log("- tag_id (adapted):", tag_id);
      console.log("- scanner_id:", scanner_id);
      console.log("- success (inferred):", success);
      console.log("- error_message:", error_message);

      if (success && tag_id) {
        console.log("✅ Success condition met, proceeding with tag linking...");

        // Verificar se a tag já existe no sistema
        console.log("🔍 Searching for existing tag with tag_id:", tag_id);
        let tag = await this.prisma.tags.findUnique({
          where: { tag_id: tag_id },
        });

        console.log("Existing tag search result:", tag ? "FOUND" : "NOT FOUND");
        if (tag) {
          console.log("Found existing tag:", JSON.stringify(tag, null, 2));
        }

        // Criar nova tag se não existir
        if (!tag) {
          console.log("💾 Creating new tag with data:", {
            tag_id: tag_id,
            tag_type: "item",
          });
          tag = await this.prisma.tags.create({
            data: {
              tag_id: tag_id,
              tag_type: "item",
            },
          });
          console.log("✅ New tag created:", JSON.stringify(tag, null, 2));
        }

        // Vincular tag à prova
        console.log("💾 Linking tag to evidence:", {
          evidence_id,
          tag_id: tag.id,
        });
        const updatedEvidence = await this.prisma.evidences.update({
          where: { id: evidence_id },
          data: {
            tag_id: tag.id,
            status: "tagged", // Atualizar status da prova
          },
        });
        console.log(
          "✅ Evidence updated:",
          JSON.stringify(updatedEvidence, null, 2)
        );

        // Registrar o scan de vinculação (apenas se tiver scanner_id)
        if (scanner_id) {
          console.log("💾 Creating scan record for linking:", {
            scanner_id,
            tag_id: tag.id,
          });
          const scanRecord = await this.prisma.scans.create({
            data: {
              scanner_id: scanner_id,
              tag_id: tag.id,
            },
          });
          console.log(
            "✅ Scan record created:",
            JSON.stringify(scanRecord, null, 2)
          );
        } else {
          console.log(
            "⚠️ Skipping scan record creation - no scanner_id provided"
          );
        }

        // Log da atividade de vinculação da tag
        const evidence = await this.prisma.evidences.findUnique({
          where: { id: evidence_id },
          select: { name: true },
        });

        if (evidence) {
          await ActivityLogger.logTagLinked(
            undefined, // Não temos userId no contexto do MQTT
            evidence_id,
            evidence.name,
            tag_id
          );
        }

        console.log(
          `Tag ${tag_id} (UID: ${tag_uid}) vinculada à prova ${evidence_id} com sucesso`
        );

        // Notificar via WebSocket sobre a vinculação bem-sucedida
        if (this.websocketService) {
          console.log(
            "📡 Sending WebSocket notification for successful tag linking"
          );
          this.websocketService.broadcast({
            type: "tag_linked",
            data: {
              success: true,
              tag_id,
              tag_uid,
              evidence_id,
              scanner_id,
              timestamp: new Date(),
            },
            timestamp: new Date(),
          });
        }
      } else {
        console.log("❌ Failed condition - missing required data");
        console.log("- evidence_id:", evidence_id);
        console.log("- tag_uid:", tag_uid);
        console.log("- inferred success:", success);

        const errorMsg =
          error_message || "Dados insuficientes para vinculação da tag";
        console.error(`Erro na vinculação da tag: ${errorMsg}`);

        // Notificar via WebSocket sobre o erro
        if (this.websocketService) {
          console.log(
            "📡 Sending WebSocket notification for tag linking error"
          );
          this.websocketService.broadcast({
            type: "error",
            data: {
              message: `Erro na vinculação da tag: ${errorMsg}`,
              tag_id,
              tag_uid,
              evidence_id,
              scanner_id,
              timestamp: new Date(),
            },
            timestamp: new Date(),
          });
        }
      }

      console.log("🔗 === END HANDLE TAG LINK RESPONSE ===");
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

    console.log(
      "📤 Sending tag read request:",
      JSON.stringify(message, null, 2)
    );
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

    console.log(
      "📤 Sending tag link request:",
      JSON.stringify(message, null, 2)
    );
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
