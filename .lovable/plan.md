## Plano: Páginas LGPD + Footer + Modal de Cookies

### Visão geral

Criar 4 páginas públicas de conformidade LGPD, atualizar o footer da Landing com links para elas, e implementar um banner/modal de consentimento de cookies.

### 1. Criar as 4 páginas públicas

Cada página será um componente React com texto corrido estruturado em seções (sem bullets), layout responsivo, com header simplificado e footer consistente.


| Página                  | Rota           | Arquivo                                 |
| ----------------------- | -------------- | --------------------------------------- |
| Política de Privacidade | `/privacidade` | `src/pages/legal/PrivacyPolicy.tsx`     |
| Termos de Uso           | `/termos`      | `src/pages/legal/TermsOfUse.tsx`        |
| Política de Cookies     | `/cookies`     | `src/pages/legal/CookiePolicy.tsx`      |
| Direitos do Titular     | `/direitos`    | `src/pages/legal/DataSubjectRights.tsx` |


Cada página terá:

- Header com logo "oras" e menu (explorar, gestão e entrar
- Conteúdo em `prose` com seções `h2`/`h3` e parágrafos
- Footer com links para as outras páginas legais
- Layout extraído em um componente compartilhado `LegalPageLayout.tsx`

### 2. Componente LegalPageLayout

**Arquivo**: `src/components/legal/LegalPageLayout.tsx`

Layout compartilhado com:

- Header com logo e navegação
- Container de conteúdo com tipografia `prose`
- Footer com links para as 4 páginas legais + copyright

### 3. Registrar rotas no App.tsx

Adicionar as 4 rotas públicas antes do catch-all `/:slug`:

```
/privacidade → PrivacyPolicy
/termos → TermsOfUse
/cookies → CookiePolicy
/direitos → DataSubjectRights
```

### 4. Atualizar footer da Landing

No footer existente de `Landing.tsx` (linhas 313-326), adicionar uma linha de links para as 4 páginas legais, visíveis e responsivos.

### 5. Modal de consentimento de cookies

**Arquivo**: `src/components/legal/CookieConsentBanner.tsx`

- Exibido no primeiro acesso (verificação via `localStorage`)
- 3 ações: "Aceitar todos", "Rejeitar não essenciais", "Personalizar"
- Modo personalizar: toggles para cookies analíticos e marketing
- Armazena preferências em `localStorage` como JSON
- Componente montado no `App.tsx` (fora das rotas, sempre visível)
- Botão discreto no footer para reabrir preferências

### 6. Componente LegalFooter

**Arquivo**: `src/components/legal/LegalFooter.tsx`

Footer reutilizável com links legais, usado tanto na Landing quanto nas páginas legais e no `PublicExplore`. Inclui link para reabrir preferências de cookies.

### Arquivos a criar

- `src/pages/legal/PrivacyPolicy.tsx`
- `src/pages/legal/TermsOfUse.tsx`
- `src/pages/legal/CookiePolicy.tsx`
- `src/pages/legal/DataSubjectRights.tsx`
- `src/components/legal/LegalPageLayout.tsx`
- `src/components/legal/LegalFooter.tsx`
- `src/components/legal/CookieConsentBanner.tsx`

### Arquivos a editar

- `src/App.tsx` — adicionar rotas e montar CookieConsentBanner
- `src/pages/Landing.tsx` — substituir footer por LegalFooter

### Detalhes técnicos

- Consentimento de cookies armazenado em `localStorage` com chave `oras_cookie_consent` contendo `{ essential: true, analytics: boolean, marketing: boolean, timestamp: string }`
- Banner fixo na parte inferior da tela com `z-50`
- Nenhuma alteração de banco de dados necessária
- Páginas são 100% estáticas, sem dependência de autenticação