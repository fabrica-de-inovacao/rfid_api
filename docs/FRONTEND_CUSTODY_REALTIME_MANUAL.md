# 📱 Manual Frontend - Monitoramento em Tempo Real de Custódias

## 🎯 Visão Geral

Este manual descreve como integrar os novos endpoints de monitoramento em tempo real nas telas de **Safekeeping (Custódias)**. O sistema permite visualizar em tempo real quais evidências estão fisicamente presentes na sala de custódia versus quais deveriam estar.

---

## 🔗 Endpoints Disponíveis

### Base URL: `/api/v1`

| Endpoint                               | Método | Descrição                      | Uso na Tela         |
| -------------------------------------- | ------ | ------------------------------ | ------------------- |
| `/custody-realtime/{id}/status`        | GET    | Status em tempo real           | Dashboard principal |
| `/custody-realtime/{id}/alerts`        | GET    | Alertas (ausentes/inesperadas) | Notificações        |
| `/custody-realtime/{id}/history`       | GET    | Histórico de presença          | Gráficos/relatórios |
| `/custody-realtime/{id}/monitor/start` | POST   | Iniciar monitoramento          | Auto-refresh        |
| `/scans/antenna/{ip}/sdcard`           | GET    | Consulta direta antena         | Debug/manual        |

---

## 📊 1. Status em Tempo Real da Custódia

### **Endpoint:**

```
GET /api/v1/custody-realtime/{safekeepingId}/status
```

### **Headers:**

```javascript
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

### **Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Status em tempo real obtido com sucesso",
  "data": {
    "safekeeping_id": "123e4567-e89b-12d3-a456-426614174000",
    "safekeeping_name": "Sala de Custódia Principal",
    "scanner": {
      "id": "scanner-uuid",
      "name": "Scanner Sala 101",
      "mac_address": "54:43:B2:95:0C:50",
      "antenna_ip": "192.168.2.100",
      "status": "online",
      "last_scan": "2025-09-16T14:30:00.000Z"
    },
    "evidences": [
      {
        "id": "evidence-uuid-1",
        "name": "Faca Apreendida",
        "tag_id": "E2801191A50300653CF11502",
        "expected_present": true,
        "currently_present": true, // ✅ PRESENTE
        "last_seen_at": "2025-09-16T14:25:00.000Z",
        "status_changed_at": "2025-09-16T14:30:00.000Z"
      },
      {
        "id": "evidence-uuid-2",
        "name": "Notebook Dell",
        "tag_id": "E2801191A50300653CF11503",
        "expected_present": true,
        "currently_present": false, // ❌ AUSENTE
        "last_seen_at": "2025-09-16T12:15:00.000Z",
        "status_changed_at": "2025-09-16T14:30:00.000Z"
      }
    ],
    "summary": {
      "total_evidences": 10,
      "expected_present": 8,
      "currently_present": 6,
      "missing": 2, // 🚨 Provas ausentes
      "unexpected": 0 // 🚨 Provas inesperadas
    },
    "last_updated": "2025-09-16T14:30:00.000Z"
  }
}
```

### **Como Usar na Tela:**

```javascript
// React/Vue/Angular - Função para buscar status
async function getCustodyStatus(safekeepingId) {
  try {
    const response = await fetch(
      `/api/v1/custody-realtime/${safekeepingId}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Erro ao buscar status:", error);
    throw error;
  }
}

// Exemplo de uso
getCustodyStatus("safekeeping-uuid").then((status) => {
  // Atualizar interface
  updateDashboard(status);
  updateStatusCards(status.summary);
  updateEvidenceList(status.evidences);
});
```

### **Componentes Sugeridos para a Tela:**

#### 🎛️ **Dashboard Cards:**

```html
<!-- Cards de Resumo -->
<div class="custody-summary">
  <div class="card total">
    <h3>Total de Evidências</h3>
    <span class="number">{{status.summary.total_evidences}}</span>
  </div>

  <div class="card present success">
    <h3>Presentes</h3>
    <span class="number">{{status.summary.currently_present}}</span>
  </div>

  <div class="card missing danger">
    <h3>Ausentes</h3>
    <span class="number">{{status.summary.missing}}</span>
  </div>

  <div class="card unexpected warning">
    <h3>Inesperadas</h3>
    <span class="number">{{status.summary.unexpected}}</span>
  </div>
