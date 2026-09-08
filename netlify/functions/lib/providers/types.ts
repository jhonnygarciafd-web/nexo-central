// NEXO — Camada de abstração de provedores de IA
//
// Qualquer motor de IA (Gemini, OpenAI, Claude, etc.) implementa esta
// interface. O NEXO Core nunca fala diretamente com uma API específica —
// ele sempre passa por um AIProvider. Isso permite trocar ou adicionar
// motores sem reescrever o restante do sistema.

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderReply {
  text: string;
}

export interface AIProvider {
  /** Identificador curto do provedor, ex: "gemini", "openai", "claude" */
  readonly id: string;

  /** Nome amigável exibido na interface, ex: "Gemini" */
  readonly label: string;

  /**
   * Indica se o provedor está pronto para uso (ex: variável de ambiente
   * com a chave de API configurada). O NEXO nunca deve quebrar caso um
   * provedor não esteja configurado — apenas informar o status.
   */
  isConfigured(): boolean;

  /**
   * Envia o histórico da conversa ao motor de IA e retorna a resposta.
   * Deve lançar um erro com mensagem segura (sem stack trace, sem
   * segredos) caso algo falhe.
   */
  send(messages: ChatMessage[], systemPrompt: string): Promise<ProviderReply>;
}
