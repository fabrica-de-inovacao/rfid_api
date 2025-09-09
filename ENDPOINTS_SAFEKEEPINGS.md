# Guia de Endpoints - Safekeepings (Custódias)

Este documento descreve como usar os endpoints para gerenciar custódias na API de Custódia de Provas RFID.

## Autenticação

Todos os endpoints de safekeepings requerem autenticação via JWT token. Adicione o header:

```
Authorization: Bearer <seu_jwt_token>
```

## Permissões

- **Listar e visualizar custódias**: Qualquer usuário autenticado
- **Criar, atualizar, deletar custódias**: Apenas administradores
- **Gerenciar usuários em custódias**: Apenas administradores

---

## 1. Criar Nova Custódia

**POST** `/api/v1/safekeepings`

### Permissão

🔒 **Apenas Administradores**

### Body

```json
{
  "name": "Custódia Central",
  "manager_id": "123e4567-e89b-12d3-a456-426614174000" // Opcional
}
```

### Exemplo usando cURL

```bash
curl -X POST http://localhost:3000/api/v1/safekeepings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "name": "Custódia Central",
    "manager_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Resposta de Sucesso (201)

```json
{
  "success": true,
  "message": "Custódia criada com sucesso",
  "data": {
    "id": "987fcdeb-51a2-4def-9876-543210987654",
    "name": "Custódia Central",
    "manager_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-09-08T10:30:00.000Z",
    "updated_at": "2025-09-08T10:30:00.000Z",
    "users": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "setor": "Segurança"
    },
    "_count": {
      "evidences": 0,
      "scanners": 0,
      "users_safekeepings": 0
    }
  }
}
```

---

## 2. Listar Todas as Custódias

**GET** `/api/v1/safekeepings`

### Parâmetros de Query (Opcionais)

- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 10, máximo: 100)
- `search`: Filtrar por nome da custódia

### Exemplo usando cURL

```bash
# Listar todas
curl -X GET http://localhost:3000/api/v1/safekeepings \
  -H "Authorization: Bearer SEU_JWT_TOKEN"

# Com paginação e busca
curl -X GET "http://localhost:3000/api/v1/safekeepings?page=1&limit=5&search=Central" \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "987fcdeb-51a2-4def-9876-543210987654",
      "name": "Custódia Central",
      "manager_id": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2025-09-08T10:30:00.000Z",
      "updated_at": "2025-09-08T10:30:00.000Z",
      "users": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "João Silva",
        "email": "joao@empresa.com",
        "setor": "Segurança"
      },
      "_count": {
        "evidences": 15,
        "scanners": 3,
        "users_safekeepings": 5
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 1,
    "total_pages": 1
  }
}
```

---

## 3. Obter Custódia por ID

**GET** `/api/v1/safekeepings/{id}`

### Exemplo usando cURL

```bash
curl -X GET http://localhost:3000/api/v1/safekeepings/987fcdeb-51a2-4def-9876-543210987654 \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "data": {
    "id": "987fcdeb-51a2-4def-9876-543210987654",
    "name": "Custódia Central",
    "manager_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-09-08T10:30:00.000Z",
    "updated_at": "2025-09-08T10:30:00.000Z",
    "users": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "setor": "Segurança"
    },
    "evidences": [
      {
        "id": "456e7890-a12b-34c5-d678-901234567890",
        "name": "Evidência 001",
        "description": "Computador apreendido",
        "status": "ativo",
        "created_at": "2025-09-07T15:20:00.000Z",
        "tag_id": "tag-123456"
      }
    ],
    "scanners": [
      {
        "id": "789a0123-b45c-67d8-e901-234567890123",
        "mac_address": "AA:BB:CC:DD:EE:FF",
        "name": "Scanner Principal",
        "status": "ativo",
        "last_scan": "2025-09-08T09:15:00.000Z"
      }
    ],
    "users_safekeepings": [
      {
        "users": {
          "id": "user-789",
          "name": "Maria Santos",
          "email": "maria@empresa.com",
          "setor": "Investigação"
        }
      }
    ],
    "_count": {
      "evidences": 15,
      "scanners": 3,
      "users_safekeepings": 5
    }
  }
}
```

---

## 4. Atualizar Custódia

**PUT** `/api/v1/safekeepings/{id}`

### Permissão

🔒 **Apenas Administradores**

### Body

```json
{
  "name": "Custódia Central Atualizada",
  "manager_id": "outro-manager-id" // Ou null para remover
}
```

### Exemplo usando cURL

```bash
curl -X PUT http://localhost:3000/api/v1/safekeepings/987fcdeb-51a2-4def-9876-543210987654 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "name": "Custódia Central Atualizada"
  }'
