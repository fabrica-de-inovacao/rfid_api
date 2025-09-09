import { Request, Response } from "express";
import { EvidenceService } from "../services/evidenceService";
import { MQTTService } from "../services/mqttService";
import { WebSocketService } from "../services/websocketService";
import { AuthenticatedRequest } from "../types";

export class EvidenceController {
  private evidenceService = new EvidenceService();
  private mqttService: MQTTService;
  private websocketService: WebSocketService;

  constructor(mqttService: MQTTService, websocketService: WebSocketService) {
    this.mqttService = mqttService;
    this.websocketService = websocketService;
  }

  createEvidence = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Utilizador não autenticado" });
        return;
      }

      const evidence = await this.evidenceService.createEvidence(
        req.body,
        req.user.id
      );
      res.status(201).json(evidence);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Custódia não encontrada"
      ) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(400).json({
        message: error instanceof Error ? error.message : "Erro ao criar prova",
      });
    }
  };

  getAllEvidences = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const evidences = await this.evidenceService.getAllEvidences();
      res.status(200).json(evidences);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  getEvidenceById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const evidence = await this.evidenceService.getEvidenceById(id);
      res.status(200).json(evidence);
    } catch (error) {
      if (error instanceof Error && error.message === "Prova não encontrada") {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  linkTagToEvidence = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { evidence_id } = req.body;

      // 1. Verificar se a prova existe (Isto já está correto)
      await this.evidenceService.getEvidenceById(evidence_id);

      // --- CORREÇÃO APLICADA AQUI ---
      // 2. Construir o tópico dinâmico que o Raspberry Pi está à espera
      const topic = `custody/link/request/${evidence_id}`;

      // 3. O payload pode ser mais simples, pois o ID já está no tópico
      const payload = {
        action: "start_tag_read",
        timestamp: new Date().toISOString(),
      };

      // 4. Publicar a mensagem no TÓPICO CORRETO
      await this.mqttService.publishMessage(topic, payload);
      // -------------------------------

      // Notificar via WebSocket que o processo foi iniciado (Isto já está correto)
      this.websocketService.broadcast({
        type: "tag_linked",
        data: {
          evidence_id,
          message:
            "Processo de leitura de tag iniciado. Aproxime a tag do leitor.",
          status: "reading",
        },
        timestamp: new Date(),
      });

      res.status(202).json({
        message:
          "Processo de leitura iniciado. Aguarde a resposta via WebSocket.",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Prova não encontrada") {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Erro ao iniciar vinculação de tag",
      });
    }
  };
}
