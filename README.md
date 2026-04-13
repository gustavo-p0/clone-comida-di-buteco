# Comida di Buteco PWA

Aplicativo PWA em Next.js para explorar bares do Comida di Buteco BH com:

- lista infinita;
- mapa com `react-map-gl`;
- avaliações locais (`localStorage`);
- tela de detalhes do bar;
- criação de roteiro compartilhável (somente leitura) via link.

## Dados

A aplicação lê direto de `output/bares_bh_detalhado_geo.json`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Variáveis de ambiente

Para habilitar compartilhamento de roteiro entre dispositivos, configure:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Sem essas variáveis, a API de compartilhamento responde `503`.

Para gerar build estático (sem API/roteiros), use:

```bash
NEXT_OUTPUT_EXPORT=true npm run build
```
