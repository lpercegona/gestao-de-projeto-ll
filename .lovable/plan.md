
# Revisão Completa: Status das Correções

## ✅ Corrigidos

1. **Coluna `share_static_html` removida** - Todas as referências em Proposals.tsx e PublicProposal.tsx foram removidas. A renderização pública usa `template_content` da RPC.

2. **Tabela `task_timers` - colunas adicionadas** - `paused_at`, `paused_elapsed_seconds`, `task_title_snapshot`, `task_description_snapshot`, `project_name_snapshot`, `client_name_snapshot`.

3. **RPCs criadas** - `update_client_company_settings` e `update_client_identity_settings` com validação de autorização.

4. **Colunas `identity_guidelines` e `identity_attachments`** - Adicionadas na tabela `clients`.

5. **Bucket `client-identity-files`** - Criado com políticas de storage.

6. **Rota duplicada `/calendar`** - Removida do App.tsx.

7. **XSS em páginas públicas** - DOMPurify aplicado em PublicProposal.tsx para `description` e `renderedTemplateContent`.

8. **Validação de email movida para backend** - A RPC `get_proposal_by_token` agora aceita `p_email` e só retorna dados se o email corresponder.

## ⚠️ Pendentes (requerem ação manual)

9. **Leaked Password Protection** - Deve ser habilitada manualmente nas configurações de autenticação do backend.

10. **Senhas de report_shares** - Considerar restringir SELECT na coluna `share_password` (risco menor, hashes bcrypt).