</div>
```

#### 📋 **Lista de Evidências:**

```html
<!-- Lista de Evidências com Status -->
<div class="evidence-list">
  <div
    v-for="evidence in status.evidences"
    :key="evidence.id"
    :class="['evidence-item', getStatusClass(evidence)]"
  >
    <div class="evidence-info">
      <h4>{{evidence.name}}</h4>
      <span class="tag-id">Tag: {{evidence.tag_id}}</span>
    </div>

    <div class="evidence-status">
      <span v-if="evidence.currently_present" class="status present">
        ✅ PRESENTE
      </span>
      <span v-else class="status absent"> ❌ AUSENTE </span>
    </div>

    <div class="evidence-time">
      Visto por último: {{formatTime(evidence.last_seen_at)}}
    </div>
  </div>
</div>
```

---

## 🚨 2. Alertas da Custódia

### **Endpoint:**

```
GET /api/v1/custody-realtime/{safekeepingId}/alerts
```

### **Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Alertas detectados",
  "data": {
    "has_alerts": true,
    "missing_count": 2,
    "unexpected_count": 0,
    "missing": [
      {
        "id": "evidence-uuid",
        "name": "Smartphone Samsung",
        "tag_id": "E2801191A50300653CF11504"
      }
    ],
    "unexpected": []
  }
}
```

### **Como Usar na Tela:**

```javascript
// Função para buscar alertas
async function getCustodyAlerts(safekeepingId) {
  const response = await fetch(
    `/api/v1/custody-realtime/${safekeepingId}/alerts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();
  return result.data;
}

// Exibir alertas na interface
function showAlerts(alerts) {
  if (alerts.has_alerts) {
    // Mostrar notificação de alerta
    showNotification({
      type: "warning",
      title: "Alertas de Custódia",
      message: `${alerts.missing_count} prova(s) ausente(s), ${alerts.unexpected_count} inesperada(s)`,
    });

    // Atualizar badge de alertas
    updateAlertBadge(alerts.missing_count + alerts.unexpected_count);
  }
}
```

---

## 📊 3. Histórico de Presença

### **Endpoint:**

```
GET /api/v1/custody-realtime/{safekeepingId}/history?hours=24
```

### **Parâmetros de Query:**

- `hours`: Período em horas (1-168, padrão: 24)

### **Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Histórico de 24 horas obtido com sucesso",
  "data": {
    "safekeeping_id": "safekeeping-uuid",
    "period_hours": 24,
    "history_points": 24,
    "history": [
      {
        "timestamp": "2025-09-16T14:00:00.000Z",
        "tags_present": ["tag1", "tag2", "tag3"],
        "evidences_present": 3,
        "total_evidences": 10
      }
    ]
  }
}
```

### **Como Usar para Gráficos:**

```javascript
// Buscar histórico
async function getCustodyHistory(safekeepingId, hours = 24) {
  const response = await fetch(
    `/api/v1/custody-realtime/${safekeepingId}/history?hours=${hours}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();
  return result.data.history;
}

