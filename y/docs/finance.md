# Financeiro (finance.html)

Documentacao do painel financeiro do clube.

## Visao geral

Centraliza a gestao de mensalidades, pendencias e movimentacoes gerais do clube. Inclui dashboards, exportacao e controle de comprovantes.

Arquivos principais:

- `y/finance.html`
- `y/scripts/finance.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Configuracao da mensalidade padrao.
- Visao financeira do mes (receitas, pendencias, saldo).
- Registro de recebimentos de mensalidade.
- Lista de pendencias com busca e filtros.
- Relatorios e exportacoes.
- Secao de movimentacoes gerais e do bar.

## Fontes de dados (Firestore)

- `payments`: mensalidades e status.
- `members`: socios para referencia e filtros.
- `settings/finance`: configuracoes e contadores.
- `generalTransactions`: receitas/despesas gerais.
- `barTransactions`: movimentacoes do bar.
- `membersByEmail`: resolucao de perfil por email.

## Permissoes e roles

- Requer autenticacao (`admin`, `diretor`, `financeiro`, `imprensa`, `socio`, `tesoureiro`, `visitante`, `crianca`).
- Alterar valor de mensalidade, registrar pagamentos e movimentacoes: `admin` e `financeiro`.
- Demais roles acessam visualizacao conforme regras do Firestore.

## Comportamentos importantes

- Upload de comprovantes para Storage.
- Exportacao de pendencias e socios ativos.
- Graficos via Chart.js e planilhas via XLSX.
- Dialogos de detalhe para resumo e cobrancas.

## IDs de referencia (UI)

- `#finance-fee-form`, `#finance-payment-dialog`, `#finance-payment-form`.
- `#finance-pending-table`, `#finance-pending-search`.
- `#finance-receipts-list`, `#finance-receipts-search`.
- `#general-transaction-form`.

## Observacoes

- A pagina usa CDN do Chart.js e XLSX.
