# Cronômetro - Centenário do Mercado Central

Contagem regressiva para o centenário do Mercado Central (07/09/2029), alternando com telas de propaganda em vídeo.

Site no ar: https://caiquegb12.github.io/Cronometro/

## Estrutura

- `index.html`, `styles.css`, `script.js`, `countdown.js`: o site (estático).
- `Arquivos/`: logo.
- `videos/`: vídeos das propagandas (`propaganda-1.mp4` a `propaganda-3.mp4`).
- `tests/`: testes que rodam no navegador (`/tests/`).
- `server.py`: servidor local que serve o site e grava os logs dos testes.
- `run_tests.py`: roda os testes automaticamente.

## Rodar localmente

```
python server.py
```

Site em http://localhost:8000/ e testes em http://localhost:8000/tests/.

## Publicação

O site é publicado no GitHub Pages a partir da branch `master`. Cada `git push` atualiza o site em cerca de 1 minuto.
