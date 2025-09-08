import mqtt from "mqtt";
import { config } from "../config/env";
import { MQTTMessage } from "../types";

export class MQTTService {
  private client: mqtt.MqttClient;
  private isConnected = false;

  constructor() {
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

  private handleScannerMessage(topic: string, data: any) {
    // Extrair ID do scanner do tópico
    const topicParts = topic.split("/");
    const scannerId = topicParts[2];

    console.log(`Status do scanner ${scannerId}:`, data);

    // Aqui você pode adicionar lógica para processar o status do scanner
    // Por exemplo, notificar via WebSocket
  }

  private handleTagReadResponse(data: any) {
    console.log("Resposta de leitura de tag:", data);

    // Processar resposta da leitura de tag
    // Notificar via WebSocket sobre o resultado
  }

  private handleTagLinkResponse(data: any) {
    console.log("Resposta de vinculação de tag:", data);

    // Processar resposta da vinculação de tag
    // Atualizar base de dados se necessário
    // Notificar via WebSocket
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

  public isClientConnected(): boolean {
    return this.isConnected;
  }

  public close() {
    if (this.client) {
      this.client.end();
    }
  }
}
