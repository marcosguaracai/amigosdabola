# Cadastros (members.html)

Documentacao da pagina de gestao de socios e cadastros.

## Visao geral

Permite cadastrar, editar e organizar socios, visitantes e criancas. A pagina centraliza historico do membro, baixas, isencoes e controle de mensalidades.

Arquivos principais:

- `y/members.html`
- `y/scripts/members.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Formulario de cadastro/edicao de membro.
- Lista de membros com filtros por role e status.
- Painel de historico e baixas do socio.
- Dialogo de mensalidades e isencoes.
- Exportacao de socios.

## Fontes de dados (Firestore)

- `members`: cadastro principal dos membros.
- `membersByEmail`: indice auxiliar por email.
- `payments`: historico de mensalidades.
- `settings/finance`: configuracoes financeiras (mensalidade padrao).
- `settings/publicStats`: contagem publica de socios ativos.
- `auditLogs`: registro de alteracoes criticas.

## Permissoes e roles

- Requer autenticacao (`admin`, `diretor`, `imprensa`, `financeiro`, `tesoureiro`, `socio`, `visitante`, `crianca`).
- Criar/editar membros e alterar status: `admin` e `diretor`.
- Mensalidades: edicao liberada para `admin` e `financeiro`.
- Exclusoes sensiveis no historico: visivel apenas para `admin`.

## Comportamentos importantes

- Cria usuarios no Auth quando necessario (roles com credencial: `admin`, `diretor`, `imprensa`, `financeiro`, `tesoureiro`, `socio`).
- Upload de foto para Storage.
- Controle de status (ativo, pendente, desligado) e historico de baixas.
- Gestao de mensalidades, isencoes e observacoes.

## IDs de referencia (UI)

- `#member-form`, `#member-search`, `#member-role-filter`, `#member-status-filter`.
- `#members-table`, `#members-empty`, `#members-toggle-list`.
- `#member-history`, `#member-exit-form`.
- `#payments-dialog`, `#payments-form`.

## Observacoes

- Exportacao gera CSV com base nos filtros aplicados.
