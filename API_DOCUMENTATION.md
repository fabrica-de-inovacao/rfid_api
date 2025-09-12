# 📚 Documentação API RFID v6.0 - Sistema Completo

## 🚀 Visão Geral

API RESTful avançada para gestão e rastreamento de provas criminais com tecnologia RFID, incluindo sistema de auto-descoberta de scanners e monitoramento em tempo real.

## 🌟 Funcionalidades Principais

### 🔍 Auto-Descoberta de Scanners

- Detecção automática de novos scanners na rede
- Registro como "pendente" para aprovação administrativa
- Sistema de contadores e histórico de tentativas
- Fluxo de aprovação/rejeição via API

### 📡 Monitoramento em Tempo Real

- WebSocket para notificações instantâneas
- Status de scanners online/offline/maintenance
- Histórico de scans com filtros avançados
- Alertas automáticos para provas fora da custódia

### ⚙️ Gestão Completa CRUD

- **Scanners**: Criar, listar, atualizar, deletar
- **Provas**: Gerenciamento completo de evidências
- **Custódias**: Locais e responsáveis
- **Utilizadores**: Sistema de permissões e auditoria

## 📊 Endpoints Principais

### 🔐 Autenticação

```bash
POST /auth/login          # Login com email/senha
POST /auth/refresh        # Renovar token
POST /auth/logout         # Logout
```

### 📡 Scanners - Operação

```bash
POST /scans/report        # Receber dados do hardware (scanner)
GET /scans/status         # Status de todos os scanners
GET /scans/recent         # Histórico de scans
GET /scans/recent?include_pending=true  # Incluir scanners pendentes
```

### ⚙️ Scanners - Administração

```bash
GET /scans/scanners                     # Listar todos
POST /scans/scanners                    # Criar novo
GET /scans/scanners/{id}                # Detalhes
PUT /scans/scanners/{id}                # Atualizar
DELETE /scans/scanners/{id}             # Deletar
```

### 🔍 Scanners Pendentes

```bash
GET /scans/pending-scanners             # Listar pendentes
POST /scans/pending-scanners/{id}/approve  # Aprovar
POST /scans/pending-scanners/{id}/reject   # Rejeitar
```

## 🔄 Fluxos de Trabalho

### 📱 Descoberta Automática de Scanner

1. **Hardware desconhecido** envia `POST /scans/report`
2. **Sistema detecta** MAC address não cadastrado
3. **Registro automático** na tabela `pending_scanners`
4. **Administrador acessa** `GET /scans/pending-scanners`
5. **Aprovação** via `POST /scans/pending-scanners/{id}/approve`
6. **Scanner ativo** para receber dados normalmente

### 🔄 Processamento Normal de Scans

1. **Scanner cadastrado** envia dados via `POST /scans/report`
2. **Validação** de MAC address e tags RFID
3. **Processamento** das tags detectadas
4. **Verificação** de custódia correta
5. **Armazenamento** no histórico de scans
6. **Notificações** WebSocket para clientes conectados
7. **Alertas** se prova fora da custódia esperada

## 📚 Documentação Swagger

**URL:** `http://localhost:9000/api/v1/api-docs`  
**JSON:** `http://localhost:9000/api/v1/api-docs.json`

A documentação Swagger inclui:

- Especificação completa de todos os endpoints
- Exemplos de request/response
- Schemas detalhados
- Casos de uso e fluxos de trabalho
- Códigos de erro e tratamento

## ⚙️ Configuração

### Variáveis de Ambiente

```env
DATABASE_URL="postgresql://user:pass@host:port/db"
JWT_SECRET="seu-jwt-secret-seguro"
JWT_REFRESH_SECRET="seu-refresh-secret-seguro"
HARDWARE_API_KEY="chave-para-hardware-rfid"
PORT=9000
NODE_ENV=production
```

### Requisitos

- Node.js 18+
- PostgreSQL 13+
- TypeScript 5+
- Prisma ORM

## 🚀 Deploy

### Desenvolvimento

```bash
yarn install
npx prisma generate
npx prisma db push
yarn dev
```

### Produção

```bash
yarn install --production
npx prisma generate
npx prisma migrate deploy
yarn build
yarn start
```

## 📈 Monitoramento

### Health Check

```bash
GET /health
```

### Métricas de Sistema

- Status de scanners ativos
- Número de scans por período
- Scanners pendentes de aprovação
- Alertas de custódia

## 🔒 Segurança

### Autenticação JWT

- Access token (15 minutos)
- Refresh token (7 dias)
- Renovação automática

### Autorização

- Endpoints públicos: `/health`, `/scans/report`
- Endpoints protegidos: Requerem Bearer token
- Endpoints admin: Verificação de permissão

### Hardware API Key

- Chave específica para hardware RFID
- Header: `Authorization: Bearer {HARDWARE_API_KEY}`
- Apenas para endpoint `/scans/report`

## 🚨 Códigos de Erro

| Código | Descrição                   |
| ------ | --------------------------- |
| 200    | Sucesso                     |
| 201    | Criado com sucesso          |
| 204    | Processado sem conteúdo     |
| 400    | Dados inválidos             |
| 401    | Não autorizado              |
| 403    | Acesso negado               |
| 404    | Não encontrado              |
| 409    | Conflito (dados duplicados) |
| 500    | Erro interno do servidor    |

## 📞 Suporte

Para suporte técnico ou dúvidas sobre implementação:

- Email: suporte@fabricadeinovacao.com
- Documentação: `/api/v1/api-docs`
- Logs do sistema: Console da aplicação

---

**Versão:** 6.0.0  
**Última atualização:** 11 de setembro de 2025
