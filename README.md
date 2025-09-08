# API de Custódia de Provas RFID v6.0

API RESTful para gestão e rastreamento de provas criminais utilizando tecnologia RFID.

## 🚀 Tecnologias Utilizadas

- **Node.js** - Plataforma de execução
- **TypeScript** - Linguagem de programação
- **Express.js** - Framework web
- **Prisma ORM** - ORM para base de dados
- **PostgreSQL** - Base de dados
- **JWT** - Autenticação
- **WebSockets** - Comunicação em tempo real
- **MQTT** - Comunicação IoT
- **Swagger** - Documentação da API
- **Yarn** - Gestor de pacotes

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- Yarn
- PostgreSQL (base de dados remota já configurada)

## 🔧 Instalação

1. **Clone o repositório:**

   ```bash
   git clone <url-do-repositorio>
   cd rfid_api
   ```

2. **Instale as dependências:**

   ```bash
   yarn install
   ```

3. **Configure as variáveis de ambiente:**

   Copie o arquivo `.env.example` para `.env` e configure as variáveis:

   ```bash
   cp .env.example .env
   ```

   As principais variáveis já estão configuradas para a base de dados existente:

   ```env
   DATABASE_URL="postgresql://postgres:fncj5513@189.90.44.226:5435/postgres"
   JWT_SECRET="your-super-secret-jwt-key-here"
   PORT=3000
   ```

4. **Configure o Prisma:**

   Faça a introspecção da base de dados existente:

   ```bash
   yarn prisma db pull
   ```

   Gere o cliente Prisma:

   ```bash
   yarn prisma generate
   ```

## 🏃‍♂️ Execução

### Desenvolvimento

```bash
yarn dev
```

### Produção

```bash
yarn build
yarn start
```

## 📚 Documentação da API

Após iniciar o servidor, a documentação estará disponível em:

- **Swagger UI**: http://localhost:3000/api/docs
- **JSON Schema**: http://localhost:3000/api/docs.json

## 🔗 Endpoints Principais

### Autenticação

- `POST /api/v1/auth/login` - Login de utilizador
- `GET /api/v1/auth/me` - Dados do utilizador autenticado

### Utilizadores (Admin)

- `GET /api/v1/users` - Listar utilizadores
- `POST /api/v1/users` - Criar utilizador
- `GET /api/v1/users/:id` - Obter utilizador
- `PUT /api/v1/users/:id` - Atualizar utilizador
- `DELETE /api/v1/users/:id` - Desativar utilizador

### Provas

- `POST /api/v1/evidences` - Registar nova prova
- `GET /api/v1/evidences` - Listar provas
- `GET /api/v1/evidences/:id` - Obter prova

### Tags

- `POST /api/v1/tags/link-evidence` - Vincular tag a prova

### Scanners

- `POST /api/v1/scans/report` - Relatório de scanner (hardware)
- `GET /api/v1/scans/status` - Status dos scanners
- `GET /api/v1/scans/recent` - Scans recentes

## 🔐 Autenticação

A API utiliza **JWT (JSON Web Tokens)** para autenticação.

Para endpoints protegidos, inclua o token no cabeçalho:

```
Authorization: Bearer <seu-token-jwt>
```

## 🌐 WebSockets

A API fornece comunicação em tempo real via WebSockets na porta **3001**.

Eventos disponíveis:

- `connection_established` - Conexão estabelecida
- `tag_linked` - Tag vinculada a prova
- `evidence_scan` - Resultado de scan de provas
- `scanner_status` - Status do scanner
- `error` - Erros do sistema

## 📡 MQTT

Para comunicação com hardware IoT, a API utiliza MQTT:

**Tópicos:**

- `rfid/tag/link/request` - Solicitar vinculação de tag
- `rfid/tag/read/response` - Resposta de leitura de tag
- `rfid/scanner/+/status` - Status dos scanners

## 🏥 Health Check

Verifique a saúde da API:

```
GET /health
```

Resposta:

```json
{
  "status": "OK",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45,
  "mqtt_connected": true,
  "websocket_clients": 2
}
```

## 🗄️ Base de Dados

A API conecta-se a uma base de dados PostgreSQL **existente** com as seguintes tabelas:

- `users` - Utilizadores do sistema
- `evidences` - Provas criminais
- `tags` - Tags RFID
- `scanners` - Equipamentos de leitura
- `scans` - Registos de leitura
- `safekeepings` - Locais de custódia
- `refresh_tokens` - Tokens de atualização

## 🛡️ Segurança

- **Helmet** - Cabeçalhos de segurança
- **CORS** - Controlo de origem cruzada
- **bcrypt** - Hash de senhas (12 rounds)
- **JWT** - Tokens seguros
- **Validação** - Zod para validação de entrada

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
yarn dev                  # Inicia em modo desenvolvimento
yarn build               # Compila para produção
yarn start               # Inicia versão compilada

# Prisma
yarn prisma:pull         # Introspecção da BD
yarn prisma:generate     # Gerar cliente
yarn prisma:studio       # Interface gráfica da BD
```

## 🚨 Variáveis de Ambiente

| Variável             | Descrição                       | Padrão                |
| -------------------- | ------------------------------- | --------------------- |
| `DATABASE_URL`       | URL da base de dados PostgreSQL | -                     |
| `JWT_SECRET`         | Chave secreta para JWT          | -                     |
| `JWT_REFRESH_SECRET` | Chave para refresh tokens       | -                     |
| `PORT`               | Porta do servidor               | 3000                  |
| `WS_PORT`            | Porta do WebSocket              | 3001                  |
| `HARDWARE_API_KEY`   | Chave para hardware             | -                     |
| `MQTT_BROKER_URL`    | URL do broker MQTT              | mqtt://localhost:1883 |

## 🎯 Funcionalidades

- ✅ Autenticação JWT
- ✅ Gestão de utilizadores
- ✅ Registo de provas
- ✅ Vinculação de tags RFID
- ✅ Monitorização em tempo real
- ✅ Comunicação MQTT
- ✅ WebSockets
- ✅ Documentação Swagger
- ✅ Validação de dados
- ✅ Tratamento de erros
- ✅ Logs de sistema

## 📞 Suporte

Para questões técnicas ou suporte, consulte a documentação da API ou entre em contato com a equipa de desenvolvimento.
