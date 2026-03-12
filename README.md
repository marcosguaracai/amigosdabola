## Amigos da Bola

Sistema web em JavaScript integrado ao Firebase para o clube Amigos da Bola. O projeto atende até 250 pessoas com gestão de membros, notícias, blog e controle financeiro das mensalidades, utilizando Tailwind CDN para a interface.

### Principais páginas

- `index.html`: página pública com notícias, blog e acesso ao login.
- `dashboard.html`: visão geral após login (resumo financeiro, timeline e acesso rápido).
- `members.html`: cadastro completo de administradores, diretores, sócios, visitantes e crianças, com histórico e controle de mensalidades.
- `finance.html`: painel financeiro com gráficos, filtros, pendências e exportação de relatórios CSV.
- `gallery.html`: vitrine dinâmica dos membros com fotos e dados básicos (requer autenticação para carregar os dados reais).
- Recursos estáticos de marca em `y/assets/`, incluindo `favicon.svg` com a paleta oficial do clube.

Todos os arquivos JavaScript ficam em `y/scripts/` e são módulos ES6 carregados diretamente no navegador.

---

## Documentacao

- Indice geral: `y/docs/README.md`
- Guia de estilo: `y/docs/STYLE.md`
- Home (pagina publica): `y/docs/home.md`
- Cadastro de socio: `y/docs/register.md`
- Galeria: `y/docs/gallery.md`
- Noticias (admin): `y/docs/noticias.md`
- Painel (area restrita): `y/docs/dashboard.md`
- Cadastros: `y/docs/members.md`
- Financeiro: `y/docs/finance.md`
- Bar & Belisco: `y/docs/bar.md`
- Jogos: `y/docs/games.md`

---

## Configuração do Firebase

1. **Criar projeto no Firebase Console**
   - Ative **Authentication (Email/Senha)**.
   - Ative **Cloud Firestore** (modo produção) e **Cloud Storage**.

2. **Configurar o app web**
   - Registre um app web e copie as credenciais.
   - Atualize `y/scripts/firebase-config.js` com esses valores.

3. **Regras sugeridas**
   Ajuste conforme a política interna. Exemplo inicial:

   ```javascript
   // Firestore rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /members/{memberId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       match /members/{memberId}/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /membersByEmail/{email} {
         allow read, write: if request.auth != null;
       }
       match /news/{document=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /blogPosts/{document=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /payments/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /settings/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   ```javascript
   // Storage rules
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /members/{uid}/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. **Criar o primeiro administrador**
   - Cadastre manualmente um usuário via Authentication (Email/Senha).
   - Faça login na aplicação com esse usuário. Se for o primeiro membro, o sistema cria automaticamente o documento em `members/{uid}` já com `role: "admin"` e vincula o índice em `membersByEmail`.

5. **Tailwind e Chart.js**
   - Ambos são carregados via CDN. Não há etapa adicional.

## Fluxos de uso

- **Administradores**
  - Criam/gerenciam qualquer perfil.
  - Ajustam o valor padrão da mensalidade.
  - Publicam notícias, blog e exportam relatórios.

- **Diretores**
  - Gerenciam sócios, visitantes e crianças.
  - Registram e baixam mensalidades.

- **Sócios**
  - Visualizam dados e atualizam apenas o próprio perfil.
  - Registram mensalidades apenas com autorização do administrador (padrão: somente leitura).

- **Visitantes**
  - Apenas leitura após login (sem criação/edição).

- **Crianças**
  - Registros sem autenticação própria (controlados pelos responsáveis).

---

## Modelo de dados resumido

| Coleção                   | Finalidade                                                                                      |
|---------------------------|------------------------------------------------------------------------------------------------|
| `members`                 | Dados de cada membro (perfil, contatos, foto, mensalidade personalizada).                      |
| `members/{id}/history`    | Histórico de status (baixa por inadimplência, expulsão, etc.).                                 |
| `members/{id}/payments`   | Controle de mensalidades por competência.                                                      |
| `payments`                | Espelho dos pagamentos para relatórios agregados.                                              |
| `news` / `blogPosts`      | Conteúdo público de notícias e blog.                                                           |
| `events`                  | Agenda e comunicados oficiais exibidos na página pública.                                      |
| `settings/finance`        | Valor padrão da mensalidade (alterável pelos administradores).                                 |
| `membersByEmail`          | Índice auxiliar para resolver perfis via email.                                                |

### Campos sugeridos para `events`

- `name`, `when`, `details`, `arena` (texto)
- `eventDate` (ISO `YYYY-MM-DD`) para ordenar cronologicamente
- `attendanceSocios`, `attendanceVisitantes`, `attendanceCriancas` (números)
- `topScorer`, `bestGoalkeeper` (texto com destaques do jogo)
- `updatedAt`, `updatedBy`, `updatedByName` (metadata automática)

---

## Deploy no Firebase Hosting

1. Instale a CLI (`npm install -g firebase-tools`).
2. Dentro da pasta `amigosdabola`, execute:
   ```bash
   firebase login
   firebase init hosting
   ```
   - Escolha o projeto existente.
   - Defina `y` como diretório público.
   - Habilite single-page app como **não** (pois há múltiplas páginas).
3. Publique:
   ```bash
   firebase deploy --only hosting
   ```

---

## Próximos passos sugeridos

- Configurar regras de segurança específicas por perfil (admin/diretor/sócio) usando custom claims ou Cloud Functions.
- Registrar logs de auditoria em uma coleção dedicada.
- Criar templates de email/WhatsApp para cobrança automática das mensalidades pendentes.
- Integrar com Firebase Cloud Messaging para notificações em tempo real.
