# Rei das Bombas Oficial

Loja virtual de bombas de combustível e equipamentos — https://reidasbombasoficial.com.br

Stack: Vite, React, TypeScript, Tailwind CSS, shadcn/ui e Supabase.

## Desenvolvimento

```sh
npm install
npm run dev
```

As variáveis `VITE_SUPABASE_*` ficam no `.env` (a chave publishable é pública).

## Build e deploy (Cloudflare Pages)

- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Edge functions: pasta `supabase/functions`, publicadas no projeto Supabase `kpkxnqlrgkmgbbmishaw`.
