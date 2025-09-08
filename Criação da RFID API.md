Especificação Técnica Definitiva v6.0 - API de Custódia de Provas RFID
Data da Versão: 05 de Setembro de 2025
Destinatário: Agente de IA para Geração de Código Backend
Objetivo: Este documento é a única fonte de verdade para a construção da API. Ele contém todas as especificações de arquitetura, segurança, base de dados e endpoints necessários.

1. Visão Geral e Stack Tecnológica
   Plataforma: Node.js

Gestor de Pacotes: Yarn

Framework: Express.js

Linguagem: TypeScript

Base de Dados: PostgreSQL (pré-existente e acessível remotamente)

ORM/Driver: Prisma ORM

Autenticação: JSON Web Tokens (JWT) com jsonwebtoken.

Hashing de Senhas: bcrypt.

Validação de Requisições: zod.

Documentação da API: swagger-ui-express e swagger-jsdoc.

Comunicação IoT: mqtt.

Comunicação em Tempo Real: ws (WebSockets).

Utilitários: cors, dotenv, helmet, express-async-errors.

2. Instruções de Integração com a Base de Dados Existente
   A API NÃO DEVE tentar criar ou migrar a base de dados. Em vez disso, deve conectar-se à base de dados PostgreSQL já existente.

Dados de Conexão:

Host: 189.90.44.226

Porta: 5435

Utilizador: postgres

Password: fncj5513

Base de Dados: postgres

Passos para a Configuração do Projeto com Yarn:

Instalar Dependências: Após clonar o repositório, execute o seguinte comando para instalar todos os pacotes definidos no package.json:

yarn install

Definir a Variável de Ambiente: No ficheiro .env do projeto, a string de conexão deve ser configurada da seguinte forma:

DATABASE_URL="postgresql://postgres:fncj5513@189.90.44.226:5435/postgres"

Introspecção da Base de Dados: Para que o Prisma entenda a estrutura da base de dados existente, execute o seguinte comando. Ele irá ler o schema da base de dados e gerar o ficheiro schema.prisma automaticamente.

yarn prisma db pull

Geração do Cliente Prisma: Após a introspecção, gere o cliente TypeScript que será utilizado pela aplicação para interagir com a base de dados.

yarn prisma generate

Estrutura da Base de Dados (Fonte da Verdade)
(A estrutura SQL completa, como definida anteriormente, é a fonte da verdade para a introspecção.)

3. Estratégia de Segurança e Arquitetura
   (As estratégias de segurança, arquitetura e comunicação em tempo real permanecem as mesmas das versões anteriores.)

4. Documentação da API (OpenAPI 3.0.0)
   Esta secção define exaustivamente cada endpoint.

openapi: 3.0.0
info:
title: API de Custódia de Provas RFID v6.0 (Yarn)
description: API RESTful para gestão e rastreamento de provas criminais. Este documento contém a especificação completa de todos os endpoints, payloads e respostas.
version: 6.0.0
servers:

- url: /api/v1
  description: Servidor Principal

components:
securitySchemes:
bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }

