# Configurações de Teste - CORS Permissivo

## ⚠️ CONFIGURAÇÃO TEMPORÁRIA PARA TESTES

As configurações de CORS foram temporariamente alteradas para aceitar **qualquer origem** durante a fase de testes e debugging.

## Alterações Feitas

### 1. CORS Principal (src/index.ts)

```typescript
// ANTES: Origins restritas
origin: allowedOrigins.length > 0 ? allowedOrigins : true,

// AGORA: Qualquer origem aceita
origin: true, // Aceita qualquer origem
```

### 2. Headers Adicionais Permitidos

- `X-Forwarded-Proto`
- `sec-ch-ua`
- `sec-ch-ua-mobile`
- `sec-ch-ua-platform`
- `User-Agent`
- `Referer`

## Benefícios Durante Testes

✅ **Eliminação de erros CORS**: Nenhuma requisição será bloqueada por CORS
✅ **Compatibilidade total**: Funciona com qualquer navegador/cliente
✅ **Debugging facilitado**: Permite testes de qualquer origem
✅ **Headers modernos**: Suporta headers de segurança do Chrome/Edge

## Comandos de Teste Agora Funcionarão

### Teste via curl com todos os headers

```bash
curl 'https://189.90.44.226:9000/health' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'Referer: https://189.90.44.226:9000/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' \
  -H 'sec-ch-ua: "Chromium";v="140"' \
  -H 'sec-ch-ua-mobile: ?0'
```

### Teste via navegador

- Swagger UI: `https://189.90.44.226:9000/api/v1/api-docs`
- Health Check: `https://189.90.44.226:9000/health`
- API JSON: `https://189.90.44.226:9000/api/v1/api-docs.json`

### Teste de qualquer origem

```javascript
// JavaScript de qualquer domínio funcionará
fetch("https://189.90.44.226:9000/health", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## 🔐 Para Produção Final

**IMPORTANTE**: Antes do deploy final em produção, reverter para origins específicas:

```typescript
// Configuração para produção final
this.app.use(
  cors({
    origin: [
      "https://seu-frontend.com",
      "https://189.90.44.226:3000",
      // Apenas domains confiáveis
    ],
    credentials: true,
    // ... resto da config
  })
);
```

## Status Atual

🟡 **MODO TESTE**: CORS aceita qualquer origem
🔄 **Próximo passo**: Deploy e teste completo
✅ **Quando funcionar**: Restringir origins para produção

---

**Deploy estas alterações no servidor Linux e teste todos os endpoints!**
