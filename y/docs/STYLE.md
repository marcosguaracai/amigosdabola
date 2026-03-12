# Guia de estilo da documentacao

Padrao simples para manter consistencia nas paginas documentadas.

## Estrutura recomendada

1. Titulo com nome da pagina e arquivo (`Pagina (arquivo.html)`).
2. Visao geral.
3. Estrutura da pagina.
4. Fontes de dados (Firestore).
5. Permissoes e roles.
6. Comportamentos importantes.
7. IDs de referencia (UI).
8. Observacoes.

## Linguagem e tom

- Texto direto e objetivo, em portugues.
- Evite repetir informacoes entre seções.
- Prefira frases curtas e verbos no presente.

## Padrao para roles e colecoes

- Roles sempre em backticks: `admin`, `diretor`, etc.
- Colecoes e documentos do Firestore sempre em backticks: `members`, `settings/finance`.
- Botões e ids de UI em backticks.

## Boas praticas

- Liste apenas o necessario em "IDs de referencia".
- Cite dependencias externas (ex.: Chart.js, XLSX).
- Se a pagina reutiliza scripts, cite o arquivo real do script.
