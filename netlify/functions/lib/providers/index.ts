import type { AIProvider } from "./types.js";
import { GeminiProvider } from "./gemini.js";

// Registro de provedores disponíveis. Para adicionar um novo motor de IA
// (OpenAI, Claude, etc.), implemente a interface AIProvider em um novo
// arquivo neste diretório e adicione uma linha aqui. Nenhuma outra parte
// do sistema precisa mudar.
const registry: Record<string, AIProvider> = {
  gemini: new GeminiProvider(),
};

export const DEFAULT_PROVIDER_ID = "gemini";

export function getProvider(id: string = DEFAULT_PROVIDER_ID): AIProvider {
  const provider = registry[id];
  if (!provider) {
    throw new Error(`PROVIDER_UNKNOWN_${id}`);
  }
  return provider;
}

export function listProviders(): AIProvider[] {
  return Object.values(registry);
}
