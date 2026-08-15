import { render } from "@react-email/render";
import { RecoveryEmail } from "./email-templates/recovery";
import { enviarEmail } from "./resend.server";

function urlBase(): string {
  return process.env["SITE_URL"] ?? "https://appobraviva.travuscapital.com.br";
}

/**
 * Gera o link de redefinição de senha e envia pelo Resend com o template da marca.
 * Sempre resolve sem revelar se o e-mail existe (evita enumeração de contas).
 */
export async function enviarRecuperacaoSenha(email: string, origem?: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const base = origem ?? urlBase();

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${base}/redefinir-senha` },
  });

  if (error || !data?.properties?.action_link) {
    console.error(`[recuperacao] falha ao gerar link: ${error?.message ?? "sem link"}`);
    return;
  }

  const html = await render(
    RecoveryEmail({ siteName: "ObraViva", confirmationUrl: data.properties.action_link }),
  );

  await enviarEmail({
    to: email,
    subject: "Redefinir sua senha — ObraViva",
    html,
  });
}
