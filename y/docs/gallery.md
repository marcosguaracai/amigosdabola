# Galeria (gallery.html)

Documentacao da galeria publica de socios.

## Visao geral

Exibe cards com foto e dados basicos dos membros. A pagina permite login para acessar dados completos conforme o role do usuario.

Arquivos principais:

- `y/gallery.html`
- `y/scripts/gallery.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Cabecalho com menu e acesso ao login.
- Grade de cards de socios.
- Modal de login para usuarios nao autenticados.

## Fontes de dados (Firestore)

- `members`: dados dos socios exibidos na galeria.
- `settings/publicStats`: contagem publica de socios ativos.

## Permissoes e roles

- Pagina publica com login opcional.
- Acesso aos dados reais liberado para roles `admin`, `diretor`, `financeiro`, `tesoureiro`, `imprensa`, `socio`, `visitante`, `crianca`.

## Comportamentos importantes

- Login via modal com Auth Email/Senha.
- Exibicao de cards conforme roles permitidos.
- Contagem total exibida com base nas estatisticas publicas.

## IDs de referencia (UI)

- `#gallery-grid`, `#gallery-count`, `#gallery-feedback`.
- `#login-dialog`, `#login-form`.

## Observacoes

- A pagina e publica, mas os dados reais exigem autenticacao.
