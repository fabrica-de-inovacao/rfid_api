import WebSocket from "ws";
import { WebSocketMessage } from "../types";
import { config } from "../config/env";

export class WebSocketService {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.wss = new WebSocket.Server({
      port: Number(config.websocket.port),
      host: "0.0.0.0",
      verifyClient: (info: any) => {
        // Permitir todas as origens durante desenvolvimento
        console.log("WebSocket connection from origin:", info.origin);
        return true;
      },
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("Cliente WebSocket conectado");
      this.clients.add(ws);

      ws.on("close", () => {
        console.log("Cliente WebSocket desconectado");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("Erro no WebSocket:", error);
        this.clients.delete(ws);
      });

      // Enviar mensagem de boas-vindas
      this.sendToClient(ws, {
        type: "connection_established",
        data: { message: "Conectado ao servidor RFID" },
        timestamp: new Date(),
      });
    });

    console.log(
      `Servidor WebSocket iniciado na porta ${config.websocket.port}`
    );
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("Erro ao enviar mensagem WebSocket:", error);
        this.clients.delete(ws);
      }
    }
  }

  public broadcast(message: WebSocketMessage) {
    this.clients.forEach((client) => {
      this.sendToClient(client, message);
    });
  }

  public notifyTagLinked(
    evidenceId: string,
    tagId: string,
    evidenceName: string
  ) {
    const message: WebSocketMessage = {
      type: "tag_linked",
      data: {
        evidence_id: evidenceId,
        tag_id: tagId,
        evidence_name: evidenceName,
        message: `Tag ${tagId} vinculada à prova "${evidenceName}" com sucesso`,
      },
      timestamp: new Date(),
    };

    this.broadcast(message);
  }

  public notifyEvidenceScan(scanResult: any) {
    const message: WebSocketMessage = {
      type: "evidence_scan",
      data: scanResult,
      timestamp: new Date(),
    };

    this.broadcast(message);
  }

  public notifyScannerStatus(scannerId: string, status: string) {
    const message: WebSocketMessage = {
      type: "scanner_status",
      data: {
        scanner_id: scannerId,
        status,
      },
      timestamp: new Date(),
    };

    this.broadcast(message);
  }

  public notifyError(error: string, details?: any) {
    const message: WebSocketMessage = {
      type: "error",
      data: {
        error,
        details,
      },
      timestamp: new Date(),
    };

    this.broadcast(message);
  }

  public notifyEvidenceAbsence(absenceData: any) {
    const message: WebSocketMessage = {
      type: "evidence_absence_alert",
      data: absenceData,
      timestamp: new Date(),
    };

    this.broadcast(message);
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public close() {
    this.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();
  }
}
