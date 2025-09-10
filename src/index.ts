import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/env";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import evidenceRoutes, { setEvidenceController } from "./routes/evidenceRoutes";
import scannerRoutes, { setScannerController } from "./routes/scannerRoutes";
import safekeepingRoutes from "./routes/safekeepingRoutes";

// Services
import { MQTTService } from "./services/mqttService";
import { WebSocketService } from "./services/websocketService";

// Controllers
import { EvidenceController } from "./controllers/evidenceController";
import { ScannerController } from "./controllers/scannerController";

class App {
  private app: express.Application;
  private mqttService!: MQTTService;
  private websocketService!: WebSocketService;

  constructor() {
    this.app = express();
    this.initializeServices();
    this.initializeMiddlewares();
    this.initializeControllers();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeServices(): void {
    // Inicializar serviços
    this.websocketService = new WebSocketService();
    this.mqttService = new MQTTService(this.websocketService);

    console.log("Serviços MQTT e WebSocket inicializados");
  }

  private initializeMiddlewares(): void {
    // Middlewares de segurança
    this.app.use(helmet());
    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? process.env.FRONTEND_URL
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true,
      })
    );

    // Middlewares de parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Middleware de logging
    if (config.nodeEnv === "development") {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }
  }

  private initializeControllers(): void {
    // Inicializar controladores com dependências
    const evidenceController = new EvidenceController(
      this.mqttService,
      this.websocketService
    );
    const scannerController = new ScannerController(this.websocketService);

    // Configurar controladores nas rotas
    setEvidenceController(evidenceController);
    setScannerController(scannerController);
  }

  private initializeRoutes(): void {
    // Configurar Swagger ANTES das outras rotas
    this.initializeSwagger();

    // Rota de saúde
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mqtt_connected: this.mqttService.isClientConnected(),
        websocket_clients: this.websocketService.getConnectedClientsCount(),
      });
    });

    // Rotas da API
    this.app.use("/api/v1/auth", authRoutes);
    this.app.use("/api/v1/users", userRoutes);
    this.app.use("/api/v1/evidences", evidenceRoutes);
    this.app.use("/api/v1/tags", evidenceRoutes); // Tags estão nas rotas de evidências
    this.app.use("/api/v1/scans", scannerRoutes);
    this.app.use("/api/v1/safekeepings", safekeepingRoutes);

    // Rota 404
    this.app.use("*", (req, res) => {
      res.status(404).json({
        message: "Endpoint não encontrado",
        path: req.originalUrl,
      });
    });
  }

  private initializeSwagger(): void {
    setupSwagger(this.app);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(config.port, () => {
      console.log(`🚀 Servidor rodando na porta ${config.port}`);
      console.log(
        `📚 Documentação disponível em http://localhost:${config.port}/api/v1/api-docs`
      );
      console.log(`🔗 API base URL: http://localhost:${config.port}/api/v1`);
      console.log(`💡 Health check: http://localhost:${config.port}/health`);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async shutdown(): Promise<void> {
    console.log("Encerrando aplicação...");

    // Fechar conexões
    this.mqttService.close();
    this.websocketService.close();

    console.log("Aplicação encerrada com sucesso");
  }
}

// Tratamento de sinais de encerramento
const app = new App();

process.on("SIGTERM", async () => {
  await app.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await app.shutdown();
  process.exit(0);
});

// Iniciar servidor
app.listen();

export default app;
