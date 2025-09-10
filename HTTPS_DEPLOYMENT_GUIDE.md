# Configuração para Servidor Linux com HTTPS

## Problemas Identificados e Soluções Implementadas

### 1. **Mixed Content (HTTPS/HTTP)**

**Problema**: Navegador bloqueia requisições HTTP quando página servida via HTTPS
**Solução**: Configurado suporte completo para HTTPS com detecção automática

### 2. **Headers de Segurança**

**Problema**: Helmet muito restritivo para Swagger UI
**Solução**: Configurados headers apropriados para HTTPS

### 3. **CORS para HTTPS**

**Problema**: CORS não permitia requisições cross-origin HTTPS
**Solução**: Configurado CORS para ambos HTTP e HTTPS

## Configurações Implementadas

### Trust Proxy

```typescript
app.set("trust proxy", true);
```

- Necessário para detectar HTTPS através de proxy reverso (Nginx/Apache)

### Content Security Policy

```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval necessário para Swagger
    connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"]
  }
}
```

### Servidores Swagger

```typescript
servers: [
  { url: "/api/v1", description: "Servidor Atual (Relativo)" },
  { url: "https://189.90.44.226:9000/api/v1", description: "Produção HTTPS" },
  { url: "http://189.90.44.226:9000/api/v1", description: "Produção HTTP" },
];
```

## Comandos de Teste

### 1. Health Check

```bash
# HTTPS
curl -k 'https://189.90.44.226:9000/health'

# HTTP
curl 'http://189.90.44.226:9000/health'
```

### 2. Swagger UI

```bash
# Acessar via navegador
https://189.90.44.226:9000/api/v1/api-docs

# Testar JSON
curl -k 'https://189.90.44.226:9000/api/v1/api-docs.json'
```

### 3. Página Principal

```bash
# HTTPS
curl -k 'https://189.90.44.226:9000/'

# HTTP
curl 'http://189.90.44.226:9000/'
```

### 4. Endpoint de Atividades (com token)

```bash
# Login primeiro
TOKEN=$(curl -k -X POST 'https://189.90.44.226:9000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemplo.com","password":"senha"}' \
  | jq -r '.data.token')

# Testar estatísticas (parâmetro correto: days)
curl -k -X GET 'https://189.90.44.226:9000/api/v1/activities/stats?days=30' \
  -H "Authorization: Bearer $TOKEN"
```

## Variáveis de Ambiente para Produção

```bash
# .env para produção
NODE_ENV=production
PORT=9000
SERVER_HOST=189.90.44.226
DATABASE_URL="postgresql://user:pass@localhost:5432/rfid_db"
JWT_SECRET="seu_jwt_secret_muito_seguro"
MQTT_BROKER_URL="mqtt://seu_broker_mqtt"
MQTT_USERNAME="usuario_mqtt"
MQTT_PASSWORD="senha_mqtt"
FRONTEND_URL="https://189.90.44.226:3000"
```

## Configuração do Nginx (se usando proxy reverso)

```nginx
server {
    listen 443 ssl;
    server_name 189.90.44.226;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Headers específicos para Swagger UI
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name 189.90.44.226;
    return 301 https://$server_name$request_uri;
}
```

## Verificações Pós-Deploy

### 1. Verificar se a aplicação está rodando

```bash
pm2 status
# ou
systemctl status rfid-api
```

### 2. Verificar logs

```bash
pm2 logs rfid-api
# ou
journalctl -u rfid-api -f
```

### 3. Testar todos os endpoints principais

```bash
# Health check
curl -k https://189.90.44.226:9000/health

# Swagger UI (deve retornar HTML)
curl -k https://189.90.44.226:9000/api/v1/api-docs

# Swagger JSON (deve retornar JSON válido)
curl -k https://189.90.44.226:9000/api/v1/api-docs.json

# Página inicial (deve retornar HTML)
curl -k https://189.90.44.226:9000/
```

## Debugging

### 1. Se Swagger UI não carregar

- Verificar console do navegador para erros CSP
- Verificar se arquivos estáticos estão sendo servidos
- Testar `/api/v1/api-docs.json` primeiro

### 2. Se health check falhar

- Verificar se MQTT broker está acessível
- Verificar variáveis de ambiente
- Verificar logs da aplicação

### 3. Se CORS ainda der erro

- Verificar headers na requisição
- Confirmar se `trust proxy` está funcionando
- Verificar logs do Nginx (se usando)

## Notas Importantes

1. **Certificado SSL**: Se usando HTTPS, certifique-se de que o certificado é válido
2. **Firewall**: Portas 9000 e 443 devem estar abertas
3. **DNS**: Domínio deve apontar para o servidor
4. **Trust Proxy**: Essencial para detecção correta de HTTPS
5. **Headers**: X-Forwarded-Proto deve ser definido pelo proxy reverso
