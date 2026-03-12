# Home (index.html)

Documentacao da pagina publica do clube, incluindo layout, fontes de dados e comportamentos principais.

## Visao geral

A home apresenta noticias, blog, eventos e destaques informativos do clube. Ela oferece acesso ao login, exibicao de contagem de socios, alertas de mensalidade pendente e aniversariantes do dia. Administradores e diretores podem publicar conteudos e cadastrar eventos diretamente pela interface.

Arquivos principais:

- `y/index.html` (layout da pagina)
- `y/scripts/index.js` (logica da home)
- `y/scripts/firebase-client.js` (auth + conexao com Firebase)
- `y/assets/theme.css` (tema global)

## Estrutura da pagina

- Hero: introducao do clube com CTA para noticias.
- Proximos eventos: lista dinamica com botao "Novo evento" (role admin/diretor).
- Familia Amigos da Bola: card com contagem de socios e acesso a galeria.
- Alerta de pendencias: lista de socios com mensalidade pendente do mes.
- Aniversariantes do dia: cards com membros que aniversariam.
- Noticias do clube: feed com ate 6 noticias e modal de leitura.
- Blog Amigos da Bola: feed com ate 6 posts e modal de leitura.
- Dialogos: login, recuperar senha, cadastro/edicao de evento, leitura de noticia e blog.

## Fontes de dados (Firestore)

- `news`: noticias publicas (ordem por `publishedAt`, limite 6).
- `blogPosts`: posts do blog (ordem por `publishedAt`, limite 6).
- `events`: agenda do clube (ordem por `updatedAt`).
- `members`: socios cadastrados, usado para contagem e aniversariantes.
- `payments`: mensalidades para detectar pendencias.

## Permissoes e roles

- Pagina publica, nao exige login.
- `admin` e `imprensa`: podem publicar e editar noticias e blog.
- `admin` e `diretor`: podem criar eventos pela home.
- Conteudos sensiveis (pendencias/alguns dados de socios) podem depender de login e regras do Firestore.

## Comportamentos importantes

- Autenticacao: a area restrita fica disponivel via botao "Area Restrita".
- Permissoes: botoes de publicar noticia/blog e "Novo evento" aparecem apenas para usuarios autorizados.
- Eventos: admins/diretores podem criar eventos pela home.
- Aniversariantes: a secao so aparece quando ha aniversariantes no dia.
- Pendencias: card exibido quando ha pagamentos pendentes no mes atual.
- Conteudo: noticias e blog sao carregados em tempo real via snapshots.

## IDs de referencia (UI)

- `#new-news-btn`, `#new-blog-btn`, `#add-event-btn` (acoes de admin/diretor).
- `#events-list`, `#news-list`, `#blog-list` (listas dinamicas).
- `#socios-count` (contagem de socios).
- `#pending-alert` (alerta de pendencias).
- `#birthday-spotlight`, `#birthday-list` (aniversariantes).

## Observacoes

- A home utiliza Tailwind via CDN (sem build).
- A pagina e estatica, com dados carregados pelo Firebase.
- Logs de erro sao exibidos no console quando o Firestore falha.
