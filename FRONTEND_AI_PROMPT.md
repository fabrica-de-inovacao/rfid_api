# Prompt para Agente de IA - Modernização do Frontend de Scanners RFID

## 🎯 Objetivo Principal

Modernizar completamente o frontend de gerenciamento de scanners RFID para utilizar todas as novas funcionalidades implementadas na API v6.0, incluindo auto-descoberta de dispositivos, CRUD completo e monitoramento em tempo real.

## 📊 Contexto da API

**Documentação Swagger JSON:** `http://189.90.44.226:9000/api/v1/api-docs.json`

### 🔗 Endpoints de Scanners Implementados

#### 1. **Listagem de Scanners** - `GET /scans/scanners`

```typescript
// Parâmetros opcionais:
- status?: "online" | "offline" | "maintenance"
- safekeeping_id?: string (UUID)
- include_stats?: boolean

// Resposta:
{
  success: true,
  data: ScannerDetails[]
}
```

#### 2. **Detalhes do Scanner** - `GET /scans/scanners/{id}`

```typescript
// Resposta completa com relacionamentos:
{
  success: true,
  data: {
    id: string,
    mac_address: string,
    name: string,
    status: "online" | "offline" | "maintenance",
    last_scan: string | null,
    safekeeping_id: string | null,
    safekeeping: {
      id: string,
      name: string
    } | null,
    created_at: string,
    updated_at: string
  }
}
```

#### 3. **Criar Scanner** - `POST /scans/scanners`

```typescript
// Body obrigatório:
{
  name: string,
  mac_address: string, // Formato XX:XX:XX:XX:XX:XX
  safekeeping_id?: string, // UUID opcional
  description?: string
}
```

#### 4. **Atualizar Scanner** - `PUT /scans/scanners/{id}`

```typescript
// Body opcional (qualquer campo):
{
  name?: string,
  safekeeping_id?: string,
  description?: string,
  status?: "online" | "offline" | "maintenance"
}
```

#### 5. **Deletar Scanner** - `DELETE /scans/scanners/{id}`

```typescript
// Resposta:
{
  success: true,
  message: "Scanner deletado com sucesso"
}
```

#### 6. **Status dos Scanners** - `GET /scans/status`

```typescript
// Lista simplificada para dashboard
ScannerResponse[]
```

#### 7. **Scans Recentes** - `GET /scans/recent?limit=10`

```typescript
// Histórico de atividades dos scanners
```

### 🔒 Autenticação

**Todos os endpoints administrativos requerem Bearer Token:**

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

## 🎨 Requisitos do Frontend

### 📱 Interface Principal - Dashboard de Scanners

1. **Grid/Tabela de Scanners** com:

   - Status visual (online/offline/maintenance) com cores/ícones
   - Nome do scanner editável inline
   - MAC Address (não editável)
   - Custódia associada (dropdown)
   - Último scan (timestamp formatado)
   - Ações: Editar, Deletar, Ver Detalhes

2. **Filtros Avançados:**

   - Por status (todos, online, offline, maintenance)
   - Por custódia (dropdown com todas custódias)
   - Campo de busca por nome/MAC

3. **Estatísticas em Tempo Real:**
   - Total de scanners
   - Scanners online/offline
   - Último scan geral
   - Alertas de scanners inativos

### ➕ Modal de Criação/Edição

1. **Formulário Responsivo:**

   - Nome do scanner (obrigatório)
   - MAC Address (obrigatório, validação XX:XX:XX:XX:XX:XX)
   - Custódia (dropdown opcional)
   - Descrição (opcional)
   - Status (dropdown: online/offline/maintenance)

2. **Validações em Tempo Real:**
   - MAC address format validation
   - Nome único
   - Custódia existente

### 🔍 Página de Detalhes do Scanner

1. **Informações Completas:**

   - Todos os dados do scanner
   - Histórico de scans recentes
   - Gráfico de atividade
   - Logs de status changes

