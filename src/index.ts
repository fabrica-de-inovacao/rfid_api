import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { config } from "./config/env";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import evidenceRoutes, { setEvidenceController } from "./routes/evidenceRoutes";
import scannerRoutes, { setScannerController } from "./routes/scannerRoutes";
import safekeepingRoutes from "./routes/safekeepingRoutes";
import activityRoutes from "./routes/activityRoutes";

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
    // Trust proxy para funcionar atrás de reverse proxy (Nginx/Apache)
    this.app.set("trust proxy", true);

    // Middlewares de segurança (configurado para HTTPS e HTTP)
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://cdnjs.cloudflare.com",
              "https://fonts.googleapis.com",
            ],
            fontSrc: [
              "'self'",
              "https://cdnjs.cloudflare.com",
              "https://fonts.gstatic.com",
            ],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'", // Necessário para Swagger UI
              "https://cdnjs.cloudflare.com",
            ],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false, // Desabilitar para compatibilidade
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      })
    );

    // CORS configurado para aceitar qualquer origem durante testes
    // TODO: Restringir origins em produção final
    this.app.use(
      cors({
        origin: true, // Aceita qualquer origem
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-Forwarded-Proto",
        ],
        exposedHeaders: ["X-Total-Count", "X-Page-Count"],
        optionsSuccessStatus: 200, // Para compatibilidade com navegadores mais antigos
      })
    );

    // Middleware para lidar com proxy reverso e HTTPS
    this.app.use((req, res, next) => {
      // Detectar se a requisição veio através de HTTPS e definir propriedades customizadas
      if (req.headers["x-forwarded-proto"] === "https" || req.secure) {
        (req as any).isHttps = true;
        (req as any).protocol = "https";
      } else {
        (req as any).isHttps = false;
        (req as any).protocol = "http";
      }

      // Headers para todas as responses
      res.setHeader("X-Powered-By", "RFID Custody API");

      next();
    });

    // Middlewares de parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Middleware de logging melhorado
    if (config.nodeEnv === "development") {
      this.app.use((req, res, next) => {
        const protocol = (req as any).isHttps ? "https" : "http";
        console.log(
          `${new Date().toISOString()} - ${req.method} ${protocol}://${req.get(
            "host"
          )}${req.path}`
        );
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

    // Rota para a página inicial
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "views", "index.html"));
    });

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
    this.app.use("/api/v1/activities", activityRoutes);

    // Rota 404 - Página HTML personalizada
    this.app.use("*", (req, res) => {
      // Se for uma requisição para a API, retornar JSON
      if (req.originalUrl.startsWith("/api/")) {
        res.status(404).json({
          message: "Endpoint não encontrado",
          path: req.originalUrl,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Para outras rotas, mostrar página 404 HTML
        res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
      }
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