```

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "message": "Custódia atualizada com sucesso",
  "data": {
    "id": "987fcdeb-51a2-4def-9876-543210987654",
    "name": "Custódia Central Atualizada",
    "manager_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-09-08T10:30:00.000Z",
    "updated_at": "2025-09-08T11:45:00.000Z",
    "users": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "setor": "Segurança"
    },
    "_count": {
      "evidences": 15,
      "scanners": 3,
      "users_safekeepings": 5
    }
  }
}
```

---

## 5. Deletar Custódia

**DELETE** `/api/v1/safekeepings/{id}`

### Permissão

🔒 **Apenas Administradores**

### ⚠️ Importante

- Não é possível deletar custódias que tenham provas vinculadas
- Não é possível deletar custódias que tenham scanners vinculados

### Exemplo usando cURL

```bash
curl -X DELETE http://localhost:3000/api/v1/safekeepings/987fcdeb-51a2-4def-9876-543210987654 \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "message": "Custódia deletada com sucesso"
}
```

### Resposta de Erro (400)

```json
{
  "success": false,
  "message": "Não é possível deletar custódia com provas vinculadas"
}
```

---

## 6. Adicionar Usuário à Custódia

**POST** `/api/v1/safekeepings/{id}/users/{userId}`

### Permissão

🔒 **Apenas Administradores**

### Exemplo usando cURL

```bash
curl -X POST http://localhost:3000/api/v1/safekeepings/987fcdeb-51a2-4def-9876-543210987654/users/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### Resposta de Sucesso (201)

```json
{
  "success": true,
  "message": "Usuário adicionado à custódia com sucesso",
  "data": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "safekeeping_id": "987fcdeb-51a2-4def-9876-543210987654",
    "users": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "setor": "Segurança"
    }
  }
}
```

---

## 7. Remover Usuário da Custódia

**DELETE** `/api/v1/safekeepings/{id}/users/{userId}`

### Permissão

🔒 **Apenas Administradores**

### Exemplo usando cURL

```bash
curl -X DELETE http://localhost:3000/api/v1/safekeepings/987fcdeb-51a2-4def-9876-543210987654/users/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "message": "Usuário removido da custódia com sucesso"
}
```

---

## 8. Listar Usuários Disponíveis

**GET** `/api/v1/safekeepings/users/available`

### Permissão

🔒 **Apenas Administradores**

### Exemplo usando cURL

```bash
curl -X GET http://localhost:3000/api/v1/safekeepings/users/available \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "setor": "Segurança"
    },
    {
      "id": "456e7890-a12b-34c5-d678-901234567890",
      "name": "Maria Santos",
      "email": "maria@empresa.com",
      "setor": "Investigação"
    }
  ]
}
```

---

## Códigos de Status HTTP

### Sucesso

- **200**: OK - Operação realizada com sucesso
- **201**: Created - Recurso criado com sucesso

### Erro do Cliente

- **400**: Bad Request - Dados inválidos ou regra de negócio violada
- **401**: Unauthorized - Token de autenticação inválido ou ausente
- **403**: Forbidden - Usuário não tem permissão para a operação
- **404**: Not Found - Recurso não encontrado

### Erro do Servidor

- **500**: Internal Server Error - Erro interno do servidor

---

## Exemplos de Uso com JavaScript/TypeScript

### Usando fetch API

```javascript
// Configuração base
const API_BASE_URL = "http://localhost:3000/api/v1";
const token = "SEU_JWT_TOKEN";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

