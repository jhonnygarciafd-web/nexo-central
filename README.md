# NEXO — Sua inteligência central

NEXO é o assistente pessoal de IA central de Jhonny. Um "Jarvis" pessoal com
identidade própria, pensado como uma central operacional de inteligência
artificial — e não como mais um chatbot genérico.

Versão atual: **1.1** (fundação do sistema).

## Arquitetura

O NEXO é dividido em três camadas, para nunca ficar preso a um único motor
de IA ou a um único serviço externo:

```
Navegador (NEXO Core)
      │  fetch("/api/nexo-chat")
      ▼
Netlify Function (netlify/functions/nexo-chat.mts)
      │
      ▼
AI Provider layer (netlify/functions/lib/providers)
      │
      ▼
Gemini Provider  ──▶  Google Gemini API
```

- **Frontend** (`public/`): HTML/CSS/JS puro, sem framework e sem build
  step. Interface escura, futurista, com o NEXO Core como experiência
  principal. Funciona como PWA (pode ser instalado na tela de início do
  iPhone).
- **Netlify Functions** (`netlify/functions/`): backend serverless em
  TypeScript. É o único lugar onde segredos (como a chave da API do
  Gemini) existem — nunca no frontend.
- **AI Provider layer** (`netlify/functions/lib/providers/`): interface
  `AIProvider` (`types.ts`) que qualquer motor de IA implementa. Hoje só
  existe o `GeminiProvider`, mas a arquitetura já está pronta para
  `OpenAIProvider`, `ClaudeProvider`, etc., sem reescrever o NEXO Core.

### Memória

Nesta versão 1.1, o histórico de conversa é salvo no `localStorage` do
navegador (`public/js/app.js`: `saveConversation`, `loadConversation`,
`clearConversation`). A área "Memória" da interface já está preparada para,
no futuro, trocar esse armazenamento por um banco de dados persistente
(Netlify Blobs, Postgres, etc.) sem alterar a forma como o NEXO Core acessa
o contexto.

## Estrutura de pastas

```
nexo-central/
├── public/                     # site estático (frontend)
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js
│   ├── sw.js                   # service worker (PWA)
│   ├── manifest.webmanifest
│   └── icons/
├── netlify/
│   └── functions/
│       ├── nexo-chat.mts       # endpoint principal do chat
│       ├── nexo-status.mts     # endpoint de status do motor de IA
│       └── lib/
│           ├── providers/
│           │   ├── types.ts    # interface AIProvider
│           │   ├── gemini.ts   # implementação Gemini
│           │   └── index.ts    # registro/fábrica de provedores
│           └── netlify-global.d.ts
├── netlify.toml
└── package.json
```

## Desenvolvimento local

Pré-requisitos: Node.js 18+ e a [Netlify CLI](https://cli.netlify.com/).

```bash
npm install
npx netlify dev
```

Isso sobe o site estático e as functions juntos, simulando o ambiente de
produção (inclusive `Netlify.env.get`).

## Deploy

O projeto é publicado no site Netlify **nexo-central**
(`https://nexo-central.netlify.app`) via deploy contínuo: qualquer push no
branch principal do repositório GitHub conectado é automaticamente
publicado no mesmo endereço.

Configuração de build no Netlify:

- **Base directory:** `/` (raiz do repositório)
- **Build command:** nenhum necessário (site estático + functions)
- **Publish directory:** `public`
- **Functions directory:** `netlify/functions`

## Variáveis de ambiente e o Netlify AI Gateway

O NEXO **já responde em produção sem nenhuma configuração adicional**. Isso
acontece porque a Netlify injeta automaticamente, em todo projeto com pelo
menos um deploy de produção, as variáveis `GEMINI_API_KEY` e
`GOOGLE_GEMINI_BASE_URL` apontando para o
[AI Gateway](https://docs.netlify.com/build/ai-gateway/overview/) da
própria Netlify — um proxy que fala com o Gemini de verdade e cobra o uso
pelos créditos da conta Netlify (o plano Free já inclui uma cota).

| Variável                | Injetada automaticamente? | Onde configurar (opcional) |
|--------------------------|----------------------------|------------------------------|
| `GEMINI_API_KEY`         | Sim, pela Netlify AI Gateway | Netlify → Site settings → Environment variables (marcar como **Secret**) |
| `GOOGLE_GEMINI_BASE_URL` | Sim, pela Netlify AI Gateway | Normalmente não precisa mexer |

Se `GEMINI_API_KEY` e `GOOGLE_GEMINI_BASE_URL` não existirem por algum
motivo (AI Gateway desativado na conta, por exemplo), o endpoint
`/api/nexo-chat` não quebra — ele responde com:

```json
{ "status": "awaiting_configuration", "message": "Motor de IA aguardando configuração." }
```

### Usando sua própria chave Gemini (em vez do AI Gateway)

Para usar uma chave Gemini própria (obtida em
[aistudio.google.com](https://aistudio.google.com/apikey)) em vez do AI
Gateway, basta definir manualmente `GEMINI_API_KEY` em **Netlify → Site
settings → Environment variables**, marcada como **Secret**. A Netlify
nunca sobrescreve uma variável já definida por você, então a partir desse
momento o NEXO passa a falar diretamente com a API pública do Google.
Nenhuma mudança de código é necessária.

A chave **nunca** deve ser colocada no HTML, no JavaScript do navegador ou
commitada no repositório — ela existe apenas como variável de ambiente
server-side, lida em `netlify/functions/lib/providers/gemini.ts` via
`Netlify.env.get("GEMINI_API_KEY")`.

## Como adicionar um novo provedor de IA

1. Crie um novo arquivo em `netlify/functions/lib/providers/`, por exemplo
   `openai.ts`, implementando a interface `AIProvider` definida em
   `types.ts` (`id`, `label`, `isConfigured()`, `send()`).
2. Registre o novo provedor em `netlify/functions/lib/providers/index.ts`,
   adicionando uma entrada no objeto `registry`.
3. Adicione a variável de ambiente necessária (ex: `OPENAI_API_KEY`) nas
   configurações do Netlify, marcada como secreta.
4. Nenhuma outra parte do sistema (frontend, `nexo-chat.mts`) precisa
   mudar — a troca de motor acontece inteiramente na camada de provider.

## Segurança

- Segredos somente em variáveis de ambiente server-side (nunca no
  localStorage, nunca no frontend, nunca no repositório).
- Timeout de 20s nas chamadas ao motor de IA.
- Mensagens limitadas em tamanho e quantidade por requisição.
- Erros do motor de IA nunca retornam stack trace ao usuário final.
- Nenhuma chave de API é registrada em log.

## Roadmap (preparado, não implementado nesta versão)

- Integrações: OpenAI, Claude, Gmail, Google Calendar, Google Drive,
  WhatsApp, CRM, automações e outros agentes/ferramentas.
- Memória persistente em banco de dados.
- Autenticação de usuário.
