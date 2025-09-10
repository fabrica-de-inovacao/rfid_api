# Resumo das Correções para HTTPS

## Principais Problemas Resolvidos

### 1. **Parâmetro Incorreto no Endpoint**

- ❌ **Antes**: `?period=30`
- ✅ **Agora**: `?days=30`
- **Endpoint**: `/api/v1/activities/stats`

### 2. **Configuração HTTPS/HTTP**

- ✅ Adicionado `trust proxy` para detecção HTTPS
- ✅ Headers de segurança configurados para ambos protocolos
- ✅ CORS configurado para HTTPS e HTTP
- ✅ CSP permitindo recursos necessários para Swagger UI

### 3. **Swagger UI Melhorado**

- ✅ Múltiplos servidores configurados (HTTPS/HTTP)
- ✅ Headers CORS apropriados
- ✅ Middleware específico para HTTPS
- ✅ `unsafe-eval` habilitado para Swagger UI funcionar

### 4. **Detecção Automática de Protocol**

- ✅ Middleware detecta `X-Forwarded-Proto: https`
- ✅ Logging melhorado com protocolo correto
- ✅ Headers de segurança condicionais

## Comandos para Testar

### Teste Rápido - Health Check

```bash
curl -k 'https://189.90.44.226:9000/health'
```

### Teste Rápido - Swagger

```bash
# No navegador:
https://189.90.44.226:9000/api/v1/api-docs
```

### Teste Rápido - Estatísticas (com parâmetro correto)

```bash
curl -k -X GET 'https://189.90.44.226:9000/api/v1/activities/stats?days=30' \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Arquivos Modificados

1. **src/index.ts**

   - Trust proxy configurado
   - CORS melhorado para HTTPS
   - Middleware de detecção HTTPS
   - Headers de segurança apropriados

2. **src/config/swagger.ts**
   - Múltiplos servidores (HTTPS/HTTP)
   - Headers CORS para Swagger UI
   - Middleware específico para HTTPS
   - CSP configurado para Swagger funcionar

## Deploy Instructions

1. **Fazer deploy do código atualizado no servidor Linux**
2. **Reiniciar a aplicação** (`pm2 restart` ou equivalente)
3. **Testar endpoints** usando os comandos acima
4. **Verificar Swagger UI** no navegador

## Se Ainda Houver Problemas

1. **Verificar logs** da aplicação para erros específicos
2. **Confirmar proxy reverso** está enviando `X-Forwarded-Proto`
3. **Testar sem proxy** diretamente na porta 9000
4. **Verificar certificado SSL** se usando HTTPS

---

**Próximo passo**: Deploy no servidor Linux e teste dos endpoints!
