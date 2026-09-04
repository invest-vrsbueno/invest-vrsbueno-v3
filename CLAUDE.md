@AGENTS.md
@constitution.md
@task_plan.md

## Comandos
- Dev: `npm run dev`
- Build: `npm run build`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`

## O que nunca fazer
- Não reintroduzir `middleware.ts` (o arquivo é `src/proxy.ts` nesta versão do Next.js).
- Não fazer deploy (`vercel --prod`) ou disparar e-mails reais sem confirmação explícita do usuário.
- Não abrir escrita da tabela `investimentos` para o papel `anon` no Supabase.
