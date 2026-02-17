

# Plano: Corrigir listagem de itens/servicos na criacao de propostas para admins

## Diagnostico

A pagina de Propostas (`Proposals.tsx`) nao exibe os itens de servico cadastrados pelo admin porque a **chave do localStorage esta incorreta**.

- **Services.tsx** salva itens manuais com a chave: `services:manual-items:${user.id}`
- **Proposals.tsx** le com a chave fixa: `services:manual-items` (sem o ID do usuario)

Como as chaves nao batem, o array de itens manuais sempre vem vazio. Alem disso, como admins regulares novos podem nao ter propostas proprias ainda (RLS filtra por `owner_id`), a lista de itens extraidos de propostas tambem fica vazia. Resultado: nenhum item aparece no seletor de catalogo.

## Solucao

### 1. Corrigir a chave do localStorage em Proposals.tsx

Alterar a constante `MANUAL_ITEMS_STORAGE_KEY` para usar o ID do usuario, identico ao padrao de `Services.tsx`.

```text
Antes (linha 125):
  const MANUAL_ITEMS_STORAGE_KEY = 'services:manual-items';

Depois:
  Remover a constante fixa e construir a chave dinamicamente usando user.id
  const storageKey = user ? `services:manual-items:${user.id}` : 'services:manual-items';
```

### 2. Atualizar o useEffect que le os itens manuais

Adicionar `user` como dependencia e usar a chave dinamica.

```text
Antes (linhas 365-376):
  useEffect(() => {
    const storedItems = localStorage.getItem(MANUAL_ITEMS_STORAGE_KEY);
    ...
  }, []);

Depois:
  useEffect(() => {
    if (!user) return;
    const storedItems = localStorage.getItem(storageKey);
    ...
  }, [user, storageKey]);
```

## Secao Tecnica

```text
Arquivo a modificar:
  - src/pages/Proposals.tsx

Alteracao 1 - Linha 125:
  Remover: const MANUAL_ITEMS_STORAGE_KEY = 'services:manual-items';

Alteracao 2 - Apos a obtencao de user do useAuth (~linha 330):
  Adicionar: const storageKey = user ? `services:manual-items:${user.id}` : 'services:manual-items';

Alteracao 3 - useEffect de itens manuais (linhas 365-376):
  Substituir MANUAL_ITEMS_STORAGE_KEY por storageKey
  Adicionar guard: if (!user) return;
  Adicionar dependencias: [user, storageKey]

Nenhuma migracao SQL necessaria.
```
