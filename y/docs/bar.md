# Bar & Belisco (bar.html)

Documentacao da pagina de gestao do bar.

## Visao geral

Controla precos de referencia, registra entradas e saidas e acompanha o historico de movimentacoes do bar.

Arquivos principais:

- `y/bar.html`
- `y/scripts/bar.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Formulario de configuracao de precos.
- Registro de movimentacao com comprovante.
- Cards de resumo (receitas, despesas, saldo).
- Tabela de historico de movimentacoes.

## Fontes de dados (Firestore)

- `settings/bar`: precos de referencia.
- `barTransactions`: historico de movimentacoes.

## Permissoes e roles

- Requer autenticacao (`admin`, `financeiro`, `diretor`, `imprensa`, `socio`, `tesoureiro`, `visitante`, `crianca`).
- Ajustar precos e registrar movimentacoes: `admin` e `financeiro`.

## Comportamentos importantes

- Upload de comprovantes para Storage.
- Dialogos de resumo com detalhes por periodo.

## IDs de referencia (UI)

- `#bar-settings-form`, `#bar-transaction-form`.
- `#bar-transactions-table`, `#bar-transactions-empty`.
- `#bar-summary-dialog`.

## Observacoes

- Valores usam mascara de moeda e validacao de tamanho de arquivo para recibos.
