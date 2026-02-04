

## Plano: Liberar Calendário para Clientes

### Problema

A rota `/calendar` está configurada com `requiredRole="admin"`, bloqueando o acesso para usuários com role `client`.

### Análise do Código

**Arquivo:** `src/App.tsx` (linhas 132-137)
```typescript
{/* Calendar - admin only */}
<Route path="/calendar" element={
  <ProtectedRoute requiredRole="admin">
    <CalendarPage />
  </ProtectedRoute>
} />
```

**Lógica do ProtectedRoute:**
| requiredRole | Roles com Acesso |
|--------------|------------------|
| `master_admin` | master_admin |
| `admin` | master_admin, admin |
| `collaborator` | master_admin, admin, collaborator |
| `client` | master_admin, admin, collaborator, client |

---

### Solução

Alterar `requiredRole` de `"admin"` para `"client"` na rota `/calendar`.

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Trocar `requiredRole="admin"` por `requiredRole="client"` na rota `/calendar` |

---

### Alteração

**Antes (linhas 132-137):**
```typescript
{/* Calendar - admin only */}
<Route path="/calendar" element={
  <ProtectedRoute requiredRole="admin">
    <CalendarPage />
  </ProtectedRoute>
} />
```

**Depois:**
```typescript
{/* Calendar - accessible by all authenticated users */}
<Route path="/calendar" element={
  <ProtectedRoute requiredRole="client">
    <CalendarPage />
  </ProtectedRoute>
} />
```

---

### Resultado

Usuários com qualquer role autenticado (master_admin, admin, collaborator, client) poderão acessar o calendário em `/calendar`.

O filtro de dados (mostrar apenas projetos/tarefas do cliente) já foi implementado anteriormente no `CalendarPage.tsx` através das políticas RLS do banco de dados.