// Preparar dados para Chart.js
function prepareChartData(history) {
  return {
    labels: history.map((point) =>
      new Date(point.timestamp).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Evidências Presentes",
        data: history.map((point) => point.evidences_present),
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  };
}
```

---

## 🔄 4. Monitoramento Contínuo

### **Iniciar Monitoramento:**

```
POST /api/v1/custody-realtime/{safekeepingId}/monitor/start?interval=5
```

### **Parâmetros de Query:**

- `interval`: Intervalo em minutos (1-60, padrão: 5)

### **Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Monitoramento iniciado com sucesso",
  "data": {
    "monitoring_id": "custody_uuid_timestamp",
    "safekeeping_id": "safekeeping-uuid",
    "interval_minutes": 5,
    "status": "active"
  }
}
```

### **Parar Monitoramento:**

```
DELETE /api/v1/custody-realtime/monitor/{monitoringId}/stop
```

### **Como Implementar:**

```javascript
// Gerenciador de monitoramento
class CustodyMonitor {
  constructor(safekeepingId, websocketUrl) {
    this.safekeepingId = safekeepingId;
    this.monitoringId = null;
    this.websocket = new WebSocket(websocketUrl);
    this.setupWebSocket();
  }

  // Iniciar monitoramento
  async start(intervalMinutes = 5) {
    try {
      const response = await fetch(
        `/api/v1/custody-realtime/${this.safekeepingId}/monitor/start?interval=${intervalMinutes}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      this.monitoringId = result.data.monitoring_id;

      console.log("Monitoramento iniciado:", result.data);
      return result.data;
    } catch (error) {
      console.error("Erro ao iniciar monitoramento:", error);
      throw error;
    }
  }

  // Parar monitoramento
  async stop() {
    if (this.monitoringId) {
      try {
        await fetch(
          `/api/v1/custody-realtime/monitor/${this.monitoringId}/stop`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.monitoringId = null;
        console.log("Monitoramento parado");
      } catch (error) {
        console.error("Erro ao parar monitoramento:", error);
      }
    }
  }

  // Configurar WebSocket
  setupWebSocket() {
    this.websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "custody_monitoring_update":
          this.handleMonitoringUpdate(message.data);
          break;
        case "custody_alerts":
          this.handleAlerts(message.data);
          break;
      }
    };
  }

  // Tratar atualizações
  handleMonitoringUpdate(data) {
    console.log("Atualização de monitoramento:", data);

    // Atualizar interface automaticamente
    this.updateInterface(data.status);

    // Mostrar alertas se houver
    if (data.alerts.missing.length > 0 || data.alerts.unexpected.length > 0) {
      this.showRealTimeAlert(data.alerts);
    }
  }

  // Tratar alertas
  handleAlerts(data) {
    console.log("Alertas recebidos:", data);
    this.showRealTimeAlert(data.alerts);
  }
}

// Uso na tela de custódia
const monitor = new CustodyMonitor(safekeepingId, "ws://localhost:3001");

// Iniciar quando entrar na tela
monitor.start(5); // A cada 5 minutos

// Parar quando sair da tela
window.addEventListener("beforeunload", () => {
  monitor.stop();
});
```

---

## 🎨 5. Sugestões de Interface

### **Estrutura da Tela de Custódia:**

```html
<!-- Tela de Detalhes da Custódia -->
<div class="custody-detail-page">
  <!-- Header com informações básicas -->
  <div class="custody-header">
    <h1>{{safekeeping.name}}</h1>
    <div class="status-indicator" :class="scannerStatus">
      Scanner: {{scanner.status}}
    </div>
    <button @click="refreshStatus" class="refresh-btn">
      🔄 Atualizar Status
    </button>
  </div>

  <!-- Dashboard de Cards -->
  <div class="custody-dashboard">
    <div class="summary-cards">
      <!-- Cards implementados acima -->
    </div>

    <!-- Gráfico de histórico -->
    <div class="history-chart">
      <canvas id="presenceChart"></canvas>
    </div>
  </div>

  <!-- Lista de evidências -->
  <div class="evidence-section">
    <div class="section-header">
      <h2>Evidências</h2>
      <div class="filters">
        <button @click="filterBy('all')" :class="{active: filter === 'all'}">
          Todas
        </button>
        <button
          @click="filterBy('present')"
          :class="{active: filter === 'present'}"
        >
          Presentes
        </button>
        <button
          @click="filterBy('missing')"
          :class="{active: filter === 'missing'}"
        >
          Ausentes
        </button>
      </div>
    </div>

    <!-- Lista de evidências implementada acima -->
    <div class="evidence-list">
      <!-- Componente de lista -->
    </div>
  </div>

  <!-- Alertas -->
  <div v-if="alerts.has_alerts" class="alerts-section">
    <h3>🚨 Alertas Ativos</h3>

    <div v-if="alerts.missing.length > 0" class="alert-group missing">
      <h4>Provas Ausentes ({{alerts.missing.length}})</h4>
      <div v-for="item in alerts.missing" :key="item.id" class="alert-item">
        {{item.name}} - Tag: {{item.tag_id}}
      </div>
    </div>

    <div v-if="alerts.unexpected.length > 0" class="alert-group unexpected">
      <h4>Provas Inesperadas ({{alerts.unexpected.length}})</h4>
      <div
        v-for="item in alerts.unexpected"
        :key="item.tag_id"
        class="alert-item"
      >
        Tag: {{item.tag_id}} - {{item.evidence_name || 'Desconhecida'}}
      </div>
    </div>
  </div>
