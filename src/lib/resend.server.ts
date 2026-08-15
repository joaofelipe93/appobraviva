// Envio de e-mail transacional via API do Resend (chave própria do projeto).
const RESEND_URL = "https://api.resend.com/emails";

export interface EnvioEmail {
  to: string;
  subject: string;
  html: string;
}

export function remetente(): string {
  return process.env["RESEND_FROM"] ?? "ObraViva <onboarding@resend.dev>";
}

export async function enviarEmail({ to, subject, html }: EnvioEmail): Promise<boolean> {
  const chave = process.env["RESEND_API_KEY"];
  if (!chave) {
    console.error("[resend] RESEND_API_KEY não configurada");
    return false;
  }

  const resposta = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({ from: remetente(), to: [to], subject, html }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    console.error(`[resend] falha [${resposta.status}]: ${corpo}`);
    return false;
  }
  return true;
}
