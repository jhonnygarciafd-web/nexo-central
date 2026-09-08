import type { Context, Config } from "@netlify/functions";
import { getProvider } from "./lib/providers/index.js";

// Endpoint leve para o frontend saber, sem expor segredos, se o motor
// de IA padrão está configurado.
export default async (_req: Request, _context: Context) => {
  const provider = getProvider("gemini");

  // DIAGNÓSTICO TEMPORÁRIO — não expõe a chave, apenas metadados para
  // depurar por que uma variável está sendo detectada. Remover depois.
  const raw = Netlify.env.get("GEMINI_API_KEY");
  console.log(
    `nexo-status debug: typeof=${typeof raw} length=${raw ? raw.length : 0} prefix=${raw ? JSON.stringify(raw.slice(0, 4)) : "n/a"}`,
  );

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