</div>
```

### **CSS Sugerido:**

```css
/* Status das evidências */
.evidence-item.present {
  border-left: 4px solid #28a745;
  background-color: #f8fff9;
}

.evidence-item.absent {
  border-left: 4px solid #dc3545;
  background-color: #fff8f8;
}

.status.present {
  color: #28a745;
  font-weight: bold;
}

.status.absent {
  color: #dc3545;
  font-weight: bold;
}

/* Cards de resumo */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card.success {
  background-color: #d4edda;
}
.card.danger {
  background-color: #f8d7da;
}
.card.warning {
  background-color: #fff3cd;
}

/* Alertas */
.alerts-section {
  margin-top: 2rem;
  padding: 1rem;
  border: 2px solid #dc3545;
  border-radius: 8px;
  background-color: #fff5f5;
}

.alert-item {
  padding: 0.5rem;
  margin: 0.25rem 0;
  background-color: white;
  border-radius: 4px;
  border-left: 3px solid #dc3545;
}
```

---

## 📱 6. Integração WebSocket

### **Configuração do WebSocket:**

```javascript
// Conectar ao WebSocket
const ws = new WebSocket("ws://localhost:3001");

ws.onopen = () => {
  console.log("WebSocket conectado");
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "custody_status_requested":
      console.log("Status de custódia solicitado:", message.data);
      break;

    case "custody_alerts":
      handleCustodyAlerts(message.data);
      break;

    case "custody_monitoring_update":
      handleMonitoringUpdate(message.data);
      break;
  }
};

// Tratar alertas em tempo real
function handleCustodyAlerts(data) {
  // Mostrar notificação toast
  showToast({
    type: "warning",
    title: "Alerta de Custódia",
    message: `Custódia ${data.safekeeping_id} tem alertas`,
    duration: 5000,
  });

  // Atualizar badge de notificações
  updateNotificationBadge();

  // Se estivermos na tela da custódia, atualizar
  if (currentSafekeepingId === data.safekeeping_id) {
    refreshCustodyStatus();
  }
}

// Tratar atualizações de monitoramento
function handleMonitoringUpdate(data) {
  if (data.monitoring_id && currentMonitoringId === data.monitoring_id) {
    // Atualizar interface automaticamente
    updateCustodyInterface(data.status);

    // Mostrar alertas se houver
    if (data.alerts.missing.length > 0 || data.alerts.unexpected.length > 0) {
      showInlineAlerts(data.alerts);
    }
  }
}
```

---

## 🔧 7. Exemplo de Implementação Completa (React)

```jsx
import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";

