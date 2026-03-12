# Cadastro (register.html)

Documentacao da pagina de criacao de conta.

## Visao geral

Permite que novos usuarios criem conta e gerem um perfil inicial de membro com role visitante e status pendente.

Arquivos principais:

- `y/register.html`
- `y/scripts/register.js`
- `y/scripts/firebase-client.js`

## Estrutura da pagina

- Formulario de dados pessoais e endereco.
- Campos de senha com validacao e confirmacao.
- Feedback de erro/sucesso no cadastro.

## Fontes de dados (Firestore)

- `members`: cria o perfil inicial do membro.
- `membersByEmail`: indice auxiliar por email.

## Permissoes e roles

- Pagina publica, nao exige login.
- Role inicial: `visitante`.
- Status inicial: `pendente`.

## Comportamentos importantes

- Cria usuario no Firebase Auth.
- Preenche automaticamente metadados de criacao/atualizacao.
- Mascara de telefone e validacao de senha.

## IDs de referencia (UI)

- `#register-form`, `#register-feedback`.
- `#register-password`, `#register-password-confirm`.

## Observacoes

- Cadastro inclui dados pessoais, endereco e datas de nascimento/entrada.