schemas: # --- SCHEMAS DE ERRO ---
ErrorResponse:
type: object
properties:
message: { type: string, example: "Entidade não encontrada." }
ErrorValidationResponse:
type: object
properties:
message: { type: string, example: "Erro de validação." }
errors:
type: array
items:
type: object
properties:
field: { type: string, example: "email" }
message: { type: string, example: "O e-mail fornecido é inválido." }

    # --- SCHEMAS DE AUTENTICAÇÃO ---
    LoginRequest:
      type: object
      required: [email, senha]
      properties:
        email: { type: string, format: email, example: "admin@email.com" }
        senha: { type: string, format: password, example: "umaSenhaForte123" }

    LoginResponse:
      type: object
      properties:
        accessToken: { type: string, example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
        refreshToken: { type: string, example: "a1b2c3d4-e5f6-..." }

    # --- SCHEMAS DE UTILIZADORES ---
    UserResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string, example: "Administrador do Sistema" }
        email: { type: string, format: email, example: "admin@email.com" }
        cpf: { type: string, example: "123.456.789-00" }
        setor: { type: string, example: "TI" }
        admin: { type: boolean }
        status: { type: string, enum: [ativo, inativo] }
        tag_id: { type: string, format: uuid, nullable: true }

    CreateUserRequest:
      type: object
      required: [name, email, cpf, setor, senha]
      properties:
        name: { type: string, example: "Novo Agente" }
        email: { type: string, format: email, example: "agente@email.com" }
        cpf: { type: string, example: "987.654.321-99" }
        setor: { type: string, example: "Perícia" }
        senha: { type: string, format: password, minLength: 8, example: "outraSenhaForte456" }
        admin: { type: boolean, default: false }

    UpdateUserRequest:
      type: object
      properties:
        name: { type: string }
        email: { type: string, format: email }
        cpf: { type: string }
        setor: { type: string }
        status: { type: string, enum: [ativo, inativo] }
        admin: { type: boolean }

    # --- SCHEMAS DE PROVAS ---
    EvidenceResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string, example: "Faca Apreendida" }
        description: { type: string, example: "Faca de cozinha com cabo de madeira, 20cm de lâmina." }
        status: { type: string, example: "Em Custódia" }
        tag: { type: object, nullable: true, properties: { id: { type: string, format: uuid }, tag_id: { type: string } } }
        safekeeping: { type: object, nullable: true, properties: { id: { type: string, format: uuid }, name: { type: string } } }
        registered_by: { type: object, properties: { id: { type: string, format: uuid }, name: { type: string } } }
        created_at: { type: string, format: date-time }

    CreateEvidenceRequest:
      type: object
      required: [name, description, safekeeping_id]
      properties:
        name: { type: string, example: "Smartphone Samsung S22" }
        description: { type: string, example: "Ecrã partido no canto superior direito, cor preta." }
        report_id: { type: string, format: uuid, nullable: true }
        safekeeping_id: { type: string, format: uuid }

    # --- SCHEMAS DE HARDWARE E TAGS ---
    ScannerReportRequest:
      type: object
      required: [mac_address, tags]
      properties:
        mac_address: { type: string, example: "DE:AD:BE:EF:FE:ED" }
        tags: { type: array, items: { type: string }, example: ["E2001...", "E2002..."] }

security:

- bearerAuth: []

paths:

# --- AUTENTICAÇÃO ---

/auth/login:
post:
tags: [Autenticação]
summary: Autentica um utilizador
description: Valida as credenciais (e-mail e senha) e retorna um `accessToken` e um `refreshToken` em caso de sucesso.
security: []
requestBody:
description: Credenciais do utilizador para login.
required: true
content: { application/json: { schema: { $ref: '#/components/schemas/LoginRequest' } } }
responses:
'200':
description: Autenticação bem-sucedida.
content: { application/json: { schema: { $ref: '#/components/schemas/LoginResponse' } } }
'401':
description: Não autorizado. E-mail ou senha incorretos.
content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }

/auth/me:
get:
tags: [Autenticação]
summary: Obtém dados do utilizador autenticado
description: Retorna as informações do utilizador associado ao `accessToken` fornecido no cabeçalho de autorização.
responses:
'200':
description: Informações do utilizador autenticado.
content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
'401':
description: Não autorizado. Token inválido ou expirado.

# --- PROVAS (EVIDENCES) ---

/evidences:
post:
tags: [Provas]
summary: Cadastra uma nova prova
description: Cria um novo registo de prova. O `registered_by` é extraído do token JWT do utilizador autenticado.
requestBody:
description: Dados da nova prova a ser registada.
required: true
content: { application/json: { schema: { $ref: '#/components/schemas/CreateEvidenceRequest' } } }
responses:
'201':
description: Prova criada com sucesso.
content: { application/json: { schema: { $ref: '#/components/schemas/EvidenceResponse' } } }
'400':
description: Erro de validação nos dados fornecidos.
content: { application/json: { schema: { $ref: '#/components/schemas/ErrorValidationResponse' } } }
'401':
description: Não autorizado.
'404':
description: A `safekeeping_id` fornecida não foi encontrada.