const CustodyRealtimePage = ({ safekeepingId }) => {
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState({ has_alerts: false });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(null);

  // Carregar dados iniciais
  useEffect(() => {
    loadCustodyData();
    startMonitoring();

    return () => {
      if (monitoring) {
        stopMonitoring();
      }
    };
  }, [safekeepingId]);

  // Carregar status, alertas e histórico
  const loadCustodyData = async () => {
    try {
      setLoading(true);

      const [statusData, alertsData, historyData] = await Promise.all([
        getCustodyStatus(safekeepingId),
        getCustodyAlerts(safekeepingId),
        getCustodyHistory(safekeepingId, 24),
      ]);

      setStatus(statusData);
      setAlerts(alertsData);
      setHistory(historyData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar monitoramento
  const startMonitoring = async () => {
    try {
      const monitor = new CustodyMonitor(safekeepingId, "ws://localhost:3001");
      const result = await monitor.start(5); // A cada 5 minutos
      setMonitoring(monitor);
    } catch (error) {
      console.error("Erro ao iniciar monitoramento:", error);
    }
  };

  // Parar monitoramento
  const stopMonitoring = async () => {
    if (monitoring) {
      await monitoring.stop();
      setMonitoring(null);
    }
  };

  if (loading) {
    return <div>Carregando status da custódia...</div>;
  }

  return (
    <div className="custody-realtime-page">
      {/* Header */}
      <div className="custody-header">
        <h1>{status.safekeeping_name}</h1>
        <div className={`status-indicator ${status.scanner.status}`}>
          Scanner: {status.scanner.status}
        </div>
        <button onClick={loadCustodyData} className="refresh-btn">
          🔄 Atualizar
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="summary-cards">
        <div className="card total">
          <h3>Total</h3>
          <span className="number">{status.summary.total_evidences}</span>
        </div>
        <div className="card present success">
          <h3>Presentes</h3>
          <span className="number">{status.summary.currently_present}</span>
        </div>
        <div className="card missing danger">
          <h3>Ausentes</h3>
          <span className="number">{status.summary.missing}</span>
        </div>
        <div className="card unexpected warning">
          <h3>Inesperadas</h3>
          <span className="number">{status.summary.unexpected}</span>
        </div>
      </div>

      {/* Alertas */}
      {alerts.has_alerts && (
        <div className="alerts-section">
          <h3>🚨 Alertas Ativos</h3>

          {alerts.missing.length > 0 && (
            <div className="alert-group missing">
              <h4>Provas Ausentes ({alerts.missing.length})</h4>
              {alerts.missing.map((item) => (
                <div key={item.id} className="alert-item">
                  {item.name} - Tag: {item.tag_id}
                </div>
              ))}
            </div>
          )}

          {alerts.unexpected.length > 0 && (
            <div className="alert-group unexpected">
              <h4>Provas Inesperadas ({alerts.unexpected.length})</h4>
              {alerts.unexpected.map((item) => (
                <div key={item.tag_id} className="alert-item">
                  Tag: {item.tag_id} - {item.evidence_name || "Desconhecida"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de Evidências */}
      <div className="evidence-section">
        <h2>Evidências</h2>
        <div className="evidence-list">
          {status.evidences.map((evidence) => (
            <div
              key={evidence.id}
              className={`evidence-item ${
                evidence.currently_present ? "present" : "absent"
              }`}
            >
              <div className="evidence-info">
                <h4>{evidence.name}</h4>
                <span className="tag-id">Tag: {evidence.tag_id}</span>
              </div>

              <div className="evidence-status">
                <span
                  className={`status ${
                    evidence.currently_present ? "present" : "absent"
                  }`}
                >
                  {evidence.currently_present ? "✅ PRESENTE" : "❌ AUSENTE"}
                </span>
              </div>

              <div className="evidence-time">
                Visto: {new Date(evidence.last_seen_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustodyRealtimePage;
```

---

## 🚀 8. Resumo de Implementação

### **Passos para Integração:**

1. **Adicionar nova aba/seção** na tela de Safekeeping
2. **Implementar os 4 endpoints principais** usando as funções fornecidas
3. **Configurar WebSocket** para atualizações em tempo real
4. **Criar componentes visuais** (cards, lista, alertas)
5. **Implementar monitoramento automático** com start/stop
6. **Adicionar notificações** para alertas em tempo real

### **Recursos Visuais Importantes:**

- ✅ **Indicador Verde**: Evidência presente
- ❌ **Indicador Vermelho**: Evidência ausente
- 🚨 **Alertas em Destaque**: Seção de alertas visível
- 📊 **Cards de Resumo**: Visão geral rápida
- 🔄 **Auto-refresh**: Atualizações automáticas via WebSocket

### **Benefícios para o Usuário:**

- **Visão em Tempo Real**: Sabe exatamente o que está presente
- **Alertas Imediatos**: Notificação de problemas instantânea
- **Interface Intuitiva**: Visual claro do status de cada evidência
- **Monitoramento Contínuo**: Não precisa ficar atualizando manualmente
- **Histórico**: Pode ver padrões ao longo do tempo

Este sistema transformará as telas de custódia em um **dashboard de monitoramento em tempo real** completo! 🎉
