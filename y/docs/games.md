# Jogos (games.html)

Documentacao da pagina de dia de jogos.

## Visao geral

Gerencia presencas, escalações, partidas e cronometro do dia. Tambem acompanha pontuacao anual por temporada.

Arquivos principais:

- `y/games.html`
- `y/scripts/games.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Presencas e status de participacao.
- Times e escalacoes.
- Partidas, cronometro e destaques.
- Pontuacao anual com tabela e edicao.

## Fontes de dados (Firestore)

- `gameDays`: dados do dia de jogo (presencas, partidas, notas).
- `seasonStandings`: pontuacao anual por temporada.
- `members`: base de socios para selecoes.

## Permissoes e roles

- Requer autenticacao (`admin`, `diretor`, `imprensa`, `financeiro`, `tesoureiro`, `socio`, `visitante`, `crianca`).
- Edicao de jogos e pontuacao: apenas `admin` e `imprensa`.

## Comportamentos importantes

- Cronometro com persistencia local (localStorage).
- Edicao de pontuacao e exportacao de tabela.

## IDs de referencia (UI)

- `#scoreboard-season-select`, `#scoreboard-table`, `#scoreboard-modal`.
- `#scoreboard-form`, `#scoreboard-feedback`.

## Observacoes

- A pagina evita restaurar scroll ao recarregar para manter fluxo do dia de jogo.
