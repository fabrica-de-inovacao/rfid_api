# Manual de Endpoints – Safekeepings

Base URL (exemplo): `https://<host>/api/v1`

Autenticação: Header `Authorization: Bearer <JWT>` (endpoints marcados como Admin também requerem que o usuário tenha permissão de administrador).

---

## Sumário

1. [Listar custódias](#1-listar-custódias)
2. [Detalhe simples](#2-detalhe-simples)
3. [Detalhe avançado](#3-detalhe-avançado)
4. [Criar custódia (Admin)](#4-criar-custódia-admin)
5. [Atualizar custódia (Admin)](#5-atualizar-custódia-admin)
6. [Remover custódia (Admin)](#6-remover-custódia-admin)
7. [Listar usuários disponíveis (Admin)](#7-listar-usuários-disponíveis-admin)
8. [Adicionar usuário (Admin)](#8-adicionar-usuário-admin)
9. [Remover usuário (Admin)](#9-remover-usuário-admin)
10. [Erros comuns](#erros-comuns)
11. [Estratégia recomendada no Frontend](#estratégia-recomendada-no-frontend)
12. [Campos dinâmicos de presença](#campos-dinâmicos-de-presença)

---

## 1. Listar custódias

`GET /safekeepings`

Query Params:

- `page` (int, default 1)
- `limit` (int, default 10)
- `search` (string, opcional)

Exemplo (PowerShell):

```powershell
curl -s "$BASE/api/v1/safekeepings?page=1&limit=5" -H "Authorization: Bearer TOKEN"
```

Resposta (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "6f4d5b3b-9f5c-4a4d-9ef1-9a5d0e0c1111",
      "name": "Depósito Central",
      "manager_id": "9c2f8b9d-7e2a-4f0d-9a0b-2a1d4e6f2222",
      "users": {
        "id": "9c2f8b9d-7e2a-4f0d-9a0b-2a1d4e6f2222",
        "name": "Maria Souza",
        "email": "maria@example.com",
        "setor": "Logística"
      },
      "_count": {
        "evidences": 18,
        "scanners": 3,
        "users_safekeepings": 4
      },
      "created_at": "2025-09-12T13:10:22.123Z",
      "updated_at": "2025-09-12T13:10:22.123Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 5,
    "total": 12,
    "total_pages": 3
  }
}
```

---

## 2. Detalhe simples

`GET /safekeepings/{id}`

Exemplo:

```powershell
curl -s "$BASE/api/v1/safekeepings/6f4d5b3b-9f5c-4a4d-9ef1-9a5d0e0c1111" -H "Authorization: Bearer TOKEN"
```

Resposta (200) (resumido):

```json
{
  "success": true,
  "data": {
    "id": "6f4d5b3b-9f5c-4a4d-9ef1-9a5d0e0c1111",
    "name": "Depósito Central",
    "manager_id": "9c2f8b9d-7e2a-4f0d-9a0b-2a1d4e6f2222",
    "users": {
      "id": "9c2f8b9d-7e2a-4f0d-9a0b-2a1d4e6f2222",
      "name": "Maria Souza",
      "email": "maria@example.com",
      "setor": "Logística"
    },
    "evidences": [
      {
        "id": "0a1b2c3d-aaaa-bbbb-cccc-111122223333",
        "name": "Notebook Lenovo",
        "description": "Etiqueta lateral",
        "status": "ativo",
        "created_at": "2025-09-11T12:10:00.000Z",
        "tag_id": "f1a2b3c4-d5e6-7890-1234-abcdefabcdef"
      }
    ],
    "scanners": [
      {
        "id": "ab12cd34-ef56-7890-ab12-cd34ef56ab78",
        "mac_address": "AA:BB:CC:DD:EE:FF",
        "name": "Scanner 01",
        "status": "ACTIVE",
        "last_scan": "2025-09-12T13:15:10.000Z"
      }
    ],
    "users_safekeepings": [
      {
        "users": {
          "id": "11111111-2222-3333-4444-555555555555",
          "name": "João Silva",
          "email": "joao@example.com",
          "setor": "TI"
        }
      }
    ],
    "_count": {
      "evidences": 18,
      "scanners": 3,
      "users_safekeepings": 4
    },
    "created_at": "2025-09-12T13:10:22.123Z",
    "updated_at": "2025-09-12T13:10:22.123Z"
  }
}
```

---

## 3. Detalhe avançado

`GET /safekeepings/{id}/details`

Query params:

| Param                      | Tipo    | Default | Descrição                               |
| -------------------------- | ------- | ------- | --------------------------------------- |
| include_scanners           | boolean | false   | Inclui lista de scanners                |
| include_items              | boolean | false   | Inclui itens/evidences paginados        |
| items_page                 | int     | 1       | Página de itens (se include_items=true) |
| items_per_page             | int     | 50      | Itens por página (1..100)               |
| presence_threshold_minutes | int     | 60      | Janela (min) para marcar `present=true` |

Exemplos:

```powershell
# Básico
curl -s "$BASE/api/v1/safekeepings/{ID}/details" -H "Authorization: Bearer TOKEN"

# Com scanners
curl -s "$BASE/api/v1/safekeepings/{ID}/details?include_scanners=true" -H "Authorization: Bearer TOKEN"

# Com itens paginados (página 2 de 25) + scanners + threshold 15 min
curl -s "$BASE/api/v1/safekeepings/{ID}/details?include_items=true&items_page=2&items_per_page=25&presence_threshold_minutes=15&include_scanners=true" -H "Authorization: Bearer TOKEN"
```

Resposta (200) (com scanners e itens):

```json
{
  "success": true,
  "data": {
    "id": "6f4d5b3b-9f5c-4a4d-9ef1-9a5d0e0c1111",
    "name": "Depósito Central",
    "description": null,
    "manager": {
      "id": "9c2f8b9d-7e2a-4f0d-9a0b-2a1d4e6f2222",
      "name": "Maria Souza",
      "email": "maria@example.com",
      "phone": null
    },
    "scanners": [
      {
        "id": "ab12cd34-ef56-7890-ab12-cd34ef56ab78",
        "name": "Scanner 01",
        "mac_address": "AA:BB:CC:DD:EE:FF",
        "status": "ACTIVE",
        "last_scan": "2025-09-12T13:15:10.000Z",
        "antenna_id": null,
        "location": null
      }
    ],
    "items": {
      "data": [
        {
          "id": "0a1b2c3d-aaaa-bbbb-cccc-111122223333",
          "tag_id": "f1a2b3c4-d5e6-7890-1234-abcdefabcdef",
          "name": "Notebook Lenovo",
          "description": "Etiqueta lateral",
          "last_seen_at": "2025-09-12T13:20:00.000Z",
          "last_seen_by_scanner_id": "ab12cd34-ef56-7890-ab12-cd34ef56ab78",
          "present": true,
          "metadata": { "status": "ativo", "registered_by": null }
        },
        {
          "id": "2b3c4d5e-aaaa-bbbb-cccc-666677778888",
          "tag_id": null,
          "name": "Mochila Preta",
          "description": null,
          "last_seen_at": null,
          "last_seen_by_scanner_id": null,
          "present": false,
          "metadata": { "status": "pendente", "registered_by": null }
        }
      ],
      "meta": {
        "total": 57,
        "page": 2,
        "per_page": 25,
        "total_pages": 3,
        "total_present": 31,
        "total_absent": 26
      }
    },
    "created_at": "2025-09-12T13:10:22.123Z",
    "updated_at": "2025-09-12T13:10:22.123Z"
  }
}
```

**Regras:**

- `present = true` quando `last_seen_at >= now - presence_threshold_minutes`.
- `total_present` e `total_absent` referem-se **apenas à página retornada**, não ao total global.

---

## 4. Criar custódia (Admin)

`POST /safekeepings`

Body:

```json
{
  "name": "Depósito Norte",
  "manager_id": "9c2f8b9d-7e2a-4f0d-9a0b-2a1d4e6f2222"
}
```

Exemplo:

```powershell
curl -s -X POST "$BASE/api/v1/safekeepings" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Depósito Norte"}'
```

Resposta (201):

```json
{
  "success": true,
  "message": "Custódia criada com sucesso",
  "data": {
    "id": "...",
    "name": "Depósito Norte",
    "manager_id": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

## 5. Atualizar custódia (Admin)

`PUT /safekeepings/{id}`

Body exemplo:

```json
{ "name": "Depósito Norte - Atualizado" }
```

Resposta (200):

```json
{
  "success": true,
  "message": "Custódia atualizada com sucesso",
  "data": { "id": "..." }
}
```

---

## 6. Remover custódia (Admin)

`DELETE /safekeepings/{id}`

Bloqueios: evidences ou scanners vinculados.

Resposta (200):

```json
{ "success": true, "message": "Custódia deletada com sucesso" }
```

Erro (400):

```json
{
  "success": false,
  "message": "Não é possível deletar custódia com provas vinculadas"
}
```

---

## 7. Listar usuários disponíveis (Admin)

`GET /safekeepings/users/available`

Resposta:

```json
{
  "success": true,
  "data": [
    {
      "id": "111...",
      "name": "João Silva",
      "email": "joao@example.com",
      "setor": "TI"
    }
  ]
}
```

---

## 8. Adicionar usuário (Admin)

`POST /safekeepings/{id}/users/{userId}`

Resposta (201):

```json
{
  "success": true,
  "message": "Usuário adicionado à custódia com sucesso",
  "data": {
    "user_id": "...",
    "safekeeping_id": "...",
    "users": {
      "id": "...",
      "name": "João Silva",
      "email": "joao@example.com",
      "setor": "TI"
    }
  }
}
```

Conflito (400):

```json
{ "success": false, "message": "Usuário já está vinculado a esta custódia" }
```

---

## 9. Remover usuário (Admin)

`DELETE /safekeepings/{id}/users/{userId}`

Resposta (200):

```json
{ "success": true, "message": "Usuário removido da custódia com sucesso" }
```

Erro (404):

```json
{ "success": false, "message": "Usuário não está vinculado a esta custódia" }
```

---

## Erros Comuns

| Status | Cenário                                                       |
| ------ | ------------------------------------------------------------- |
| 400    | Parâmetros inválidos (ex: `items_per_page` fora do intervalo) |
| 401    | Sem token ou token inválido                                   |
| 403    | Usuário não é admin (em rotas restritas)                      |
| 404    | Custódia/usuário não encontrado                               |
| 500    | Erro interno inesperado                                       |

Exemplos:

```json
{ "success": false, "message": "items_per_page deve estar entre 1 e 100" }
{ "success": false, "message": "Custódia não encontrada" }
```

---

## Estratégia Recomendada no Frontend

1. Lista inicial: `GET /safekeepings` (paginação) para cards.
2. Tela detalhe (carregamento rápido): `GET /safekeepings/{id}/details` (sem parâmetros) – básico.
3. Aba "Scanners": refazer com `include_scanners=true`.
4. Aba "Itens": chamar com `include_items=true`.
5. Paginação itens: alterar `items_page` mantendo `include_items=true`.
6. Atualização de presença: refetch periódico só dos itens (ex: 30–60s) ou futura assinatura websocket.

---

## Campos Dinâmicos de Presença

- `present = true` se `last_seen_at >= (now - presence_threshold_minutes * 60s)`.
- `total_present` / `total_absent`: calculados somente sobre a **página retornada**.

---

## Possíveis Extensões Futuras (Sugestões)

- Filtro por `present=true|false`.
- Ordenação customizada (`order_by=last_seen_at`).
- Export CSV dos itens.
- Websocket para atualizar presença em tempo real.

---

## Changelog

- Adicionados campos: `total_present`, `total_absent` (meta.items) em `GET /safekeepings/{id}/details`.

---

## Contato

Em caso de inconsistências de resposta, validar no Swagger (`/api/v1/api-docs`).
