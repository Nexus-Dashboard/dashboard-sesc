# Dashboard Sesc · Reputação & Imagem 2026

Painel das pesquisas de Reputação & Imagem do Sesc: População geral (5.544 casos) e Stakeholders (Legislativo + Mídia, 539 casos), com login individual por UF.

## Como funciona

- **Login:** `/api/clients/auth/*` da API Nexus, com JWT de 8h guardado em `sessionStorage`. No primeiro acesso o usuário é obrigado a trocar a senha provisória.
- **Dados:** vêm só de `GET /api/clients/surveys/:id/data`, uma rota protegida.
  - A API lê a aba `Dados (códigos)` da planilha e aplica a máscara de escopo no servidor.
  - O usuário estadual recebe apenas o marcador Brasil / sua região / seu estado. Nenhum ID de planilha chega ao navegador.
  - O contrato está em `Nexus/api/docs/CLIENT_SURVEYS.md`.
- **Rótulos:** vêm dos CODEBOOKs. Para regenerar o dicionário, rode `npm run dictionary`, que gera `src/surveys/dictionary/*.json`. As exceções conferidas estão em `src/surveys/dictionary/index.ts`.
- **Cálculos:** em `src/data/engine.ts`.
  - Todo resultado é ponderado (`weights.rf` / `Peso`).
  - A base exclui brancos (pergunta não feita) e inclui NS/NR.
  - Indicador e dimensões são a média ponderada das colunas prontas.
  - Os resultados foram validados contra os relatórios finais.
- **Perguntas e seções:** a configuração declarativa está em `src/surveys/populacao.ts` e `src/surveys/stakeholders.ts`.
- **Admin (`nexus_admin`):** vê todos os estados e gerencia os acessos em `/admin/usuarios`.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # ajuste VITE_API_URL
npm run dev                  # http://localhost:5173
```

A rota `/api/clients/surveys` já está publicada em `https://api-nexus-dashboard.vercel.app`, que é o padrão. Para testar mudanças na API antes do deploy, rode-a localmente (`cd ../../api && npm run dev`) e aponte `VITE_API_URL` para ela.

Em modo dev, a tela de troca de senha tem o botão "Pular (apenas dev)", para navegar sem gravar senha nas contas reais. Ele não existe no build de produção.

## Publicar (Vercel)

- Build: `npm run build`. Saída: `dist/`.
- Variável: `VITE_API_URL=https://api-nexus-dashboard.vercel.app`.
- `vercel.json` já traz o rewrite de SPA e os headers de segurança. A CSP libera `connect-src` só para a API.
