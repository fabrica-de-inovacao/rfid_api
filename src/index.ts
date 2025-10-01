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
import custodyRealtimeRoutes, {
  setCustodyRealtimeController,
} from "./routes/custodyRealtimeRoutes";

// Services
import { MQTTService } from "./services/mqttService";
import { WebSocketService } from "./services/websocketService";
import { PresenceMonitorService } from "./services/presenceMonitorService";

// Controllers
import { EvidenceController } from "./controllers/evidenceController";
import { ScannerController } from "./controllers/scannerController";
import { CustodyRealtimeController } from "./controllers/custodyRealtimeController";

class App {
  private app: express.Application;
  private mqttService!: MQTTService;
  private websocketService!: WebSocketService;
  private presenceMonitorService!: PresenceMonitorService;

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
    this.presenceMonitorService = new PresenceMonitorService(
      this.websocketService
    );

    // Iniciar monitoramento de presença
    this.presenceMonitorService.startMonitoring();

    console.log("Serviços MQTT, WebSocket e PresenceMonitor inicializados");
  }

  private initializeMiddlewares(): void {
    // Trust proxy para funcionar atrás de reverse proxy (Nginx/Apache)
    this.app.set("trust proxy", true);

    // Middlewares de segurança (configurado para HTTP e HTTPS)
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
        crossOriginOpenerPolicy: false, // Desabilitar para evitar problemas com HTTP
        crossOriginResourcePolicy: false, // Desabilitar para compatibilidade
        hsts: false, // Desabilitar HSTS para HTTP
        originAgentCluster: false, // Desabilitar para evitar conflitos
      })
    );

    // CORS configurado para aceitar qualquer origem
    // Permite acesso de todas as origens para máxima compatibilidade
    this.app.use(
      cors({
        origin: "*", // Permite explicitamente todas as origens
        credentials: false, // Desabilitado quando origin é "*"
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-Forwarded-Proto",
          "Accept",
          "Origin",
          "Access-Control-Request-Method",
          "Access-Control-Request-Headers",
        ],
        exposedHeaders: [
          "X-Total-Count",
          "X-Page-Count",
          "Content-Range",
          "X-Content-Range",
        ],
        optionsSuccessStatus: 200, // Para compatibilidade com navegadores mais antigos
        preflightContinue: false, // Resposta imediata para OPTIONS
      })
    );

    // Middleware para garantir headers CORS em todas as respostas
    this.app.use((req, res, next) => {
      // Headers CORS explícitos para garantir compatibilidade total
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, X-Forwarded-Proto, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
      );
      res.header(
        "Access-Control-Expose-Headers",
        "X-Total-Count, X-Page-Count, Content-Range, X-Content-Range"
      );

      // Remover headers que causam problemas com HTTP
      res.removeHeader("Cross-Origin-Opener-Policy");
      res.removeHeader("Cross-Origin-Embedder-Policy");
      res.removeHeader("Cross-Origin-Resource-Policy");
      res.removeHeader("Origin-Agent-Cluster");

      // Responder imediatamente para requisições OPTIONS (preflight)
      if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
      }

      // Detectar se a requisição veio através de HTTPS e definir propriedades customizadas
      if (req.headers["x-forwarded-proto"] === "https" || req.secure) {
        (req as any).isHttps = true;
        (req as any).detectedProtocol = "https";
      } else {
        (req as any).isHttps = false;
        (req as any).detectedProtocol = "http";
      }

      // Headers para todas as responses
      res.setHeader("X-Powered-By", "RFID Custody API");

      next();
    });

    // Middlewares de parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // 🔍 Middleware específico para detectar requisições do scanner
    this.app.use((req, res, next) => {
      // Detectar se é uma requisição para o endpoint do scanner
      if (
        req.path.includes("/scans/report") ||
        req.path.includes("/scans/test") ||
        req.path.includes("/scans/debug")
      ) {
        console.log("📡 [SCANNER REQUEST] Detectada requisição do scanner:", {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          contentType: req.get("Content-Type"),
          authorization: req.get("Authorization") ? "PRESENTE" : "AUSENTE",
          xForwardedFor: req.get("X-Forwarded-For"),
          xForwardedProto: req.get("X-Forwarded-Proto"),
          host: req.get("Host"),
        });
      }
      next();
    });

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
    const custodyRealtimeController = new CustodyRealtimeController(
      this.websocketService
    );

    // Configurar controladores nas rotas
    setEvidenceController(evidenceController);
    setScannerController(scannerController);
    setCustodyRealtimeController(custodyRealtimeController);
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

    // 🔍 DEBUG: Endpoint específico para teste de conectividade do scanner
    this.app.all("/api/v1/scans/debug", (req, res) => {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        ip: req.ip,
        ips: req.ips,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        protocol: req.protocol,
        secure: req.secure,
        hostname: req.hostname,
        userAgent: req.get("User-Agent"),
        contentType: req.get("Content-Type"),
        contentLength: req.get("Content-Length"),
        forwarded: {
          proto: req.get("X-Forwarded-Proto"),
          host: req.get("X-Forwarded-Host"),
          for: req.get("X-Forwarded-For"),
        },
      };

      console.log("🔍 [DEBUG ENDPOINT] Scanner connectivity test:", debugInfo);

      res.status(200).json({
        success: true,
        message: "DEBUG: Scanner connectivity test successful",
        server_info: {
          status: "ONLINE",
          port: config.port,
          environment: process.env.NODE_ENV || "development",
        },
        request_info: debugInfo,
      });
    });

    // 🔍 DEBUG: Endpoint de teste simples sem autenticação
    this.app.post("/api/v1/scans/test", (req, res) => {
      const testInfo = {
        timestamp: new Date().toISOString(),
        received_data: req.body,
        headers: req.headers,
        ip: req.ip,
        method: req.method,
        url: req.url,
      };

      console.log("🧪 [TEST ENDPOINT] Scanner test data received:", testInfo);

      res.status(200).json({
        success: true,
        message: "TEST: Data received successfully",
        echo: testInfo,
      });
    });

    // 🌐 Endpoint específico para teste de CORS
    this.app.all("/api/v1/cors-test", (req, res) => {
      const corsInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        origin: req.get("Origin") || "Não especificada",
        user_agent: req.get("User-Agent"),
        headers: req.headers,
        cors_headers_sent: {
          "Access-Control-Allow-Origin": res.get("Access-Control-Allow-Origin"),
          "Access-Control-Allow-Methods": res.get(
            "Access-Control-Allow-Methods"
          ),
          "Access-Control-Allow-Headers": res.get(
            "Access-Control-Allow-Headers"
          ),
        },
      };

      console.log("🌐 [CORS TEST] Teste de CORS executado:", corsInfo);

      res.status(200).json({
        success: true,
        message:
          "CORS configurado corretamente - acesso permitido de todas as origens",
        cors_info: corsInfo,
        server_info: {
          status: "ONLINE",
          cors_enabled: true,
          allowed_origins: "Todas (*)",
          allowed_methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
        },
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
    this.app.use("/api/v1/custody-realtime", custodyRealtimeRoutes);

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