// Criar custódia
async function criarCustodia(nome, managerId = null) {
  const response = await fetch(`${API_BASE_URL}/safekeepings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: nome,
      manager_id: managerId,
    }),
  });

  return await response.json();
}

// Listar custódias
async function listarCustodias(page = 1, limit = 10, search = "") {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });

  const response = await fetch(`${API_BASE_URL}/safekeepings?${params}`, {
    headers,
  });

  return await response.json();
}

// Obter custódia por ID
async function obterCustodia(id) {
  const response = await fetch(`${API_BASE_URL}/safekeepings/${id}`, {
    headers,
  });

  return await response.json();
}

// Adicionar usuário à custódia
async function adicionarUsuario(custodiaId, usuarioId) {
  const response = await fetch(
    `${API_BASE_URL}/safekeepings/${custodiaId}/users/${usuarioId}`,
    {
      method: "POST",
      headers,
    }
  );

  return await response.json();
}
```

### Usando axios

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api/v1",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Criar custódia
const criarCustodia = async (nome, managerId) => {
  try {
    const response = await api.post("/safekeepings", {
      name: nome,
      manager_id: managerId,
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao criar custódia:", error.response.data);
    throw error;
  }
};

// Listar custódias com busca
const listarCustodias = async (filtros = {}) => {
  try {
    const response = await api.get("/safekeepings", { params: filtros });
    return response.data;
  } catch (error) {
    console.error("Erro ao listar custódias:", error.response.data);
    throw error;
  }
};
```

---

## Tratamento de Erros

### Formato de Resposta de Erro

```json
{
  "success": false,
  "message": "Mensagem de erro principal",
  "errors": [
    {
      "field": "nome_do_campo",
      "message": "Mensagem específica do campo"
    }
  ]
}
```

### Exemplos de Erros Comuns

#### Dados de Validação Inválidos (400)

```json
{
  "success": false,
  "message": "Dados inválidos",
  "errors": [
    {
      "field": "name",
      "message": "Nome da custódia é obrigatório"
    },
    {
      "field": "manager_id",
      "message": "ID do gestor deve ser um UUID válido"
    }
  ]
}
```

#### Não autorizado (401)

```json
{
  "success": false,
  "message": "Token inválido ou expirado"
}
```

#### Acesso negado (403)

```json
{
  "success": false,
  "message": "Acesso negado. Apenas administradores podem realizar esta operação."
}
```

---

## Testando com Postman

1. **Importe a Collection**: Use o Swagger UI em `http://localhost:3000/api-docs` para gerar automaticamente a collection do Postman

2. **Configure Variáveis de Ambiente**:

   - `base_url`: `http://localhost:3000/api/v1`
   - `token`: Seu JWT token obtido do login

3. **Headers Globais**:

   ```
   Content-Type: application/json
   Authorization: Bearer {{token}}
   ```

4. **Ordem de Testes Sugerida**:
   1. Login para obter token
   2. Listar usuários disponíveis
   3. Criar nova custódia
   4. Listar custódias
   5. Obter custódia específica
   6. Adicionar usuário à custódia
   7. Atualizar custódia
   8. Remover usuário da custódia
   9. Deletar custódia (apenas se vazia)

---

## Documentação Swagger

A documentação completa dos endpoints está disponível em:
**http://localhost:3000/api-docs**

Lá você encontrará:

- Interface interativa para testar os endpoints
- Schemas detalhados de request/response
- Exemplos de uso
- Códigos de erro possíveis
