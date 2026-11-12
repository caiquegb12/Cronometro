# Página do centenário do Mercado Central

Página dos 100 anos, independente do cronômetro original para TV que permanece na raiz do repositório.

## Endereços

- Cronômetro original: https://caiquegb12.github.io/Cronometro/
- Página do centenário: https://caiquegb12.github.io/Cronometro/centenario/

## Desenvolvimento e publicação

A branch `centenario` contém o trabalho da página nova. O GitHub Pages está configurado para publicar `master` a partir da raiz. Para atualizar a página nova, altere somente os arquivos em `centenario/` nessa branch e integre as alterações à `master`, mantendo os arquivos antigos da raiz.

Uma branch isolada não ganha um segundo endereço no GitHub Pages automaticamente: o caminho `/centenario/` existe porque essa pasta também faz parte da branch publicada.

## Atualizar conteúdo

Edite `conteudo.js`: as listas `agenda`, `novidades` e `patrocinadores` começam vazias. Cadastre somente informações confirmadas.

- Agenda: `titulo`, `data` com horário e fuso (`2029-09-07T10:00:00-03:00`), `local`, `descricao`, `url`.
- Novidades: `titulo`, `resumo`, `url`.
- Patrocinadores: `titulo`, `categoria`, `logo` (caminho local ou URL HTTPS), `url`.

Os avisos de "em breve" desaparecem quando há conteúdo válido. Patrocinadores institucionais no rodapé reproduzem o site oficial; não significam confirmação como patrocinadores do centenário.

A contagem principal e a mini contagem usam 7 de setembro de 2029, às 00h no horário de Belo Horizonte. A mini contagem aparece quando o banner principal sai da tela. A animação da marca toca sem som e em loop.

## Abrir localmente

Na raiz do repositório: `python -m http.server 8000`. Abra http://localhost:8000/centenario/.

## Arquivos visuais

Identidade e vídeo do centenário fornecidos pelo responsável pelo projeto. Fotografias, símbolos e marcas institucionais obtidos do site oficial do Mercado Central para a proposta. A fonte Nunito está distribuída sob a licença em `assets/OFL-Nunito.txt`.

A proposta visual e os conteúdos estão sujeitos à aprovação do marketing. A publicação não altera o site mercadocentral.com.br.

## Instagram

A seção incorpora uma seleção de três publicações públicas de `@mercadocentralbh`, identificadas no site oficial. Não é um feed automático: novos posts podem ser escolhidos pelo marketing e seus links atualizados em `index.html`. Cada iframe usa a URL pública do post terminada em `/embed/`, com carregamento adiado e um link externo alternativo. A incorporação depende da disponibilidade do Instagram e das preferências do navegador do visitante. Na integração ao WordPress, pode ser substituída pelo plugin de feed já usado no site oficial.
