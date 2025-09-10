import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Custódia de Provas RFID v6.0 (Yarn)",
      description:
        "API RESTful para gestão e rastreamento de provas criminais. Este documento contém a especificação completa de todos os endpoints, payloads e respostas.",
      version: "6.0.0",
    },
    tags: [
      {
        name: "Autenticação",
        description: "Endpoints para autenticação de utilizadores",
      },
      {
        name: "Administração - Utilizadores",
        description: "Gestão de utilizadores (apenas administradores)",
      },
      {
        name: "Provas",
        description: "Gestão de provas e evidências",
      },
      {
        name: "Tags",
        description: "Gestão de tags RFID",
      },
      {
        name: "Scanners",
        description: "Gestão e monitorização de scanners RFID",
      },
      {
        name: "Custódias",
        description: "Gestão de custódias",
      },
      {
        name: "Administração - Custódias",
        description:
          "Gestão administrativa de custódias (apenas administradores)",
      },
      {
        name: "Atividades",
        description: "Consulta de atividades do utilizador",
      },
      {
        name: "Administração - Atividades",
        description:
          "Gestão de logs e atividades do sistema (apenas administradores)",
      },
    ],
    servers: [
      {
        url: "/api/v1",
        description: "Servidor Principal",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
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
  // Configurar documentação Swagger
  const swaggerOptions = {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "API de Custódia de Provas RFID - Documentação",
  };

  // Usar any para contornar problemas de tipos
  (app as any).use(
    "/api/v1/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerOptions)
  );

  // Endpoint para obter o JSON do Swagger
  app.get("/api/v1/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  console.log("Documentação Swagger disponível em /api/v1/api-docs");
};
