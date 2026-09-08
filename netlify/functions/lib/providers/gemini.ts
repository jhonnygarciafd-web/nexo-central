import type { AIProvider, ChatMessage, ProviderReply } from "./types.js";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Provedor Gemini (Google). Implementação server-side apenas — a chave
 * de API NUNCA trafega para o navegador do usuário.
 */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  readonly label = "Gemini";

  private getApiKey(): string | undefined {
    // Regra do NEXO: segredos somente via variável de ambiente server-side.
    return Netlify.env.get("GEMINI_API_KEY");
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return typeof key === "string" && key.trim().length > 0;
  }

  async send(messages: ChatMessage[], systemPrompt: string): Promise<ProviderReply> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("PROVIDER_NOT_CONFIGURED");
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("PROVIDER_TIMEOUT");
      }
      throw new Error("PROVIDER_NETWORK_ERROR");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // Nunca repassar corpo/erro cru da API upstream para o usuário final.
      throw new Error(`PROVIDER_UPSTREAM_ERROR_${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("PROVIDER_EMPTY_RESPONSE");
    }

    return { text };
  }
}
