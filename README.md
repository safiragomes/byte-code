# Byte Code · A Fase Secreta de Troia

Trilha interativa de POO em Python para o projeto final de Introdução à Programação (CIn/UFPE).
Site estático: HTML + JS puro. O Python roda no navegador do aluno (Pyodide); o histórico fica no `localStorage`.

## Publicar no GitHub Pages
1. Crie um repositório e envie todo o conteúdo desta pasta (`index.html` na raiz).
2. Settings → Pages → Deploy from a branch → `main` / root.
3. Pronto: `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Reusar em outros períodos
O site não mostra período em lugar nenhum, então pode ser publicado igual a cada semestre.
- `js/conteudo.js`: história (`BYTE_HISTORIA`), lições, projeto e recursos.
- `storagePrefix` só precisa mudar se você quiser zerar o progresso salvo em todos os navegadores (por exemplo, nos computadores compartilhados do Grad 5).
- `js/desafios.js`: desafios, testes, dicas e solução de referência.
- Imagens opcionais: `BYTE_CONFIG.imagens` (banner, Troia, pasta de adesivos `1.png` a `8.png`).

## Motor de feedback
`py/tutor.py` é embutido em `js/tutor-embed.js`. Depois de editar `tutor.py` rode `python3 dev/build.py`.
Testes: `python3 dev/test_tutor.py` e `node` + `python3 dev/validar_desafios.py`.

## Observações
- Testes e soluções ficam no JS do cliente: um aluno curioso consegue ver. Serve para estudo, não para avaliação.
- O Python (Pyodide 0.29.5, ~12 MB) já vem na pasta `pyodide/`, então funciona sem CDN (se a pasta faltar, o site tenta o jsdelivr). A biblioteca padrão está como `python_stdlib.wasm` (é o `python_stdlib.zip` renomeado) porque o artefato do Claude não serve `.zip`.
- Progresso vale só no navegador usado; o botão "Dados" exporta/importa em JSON.