2. **Ações Avançadas:**
   - Alterar custódia
   - Alterar status
   - Ver relatórios
   - Configurações avançadas

### 🚨 Sistema de Auto-Descoberta

1. **Notificações de Novos Scanners:**

   - Toast/modal quando scanner desconhecido é detectado
   - Botão "Registrar Scanner" com dados pré-preenchidos
   - Lista de "Scanners Pendentes" no dashboard

2. **Integração WebSocket:**
   - Atualizações em tempo real de status
   - Notificações de novos scans
   - Alertas de scanners offline

### 📊 Recursos Avançados

1. **Bulk Operations:**

   - Seleção múltipla de scanners
   - Alteração de status em lote
   - Atribuição de custódia em lote
   - Exportação de dados

2. **Histórico e Relatórios:**
   - Timeline de atividades
   - Relatórios de performance
   - Estatísticas de uso
   - Exportação em CSV/PDF

## 🛠️ Implementação Técnica

### Framework Recomendado

- **React** com TypeScript
- **Material-UI** ou **Ant Design** para componentes
- **React Query/TanStack Query** para gerenciamento de estado
- **Socket.io-client** para WebSocket
- **React Router** para navegação
- **React Hook Form** + **Zod** para formulários

### 🔄 Integração com API

1. **Service Layer:**

```typescript
class ScannerService {
  async listScanners(filters?: ScannerFilters): Promise<ScannerResponse>;
  async getScannerById(id: string): Promise<ScannerDetails>;
  async createScanner(data: CreateScannerData): Promise<ScannerDetails>;
  async updateScanner(
    id: string,
    data: UpdateScannerData
  ): Promise<ScannerDetails>;
  async deleteScanner(id: string): Promise<void>;
  async getScannerStatus(): Promise<ScannerStatus[]>;
  async getRecentScans(limit?: number): Promise<ScanActivity[]>;
}
```

2. **Custom Hooks:**

```typescript
const useScanners = (filters?: ScannerFilters)
const useScanner = (id: string)
const useCreateScanner = ()
const useUpdateScanner = ()
const useDeleteScanner = ()
const useScannerStatus = ()
const useRecentScans = (limit?: number)
```

3. **WebSocket Integration:**

```typescript
const useWebSocket = () => {
  // Conectar com ws://189.90.44.226:9000
  // Escutar eventos: 'scanner_status', 'new_scan', 'unknown_scanner'
  // Atualizar estado automaticamente
};
```

### 📱 Responsividade

- Mobile-first design
- Breakpoints: 576px, 768px, 992px, 1200px
- Touch-friendly para tablets
- Offline support com cache

### 🎨 UX/UI Guidelines

1. **Consistência Visual:**

   - Paleta de cores para status (verde=online, vermelho=offline, amarelo=maintenance)
   - Ícones consistentes (wifi, scanner, location)
   - Tipografia hierárquica

2. **Feedback do Usuário:**

   - Loading states em todas operações
   - Toast notifications para ações
   - Confirmações para operações destrutivas
   - Erro handling com mensagens claras

3. **Performance:**
   - Paginação para listas grandes
   - Debounce em campos de busca
   - Lazy loading para modais
   - Optimistic updates

## 🔧 Configuração e Deploy

1. **Variáveis de Ambiente:**

```env
NEXT_PUBLIC_API_URL=http://189.90.44.226:9000/api/v1
NEXT_PUBLIC_WS_URL=ws://189.90.44.226:9000
NEXT_PUBLIC_REFRESH_INTERVAL=30000
```

## 📚 Documentação para Desenvolvedores

- README.md completo
- Guia de componentes
- API integration guide
- Contributing guidelines
- Deployment instructions

## 🎯 Entregáveis Esperados

1. Frontend completo e funcional
2. Integração 100% com todos os endpoints
3. Sistema de notificações em tempo real
4. Interface responsive e acessível
5. Testes unitários e de integração
6. Documentação completa
7. Deploy guide para produção

---
