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