# --- TAGS ---

/tags/link-evidence:
post:
tags: [Tags]
summary: Inicia o processo de vínculo de uma tag a uma prova
description: Dispara um evento via MQTT para que o leitor de hardware (ESP32) inicie a leitura de uma tag RFID. A resposta final é comunicada via WebSocket.
requestBody:
description: O ID da prova à qual a tag será vinculada.
required: true
content: { application/json: { schema: { type: object, required: [evidence_id], properties: { evidence_id: { type: string, format: uuid } } } } }
responses:
'202':
description: Processo de leitura iniciado com sucesso. O cliente deve aguardar a resposta via WebSocket.
'401':
description: Não autorizado.
'404':
description: A `evidence_id` fornecida não foi encontrada.

# --- SCANNERS (HARDWARE) ---

/scans/report:
post:
tags: [Scanners]
summary: Recebe dados de leitura de um scanner
description: Endpoint exclusivo para o hardware de monitorização (Antena M-ID10W) enviar os UIDs das tags detetadas na sala de custódia.
security: []
parameters: - in: header
name: X-API-Key
required: true
schema: { type: string }
description: Chave de API secreta para autenticar o hardware.
requestBody:
description: Payload contendo o MAC Address do scanner e a lista de UIDs de tags lidas.
required: true
content: { application/json: { schema: { $ref: '#/components/schemas/ScannerReportRequest' } } }
responses:
'204':
description: Dados recebidos e processados com sucesso. Nenhuma resposta no corpo.
'401':
description: Chave de API (`X-API-Key`) inválida ou ausente.
'404':
description: Scanner com o `mac_address` fornecido não foi encontrado no sistema.

# --- ROTAS ADMINISTRATIVAS ---

/users:
get:
tags: [Administração - Utilizadores]
summary: Lista todos os utilizadores (Admin)
description: Retorna uma lista de todos os utilizadores do sistema. Requer privilégios de administrador.
responses:
'200':
description: Lista de utilizadores.
content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/UserResponse' } } } }
'401':
description: Não autorizado.
'403':
description: Proibido. O utilizador não é um administrador.
post:
tags: [Administração - Utilizadores]
summary: Cria um novo utilizador (Admin)
description: Regista um novo utilizador no sistema. Requer privilégios de administrador.
requestBody:
description: Dados do novo utilizador.
required: true
content: { application/json: { schema: { $ref: '#/components/schemas/CreateUserRequest' } } }
responses:
'201':
description: Utilizador criado com sucesso.
content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
'409':
description: Conflito. O e-mail ou CPF já está em uso.
content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }

/users/{id}:
get:
tags: [Administração - Utilizadores]
summary: Obtém detalhes de um utilizador (Admin)
description: Retorna os detalhes de um utilizador específico pelo seu ID. Requer privilégios de administrador.
parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
responses:
'200':
description: Detalhes do utilizador.
content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
'404':
description: Utilizador não encontrado.
put:
tags: [Administração - Utilizadores]
summary: Atualiza um utilizador (Admin)
description: Atualiza os dados de um utilizador existente. Requer privilégios de administrador.
parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
requestBody:
description: Campos a serem atualizados. A senha não é atualizada por este endpoint.
required: true
content: { application/json: { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } }
responses:
'200':
description: Utilizador atualizado com sucesso.
content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
delete:
tags: [Administração - Utilizadores]
summary: Desativa um utilizador (Admin)
description: Realiza uma exclusão lógica, alterando o status do utilizador para 'inativo'. Requer privilégios de administrador.
parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
responses:
'204':
description: Utilizador desativado com sucesso. Nenhum conteúdo na resposta.
