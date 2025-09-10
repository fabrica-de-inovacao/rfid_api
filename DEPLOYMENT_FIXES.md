# Correções para Deployment no Linux

## Problemas Identificados e Soluções

### 1. Endpoint de Estatísticas de Atividades

**Problema**: Inconsistência no nome do parâmetro.
**Solução**: O parâmetro correto é `days`, não `period`.

**Comando correto**:

```bash
curl -X GET "https://sua-api.com/api/v1/activities/stats?days=30" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 2. Swagger UI em Branco no Linux

**Problemas possíveis**:

- Headers de segurança muito restritivos
- Problemas de CORS
- Arquivos estáticos não sendo servidos corretamente

**Soluções implementadas**:

- Adicionado headers CORS apropriados
- Melhorada configuração do Swagger UI
- Adicionadas opções extras para compatibilidade

### 3. Health Check Retornando Erro

**Problema**: O endpoint `/health` pode estar retornando erro devido a problemas de conectividade MQTT.

**Verificações**:

1. Verificar se o broker MQTT está acessível do servidor Linux
2. Verificar se as portas necessárias estão abertas
3. Verificar logs do servidor para erros específicos

### 4. Configurações Específicas para Linux

**Variáveis de ambiente importantes**:

```bash
NODE_ENV=production
PORT=9000
DATABASE_URL="sua_url_do_postgres"
JWT_SECRET="seu_jwt_secret"
MQTT_BROKER_URL="mqtt://seu_broker"
MQTT_USERNAME="usuario"
MQTT_PASSWORD="senha"
```

**Comando para verificar health check**:

```bash
curl -X GET "https://sua-api.com/health"
```

**Resposta esperada**:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "mqtt_connected": true,
  "websocket_clients": 0
}
```

## Debugging no Linux

### 1. Verificar logs do servidor

```bash
# Se usando PM2
pm2 logs rfid-api

# Se usando systemd
journalctl -u rfid-api -f

# Logs diretos
tail -f /var/log/rfid-api.log
```

### 2. Testar endpoints básicos

```bash
# Health check
curl -X GET "https://sua-api.com/health"

# Swagger JSON
curl -X GET "https://sua-api.com/api/v1/api-docs.json"

# Página inicial (deve retornar HTML)
curl -X GET "https://sua-api.com/"
```

### 3. Verificar permissões de arquivos

```bash
# Verificar se os arquivos HTML estão acessíveis
ls -la /caminho/para/sua/api/dist/views/
```

## Testes Importantes

### 1. Teste do endpoint de estatísticas

```bash
# Login primeiro
TOKEN=$(curl -X POST "https://sua-api.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","password":"senha"}' \
  | jq -r '.data.token')

# Testar estatísticas com parâmetro correto
curl -X GET "https://sua-api.com/api/v1/activities/stats?days=30" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Teste do Swagger UI

1. Acesse `https://sua-api.com/api/v1/api-docs`
2. Verifique se a página carrega completamente
3. Teste alguns endpoints através da interface

## Próximos Passos

1. **Implementar**: Deploy estas correções no servidor Linux
2. **Testar**: Verificar se o Swagger UI está funcionando
3. **Validar**: Confirmar que o health check retorna dados corretos
4. **Monitorar**: Acompanhar logs para identificar outros problemas

## Notas Adicionais

- O Swagger foi configurado com melhor compatibilidade Linux
- Headers CORS foram adicionados para evitar problemas de cross-origin
- O endpoint de estatísticas usa o parâmetro `days` (não `period`)
- As páginas HTML estão configuradas para funcionar tanto no Windows quanto no Linux
