# Rota Reparo

Site de uma página para assistência técnica de celular delivery (oficina móvel e leva e traz), com pedidos de orçamento enviados ao WhatsApp (11) 95139-9929.

## Estrutura

- `index.html`: conteúdo da página
- `assets/css/styles.css`: estilos e fontes
- `assets/js/boot.js`: pula a abertura em visitas repetidas
- `assets/js/app.js`: interações, orçamento e WhatsApp
- `assets/js/phone3d.js`: carrega o celular 3D depois da abertura, sem disputar com a rolagem
- `assets/js/phone3d.bundle.js`: celular 3D (WebGL) com three.js 0.160.0 já reduzido (licença MIT em `assets/js/three.LICENSE.txt`)
- `src/phone3d.js`: código-fonte do celular 3D
- `assets/img/cracks.webp`: textura das trincas da tela
- `assets/fonts/`: Bricolage Grotesque e Geist (SIL Open Font License)
- `assets/img/phone-poster.webp`: imagem exibida enquanto o 3D carrega
- `assets/img/og-image.jpg`: prévia do link no WhatsApp e redes sociais
- `robots.txt`, `sitemap.xml`, `404.html`: busca no Google e página de erro

## Segurança

- Nenhum script, fonte ou estilo vem de servidores de terceiros: tudo é servido pelo próprio site.
- A política de segurança de conteúdo (CSP) só permite scripts do próprio domínio e bloqueia plugins, envio de formulários e troca da URL base.
- Links externos usam `noopener noreferrer`.
- O formulário não envia dados a nenhum servidor: ele só monta a mensagem e abre o WhatsApp.

## Alterar o celular 3D

Edite `src/phone3d.js` e gere o arquivo publicado com:

```
npm install
npm run build
```

## Publicação

Hospedado no GitHub Pages a partir da branch `main`. Para trocar o número, edite a constante `WA` em `assets/js/app.js` e os links `wa.me/5511951399929` em `index.html`.
