import type { Context, Config } from "@netlify/functions";
import { getProvider } from "./lib/providers/index.js";

// Endpoint leve para o frontend saber, sem expor segredos, se o motor
// de IA padrão está configurado.
export default async (_req: Request, _context: Context) => {
  const provider = getProvider("gemini");

  return new Response(
    JSON.stringify({
      version: "1.1",
      engine: provider.label,
      configured: provider.isConfigured(),
      memory: "local",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

export const config: Config = {
  path: "/api/nexo-status",
};
