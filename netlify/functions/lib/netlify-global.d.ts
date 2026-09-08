// Declaração do objeto global `Netlify`, disponível em runtime nas
// Netlify Functions, usado exclusivamente para leitura de variáveis de
// ambiente (Netlify.env.get). Ver regra de segurança: nenhuma chave de
// API deve ser lida de outra forma.
declare const Netlify: {
  env: {
    get(key: string): string | undefined;
  };
};
