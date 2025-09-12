import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Custódia de Provas RFID v7.0 - Sistema Completo com ESP32",
      description: `
        API RESTful avançada para gestão e rastreamento de provas criminais com tecnologia RFID.
        
        ### 🚀 Funcionalidades Principais:
        - **Auto-descoberta de Scanners**: Detecta automaticamente novos scanners na rede
        - **Suporte ESP32**: Conversão automática de formato de dados ESP32
        - **Gestão Completa CRUD**: Scanners, Provas, Custódias e Utilizadores
        - **Monitoramento em Tempo Real**: WebSocket para atualizações instantâneas
        - **Sistema de Aprovação**: Scanners pendentes para aprovação administrativa
        - **Histórico Completo**: Rastreamento de atividades e scans
        - **Autenticação JWT**: Sistema seguro com refresh tokens
        
        ### 📊 Fluxo de Scanners:
        1. **Scanner Desconhecido** → Registrado como pendente
        2. **Aprovação Manual** → Scanner ativado no sistema
        3. **Scans Automáticos** → Processamento e armazenamento
        4. **Alertas** → Notificações de provas fora da custódia
        
        ### � Exemplos de Fluxo de Trabalho:
        
        **🔍 Descoberta Automática de Scanner:**
        \`\`\`
        1. Hardware envia POST /scans/report com MAC desconhecido
        2. Sistema registra em pending_scanners
        3. Admin acessa GET /scans/pending-scanners
        4. Admin aprova com POST /scans/pending-scanners/{id}/approve
        5. Scanner fica ativo para receber dados
        \`\`\`
        
        **📡 Monitoramento em Tempo Real:**
        \`\`\`
        1. GET /scans/status - Status atual de todos scanners
        2. GET /scans/recent?include_pending=true - Histórico + pendentes
        3. WebSocket connection - Notificações instantâneas
        4. POST /scans/report - Recepção automática do hardware
        \`\`\`
        
        **⚙️ Gestão Administrativa:**
        \`\`\`
        1. POST /scans/scanners - Criar scanner manualmente
        2. PUT /scans/scanners/{id} - Atualizar configurações
        3. DELETE /scans/scanners/{id} - Remover scanner
        4. GET /scans/scanners?status=offline - Filtrar por status
        \`\`\`
        
        ### �🔐 Autenticação:
        Todos os endpoints protegidos requerem Bearer Token no header Authorization.
        
        **Login:** POST /auth/login → Recebe accessToken + refreshToken  
        **Uso:** Header \`Authorization: Bearer {accessToken}\`  
        **Renovação:** POST /auth/refresh → Novo accessToken
      `,
      version: "7.0.0",
      contact: {
        name: "Suporte Técnico",
        email: "suporte@fabricadeinovacao.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    tags: [
      {
        name: "Autenticação",
        description: "🔐 Endpoints para login, logout e refresh de tokens JWT",
      },
      {
        name: "Administração - Utilizadores",
        description:
          "👥 Gestão completa de utilizadores (CRUD) - Apenas administradores",
      },
      {
        name: "Provas",
        description: "📋 Gestão de provas e evidências criminais com tags RFID",
      },
      {
        name: "Tags",
        description: "🏷️ Gestão e vinculação de tags RFID às provas",
      },
      {
        name: "Scanners",
        description:
          "📡 Monitoramento de scanners, recepção de dados e status em tempo real",
      },
      {
        name: "Administração - Scanners",
        description:
          "⚙️ Gestão completa de scanners: CRUD, auto-descoberta e aprovação de dispositivos pendentes",
      },
      {
        name: "Custódias",
        description: "🏢 Gestão de locais de custódia e responsáveis",
      },
      {
        name: "Administração - Custódias",
        description:
          "🔧 Gestão administrativa avançada de custódias - Apenas administradores",
      },
      {
        name: "Atividades",
        description:
          "📊 Consulta de logs de atividades e estatísticas do utilizador",
      },
      {
        name: "Administração - Atividades",
        description:
          "📈 Gestão avançada de logs, auditoria e relatórios do sistema - Apenas administradores",
      },
    ],
    servers: [
      {
        url: "/api/v1",
        description: "Servidor Atual (Relativo)",
      },
      {
        url: "https://189.90.44.226:9000/api/v1",
        description: "Servidor de Produção (HTTPS)",
      },
      {
        url: "http://189.90.44.226:9000/api/v1",
        description: "Servidor de Produção (HTTP)",
      },
      {
        url: "http://localhost:9000/api/v1",
        description: "Servidor de Desenvolvimento",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Chave de API para autenticação de hardware ESP32",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Entidade não encontrada.",
            },
          },
        },
        ErrorValidationResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Erro de validação.",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                    example: "email",
                  },
                  message: {
                    type: "string",
                    example: "O e-mail fornecido é inválido.",
                  },
                },
              },
            },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
              example: "Administrador do Sistema",
            },
            email: {
              type: "string",
              format: "email",
              example: "admin@email.com",
            },
            cpf: {
              type: "string",
              example: "123.456.789-00",
            },
            setor: {
              type: "string",
              example: "TI",
            },
            admin: {
              type: "boolean",
            },
            status: {
              type: "string",
              enum: ["ativo", "inativo"],
            },
            tag_id: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
          },
        },
        ActivityResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            action: {
              type: "string",
              example: "CREATE",
            },
            entity_type: {
              type: "string",
              example: "EVIDENCE",
            },
            entity_id: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            entity_name: {
              type: "string",
              nullable: true,
              example: "Smartphone Samsung S22",
            },
            description: {
              type: "string",
              example: "Prova 'Smartphone Samsung S22' foi criada",
            },
            ip_address: {
              type: "string",
              nullable: true,
              example: "192.168.1.100",
            },
            user_agent: {
              type: "string",
              nullable: true,
              example: "Mozilla/5.0...",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            user: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                },
                email: {
                  type: "string",
                  format: "email",
                },
                setor: {
                  type: "string",
                },
              },
            },
          },
        },
        ActivityStatsResponse: {
          type: "object",
          properties: {
            total_activities: {
              type: "integer",
              example: 1250,
            },
            period_days: {
              type: "integer",
              example: 30,
            },
            stats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: {
                    type: "string",
                    example: "CREATE",
                  },
                  entity_type: {
                    type: "string",
                    example: "EVIDENCE",
                  },
                  count: {
                    type: "integer",
                    example: 45,
                  },
                },
              },
            },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["name", "email", "cpf", "setor", "senha"],
          properties: {
            name: {
              type: "string",
              example: "João Silva",
            },
            email: {
              type: "string",
              format: "email",
              example: "joao@empresa.com",
            },
            cpf: {
              type: "string",
              example: "123.456.789-00",
            },
            setor: {
              type: "string",
              example: "Investigação",
            },
            senha: {
              type: "string",
              format: "password",
              minLength: 8,
              example: "senhaSegura123",
            },
            admin: {
              type: "boolean",
              default: false,
            },
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "João Silva Santos",
            },
            email: {
              type: "string",
              format: "email",
              example: "joao.santos@empresa.com",
            },
            cpf: {
              type: "string",
              example: "123.456.789-00",
            },
            setor: {
              type: "string",
              example: "Perícia",
            },
            status: {
              type: "string",
              enum: ["ativo", "inativo"],
            },
            admin: {
              type: "boolean",
            },
          },
        },
        EvidenceResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
              example: "Smartphone Samsung S22",
            },
            description: {
              type: "string",
              example: "Smartphone com tela quebrada, cor preta",
            },
            status: {
              type: "string",
              example: "Em Custódia",
            },
            tag: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                tag_id: {
                  type: "string",
                  example: "977760168032",
                },
              },
            },
            safekeeping: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                  example: "Depósito Central",
                },
              },
            },
            registered_by: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                  example: "João Silva",
                },
              },
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
        CreateEvidenceRequest: {
          type: "object",
          required: ["name", "description", "safekeeping_id"],
          properties: {
            name: {
              type: "string",
              example: "Smartphone Samsung S22",
            },
            description: {
              type: "string",
              example:
                "Smartphone com tela quebrada no canto superior direito, cor preta",
            },
            report_id: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            safekeeping_id: {
              type: "string",
              format: "uuid",
            },
          },
        },
        SafekeepingResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
              example: "Depósito Central",
            },
            manager_id: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
            users: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                },
                email: {
                  type: "string",
                  format: "email",
                },
                setor: {
                  type: "string",
                },
              },
            },
            _count: {
              type: "object",
              properties: {
                evidences: {
                  type: "integer",
                  example: 15,
                },
                scanners: {
                  type: "integer",
                  example: 3,
                },
                users_safekeepings: {
                  type: "integer",
                  example: 5,
                },
              },
            },
          },
        },
        SafekeepingDetailsScanner: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Scanner Principal" },
            mac_address: { type: "string", example: "AA:BB:CC:DD:EE:FF" },
            status: { type: "string", example: "ACTIVE" },
            last_scan: { type: "string", format: "date-time", nullable: true },
            antenna_id: { type: "string", nullable: true },
            location: { type: "string", nullable: true },
          },
        },
        SafekeepingDetailsItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tag_id: { type: "string", nullable: true },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            last_seen_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            last_seen_by_scanner_id: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            present: { type: "boolean" },
            metadata: {
              type: "object",
              properties: {
                status: { type: "string" },
                registered_by: { type: "string", nullable: true },
              },
            },
          },
        },
        SafekeepingDetailsResponse: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            manager: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string", nullable: true },
              },
            },
            scanners: {
              type: "array",
              nullable: true,
              items: { $ref: "#/components/schemas/SafekeepingDetailsScanner" },
            },
            items: {
              type: "object",
              nullable: true,
              properties: {
                data: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/SafekeepingDetailsItem",
                  },
                },
                meta: {
                  type: "object",
                  properties: {
                    total: { type: "integer" },
                    page: { type: "integer" },
                    per_page: { type: "integer" },
                    total_pages: { type: "integer" },
                    total_present: { type: "integer" },
                    total_absent: { type: "integer" },
                  },
                },
              },
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        CreateSafekeepingRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              example: "Depósito Norte",
            },
            manager_id: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
          },
        },
        UpdateSafekeepingRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Depósito Norte - Atualizado",
            },
            manager_id: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
          },
        },
        ScannerResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            mac_address: {
              type: "string",
              example: "AA:BB:CC:DD:EE:FF",
            },
            name: {
              type: "string",
              example: "Scanner Principal",
            },
            status: {
              type: "string",
              example: "online",
            },
            last_scan: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            safekeeping: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                },
              },
            },
          },
        },
        ScannerDetails: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            mac_address: {
              type: "string",
              pattern: "^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$",
              example: "AA:BB:CC:DD:EE:FF",
            },
            name: {
              type: "string",
              example: "Scanner Principal",
            },
            status: {
              type: "string",
              enum: ["online", "offline", "maintenance"],
              example: "online",
            },
            last_scan: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2024-01-15T10:30:00Z",
            },
            safekeeping_id: {
              type: "string",
              format: "uuid",
              nullable: true,
              example: "456e7890-e89b-12d3-a456-426614174001",
            },
            safekeeping: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "456e7890-e89b-12d3-a456-426614174001",
                },
                name: {
                  type: "string",
                  example: "Depósito Central",
                },
              },
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-15T10:30:00Z",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "senha"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "admin@empresa.com",
            },
            senha: {
              type: "string",
              format: "password",
              example: "senhaSegura123",
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            user: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                },
                email: {
                  type: "string",
                  format: "email",
                },
                admin: {
                  type: "boolean",
                },
              },
            },
          },
        },
        PendingScannerResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            mac_address: {
              type: "string",
              pattern: "^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$",
              example: "AA:BB:CC:DD:EE:FF",
            },
            suggested_name: {
              type: "string",
              example: "Scanner-CCDDEEFF",
            },
            first_seen: {
              type: "string",
              format: "date-time",
              example: "2025-09-11T10:30:00Z",
            },
            last_seen: {
              type: "string",
              format: "date-time",
              example: "2025-09-11T15:45:00Z",
            },
            scan_count: {
              type: "integer",
              example: 5,
              description:
                "Número de tentativas de scan desde a primeira detecção",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              example: "pending",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-09-11T10:30:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-09-11T15:45:00Z",
            },
          },
        },
        ApproveScannerRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              example: "Scanner Sala Principal",
              description: "Nome personalizado para o scanner",
            },
            safekeeping_id: {
              type: "string",
              format: "uuid",
              example: "456e7890-e89b-12d3-a456-426614174001",
              description:
                "ID da custódia onde o scanner será alocado (opcional)",
            },
          },
        },
        ScanWithPendingInfo: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "789e0123-e89b-12d3-a456-426614174002",
            },
            scanner: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  example: "Scanner Principal",
                },
                mac_address: {
                  type: "string",
                  example: "AA:BB:CC:DD:EE:FF",
                },
                status: {
                  type: "string",
                  enum: ["online", "offline", "maintenance", "pending"],
                  example: "online",
                },
              },
            },
            tag: {
              type: "object",
              nullable: true,
              properties: {
                tag_id: {
                  type: "string",
                  example: "35800748970",
                },
              },
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-09-11T15:45:00Z",
            },
            is_pending: {
              type: "boolean",
              example: false,
              description: "Indica se este scan é de um scanner pendente",
            },
            scan_count: {
              type: "integer",
              example: 5,
              description:
                "Somente para scanners pendentes - número de tentativas",
            },
          },
        },
        ScannerPendingProcessResult: {
          type: "object",
          properties: {
            scanner: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  example: "Scanner Desconhecido (AA:BB:CC:DD:EE:FF)",
                },
                safekeeping: {
                  type: "string",
                  nullable: true,
                  example: null,
                },
                status: {
                  type: "string",
                  example: "pending",
                },
              },
            },
            tags_processed: {
              type: "array",
              items: {
                type: "object",
              },
              example: [],
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2025-09-11T15:45:00Z",
            },
            pending: {
              type: "boolean",
              example: true,
              description: "Indica que o scanner foi registrado como pendente",
            },
            message: {
              type: "string",
              example: "Scanner registrado como pendente para aprovação",
            },
          },
        },
        ScannerReportESP32: {
          type: "array",
          description: "Formato de dados enviado pelo ESP32",
          items: {
            type: "object",
            properties: {
              reading_reader_ip: {
                type: "string",
                example: "192.168.2.100",
                description: "IP do scanner ESP32",
              },
              reading_epc_hex: {
                type: "string",
                example: "E2801191A50300653CF0F0D2",
                description: "Código EPC da tag RFID em hexadecimal",
              },
              reading_reader_mac: {
                type: "string",
                example: "54:43:B2:95:0C:50",
                description: "MAC address do scanner",
              },
              reading_company_id: {
                type: "string",
                example: "",
                description: "ID da empresa (opcional)",
              },
              reading_antenna: {
                type: "string",
                example: "1",
                description: "Número da antena",
              },
              reading_movement_type: {
                type: "string",
                example: "1",
                description: "Tipo de movimento da tag",
              },
              reading_created_at: {
                type: "string",
                example: "2025-09-12 10:00:00",
                description: "Timestamp da leitura",
              },
              reading_reader_name: {
                type: "string",
                example: "ESP32-Scanner",
                description: "Nome do scanner ESP32",
              },
              reading_rpm: {
                type: "string",
                example: "0",
                description: "RPM do scanner (se aplicável)",
              },
            },
          },
        },
        ScannerReportStandard: {
          type: "object",
          description: "Formato padrão da API (convertido do ESP32)",
          properties: {
            mac_address: {
              type: "string",
              example: "54:43:B2:95:0C:50",
              description: "MAC address do scanner",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["E2801191A50300653CF0F0D2", "E2801191A50300653CF11532"],
              description: "Lista de tags RFID detectadas",
            },
            reader_ip: {
              type: "string",
              example: "192.168.2.100",
              description: "IP do scanner",
            },
            reader_name: {
              type: "string",
              example: "ESP32-Scanner",
              description: "Nome do scanner",
            },
            readings_count: {
              type: "integer",
              example: 2,
              description: "Número total de leituras",
            },
            unique_tags_count: {
              type: "integer",
              example: 2,
              description: "Número de tags únicas detectadas",
            },
          },
        },
        ScanResult: {
          type: "object",
          description: "Resultado do processamento de scan",
          properties: {
            scanner: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  example: "Scanner Sala 101",
                },
                safekeeping: {
                  type: "object",
                  nullable: true,
                  properties: {
                    name: {
                      type: "string",
                      example: "Depósito Central",
                    },
                  },
                },
                status: {
                  type: "string",
                  example: "ativo",
                },
              },
            },
            tags_processed: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tag_id: {
                    type: "string",
                    example: "E2801191A50300653CF0F0D2",
                  },
                  evidence_id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  alert: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Tag processada com sucesso",
                  },
                },
              },
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2025-09-12T10:00:00.000Z",
            },
            pending: {
              type: "boolean",
              example: false,
            },
          },
        },
        Scanner: {
          type: "object",
          description: "Schema do scanner registrado",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            name: {
              type: "string",
              example: "Scanner Sala 205",
            },
            mac_address: {
              type: "string",
              example: "54:43:B2:95:0C:50",
            },
            status: {
              type: "string",
              enum: ["ativo", "inativo", "manutencao"],
              example: "ativo",
            },
            last_scan: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-09-12T10:00:00.000Z",
            },
            safekeeping_id: {
              type: "string",
              format: "uuid",
              nullable: true,
              example: "456e7890-e89b-12d3-a456-426614174001",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-09-12T10:00:00.000Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-09-12T10:00:00.000Z",
            },
          },
        },
        PendingScanner: {
          type: "object",
          description: "Scanner pendente de aprovação",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            mac_address: {
              type: "string",
              example: "54:43:B2:95:0C:50",
            },
            suggested_name: {
              type: "string",
              example: "Scanner-950C50",
            },
            first_seen: {
              type: "string",
              format: "date-time",
              example: "2025-09-12T10:00:00.000Z",
            },
            last_seen: {
              type: "string",
              format: "date-time",
              example: "2025-09-12T10:30:00.000Z",
            },
            scan_count: {
              type: "integer",
              example: 5,
              description: "Número de tentativas de scan",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              example: "pending",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-09-12T10:00:00.000Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-09-12T10:30:00.000Z",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operação realizada com sucesso",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Erro na operação",
            },
            error: {
              type: "string",
              example: "Detalhes do erro",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Caminhos para os arquivos que contêm as anotações Swagger
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Application): void => {
  // Configurar documentação Swagger com opções expandidas
  const swaggerOptions = {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { background: #fafafa; padding: 10px; margin: 10px 0; }
    `,
    customSiteTitle: "API de Custódia de Provas RFID - Documentação",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "none",
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
  };

  // Middleware específico para o Swagger UI com headers apropriados
  (app as any).use(
    "/api/v1/api-docs",
    (req: any, res: any, next: any) => {
      // Headers para compatibilidade HTTPS/HTTP
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

      // Headers CORS para Swagger UI - Permissivo para testes
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, X-Forwarded-Proto, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform, User-Agent, Referer"
      );

      // Se for HTTPS, adicionar headers de segurança apropriados
      if (req.secure || req.headers["x-forwarded-proto"] === "https") {
        res.setHeader(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains"
        );
      }

      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerOptions)
  );

  // Endpoint para obter o JSON do Swagger com headers CORS e segurança apropriados
  app.get("/api/v1/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Forwarded-Proto, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform, User-Agent, Referer"
    );
    res.setHeader("Cache-Control", "public, max-age=300"); // Cache por 5 minutos

    // Headers de segurança
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    res.json(specs);
  });

  console.log("📚 Documentação Swagger disponível em /api/v1/api-docs");
  console.log("📋 Swagger JSON disponível em /api/v1/api-docs.json");
};
