# Painel (dashboard.html)

Documentacao da pagina de painel geral da area restrita.

## Visao geral

O painel mostra um resumo rapido da situacao do clube, dados do usuario logado e uma timeline de movimentacoes recentes. A pagina permite atualizar dados do perfil e alterar senha/email quando permitido.

Arquivos principais:

- `y/dashboard.html`
- `y/scripts/dashboard.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Cabecalho com menu da area restrita.
- Card "Seu perfil" com dados basicos e foto.
- Resumo rapido (socios, mensalidades e receita do mes).
- Timeline de movimentacoes com filtros e busca.

## Fontes de dados (Firestore)

- `members`: dados do usuario e contagem geral.
- `payments`: movimentacoes e totais por periodo.
- `settings/finance`: configuracoes financeiras (ex.: mensalidade padrao).

## Permissoes e roles

- Requer autenticacao (qualquer role logada).
- Edicao de perfil disponivel para o proprio usuario.
- Alteracao de senha/email segue regras do Firebase Auth.

## Comportamentos importantes

- Atualizacao de perfil com upload de foto.
- Alteracao de senha/email via Firebase Auth.
- Timeline com filtros e busca.

## IDs de referencia (UI)

- `#member-count`, `#current-fee`, `#payments-up-to-date`, `#payments-pending`, `#current-month-income`.
- `#timeline-list`, `#timeline-search`, `#timeline-toggle`.
- `#profile-dialog`, `#password-dialog`.

## Observacoes

- O menu mobile usa drawer compartilhado com outras paginas da area restrita.
