
# Correção: Clientes criados via propostas não aparecem na listagem

## Problema

Clientes cadastrados automaticamente ao criar uma proposta recebem `pipeline_status = 'negotiation'`, mas a aba "Em Negociação" na página de Clientes filtra por `pipeline_status === 'proposal'`. Como os valores não coincidem, esses clientes não aparecem em nenhuma aba, apesar de serem contabilizados no total.

Dados confirmados no banco: o cliente "Tania da Costa" possui `pipeline_status = 'negotiation'`.

## Solução

Padronizar o valor do status. A abordagem mais segura é:

1. Atualizar `src/pages/Proposals.tsx` para usar `'proposal'` em vez de `'negotiation'` ao criar clientes via proposta (alinhando com o filtro da listagem).
2. Criar uma migração SQL para corrigir os registros existentes no banco que ainda possuem `pipeline_status = 'negotiation'`, convertendo-os para `'proposal'`.

## Seção Técnica

```text
Arquivos modificados:

1. src/pages/Proposals.tsx
   - Linha ~535: trocar pipeline_status: 'negotiation' por pipeline_status: 'proposal'

2. Migração SQL (nova)
   - UPDATE clients SET pipeline_status = 'proposal' WHERE pipeline_status = 'negotiation';
```
