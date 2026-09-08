import type { Context, Config } from "@netlify/functions";
import { getProvider } from "./lib/providers/index.js";
import type { ChatMessage } from "./lib/providers/types.js";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 6000;

const SYSTEM_PROMPT = `Você é o NEXO, a inteligência central pessoal de Jhonny.
Sua identidade é própria — você não é um chatbot genérico.
Personalidade: inteligente, objetivo, estratégico, natural, proativo, organizado e direto.
Não repita saudações genéricas como "Como posso ajudá-lo?" a cada resposta.
Mantenha uma conversa natural, direta e útil, como uma central de inteligência
operacional trabalhando ao lado do usuário.`;

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return false;
  }
  return value.every(
    (m) =>
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length > 0 &&
      m.content.length <= MAX_MESSAGE_LENGTH,
  );
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const provider = getProvider("gemini");

  if (!provider.isConfigured()) {
    return jsonResponse(200, {
      status: "awaiting_configuration",
      message: "Motor de IA aguardando configuração.",
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "INVALID_JSON" });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!isValidMessages(messages)) {
    return jsonResponse(400, { error: "INVALID_MESSAGES" });
  }

  try {
    const reply = await provider.send(messages, SYSTEM_PROMPT);
    return jsonResponse(200, { status: "ok", reply: reply.text });
  } catch (err) {
    // Nunca retornar stack trace ou detalhes internos ao cliente.
    const code = err instanceof Error ? err.message : "UNKNOWN_ERROR";

    if (code === "PROVIDER_NOT_CONFIGURED") {
      return jsonResponse(200, {
        status: "awaiting_configuration",
        message: "Motor de IA aguardando configuração.",
      });
    }
    if (code === "PROVIDER_TIMEOUT") {
      return jsonResponse(504, { error: "O motor de IA demorou demais para responder." });
    }

    console.error(`nexo-chat error: ${code}`);
    return jsonResponse(502, { error: "Não foi possível obter resposta do motor de IA." });
  }
};

export const config: Config = {
  path: "/api/nexo-chat",
};
