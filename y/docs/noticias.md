# Noticias (noticias.html)

Documentacao da pagina de administracao de noticias e blog.

## Visao geral

Pagina restrita para administradores e imprensa publicarem noticias e posts do blog. Mantem o mesmo layout da home, mas com navegacao da area administrativa.

Arquivos principais:

- `y/noticias.html`
- `y/scripts/index.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Hero de boas-vindas e acesso rapido as noticias.
- Proximos eventos com opcao de cadastro.
- Blocos de noticias e blog com acoes de publicar/editar.
- Dialogos de leitura e edicao de conteudo.

## Fontes de dados (Firestore)

- `news`: noticias publicas.
- `blogPosts`: posts do blog.
- `events`: eventos do clube.
- `members`: contagem de socios e aniversariantes.
- `payments`: alerta de pendencias.

## Permissoes e roles

- Requer autenticacao com roles `admin` ou `imprensa`.
- Botoes de publicar/editar aparecem apenas para essas roles.

## Comportamentos importantes

- Conteudos carregados em tempo real via snapshots.

## IDs de referencia (UI)

- `#new-news-btn`, `#new-blog-btn`, `#add-event-btn`.
- `#news-list`, `#blog-list`, `#events-list`.

## Observacoes

- Usa o mesmo script da home para manter consistencia de comportamento.
