import { render } from "@react-email/render";
import { SuporteEmail } from "./email-templates/suporte";
import { enviarEmail } from "./resend.server";
import { rotuloStatus } from "./suporte.schemas";
import type { SuporteStatus } from "./suporte.schemas";

function urlBase(): string {
  return process.env["SITE_URL"] ?? "https://appobraviva.travuscapital.com.br";
}

function corta(texto: string, limite = 240): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
}

async function enviar(
  para: string[],
  assuntoEmail: string,
  props: Parameters<typeof SuporteEmail>[0],
): Promise<void> {
  if (para.length === 0) return;
  const html = await render(SuporteEmail(props));
  for (const destino of para) {
    await enviarEmail({ to: destino, subject: assuntoEmail, html });
  }
}

/** Avisa os administradores que um cliente abriu um chamado. */
export async function notificarAdminsNovoChamado(chamadoId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: chamado } = await supabaseAdmin
    .from("suporte_chamados")
    .select("id, assunto, descricao, unidade, prioridade, cliente_id, obras(nome)")
    .eq("id", chamadoId)
    .maybeSingle();
  if (!chamado) return;

  const [{ data: papeis }, { data: cliente }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
    supabaseAdmin.from("profiles").select("nome, email").eq("id", chamado.cliente_id).maybeSingle(),
  ]);

  const ids = (papeis ?? []).map((p) => p.user_id);
  if (ids.length === 0) return;
  const { data: perfis } = await supabaseAdmin.from("profiles").select("email").in("id", ids);
  const emails = (perfis ?? []).map((p) => p.email).filter((e): e is string => !!e);

  const contexto = [chamado.obras?.nome, chamado.unidade].filter(Boolean).join(" — ");
  await enviar(emails, `Novo chamado de suporte — ${chamado.assunto}`, {
    titulo: "Novo chamado de suporte",
    intro: `${cliente?.nome || "Um cliente"} abriu um chamado${contexto ? ` (${contexto})` : ""}. Prioridade: ${chamado.prioridade}.`,
    assunto: chamado.assunto,
    detalhe: corta(chamado.descricao),
    url: `${urlBase()}/suporte/${chamadoId}`,
    rodape: "Você recebeu este e-mail porque é administrador do ObraViva.",
  });
}

/** Avisa o cliente que o suporte respondeu o chamado. */
export async function notificarClienteResposta(
  chamadoId: string,
  mensagem: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: chamado } = await supabaseAdmin
    .from("suporte_chamados")
    .select("id, assunto, cliente_id")
    .eq("id", chamadoId)
    .maybeSingle();
  if (!chamado) return;

  const { data: cliente } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", chamado.cliente_id)
    .maybeSingle();
  if (!cliente?.email) return;

  await enviar([cliente.email], `Resposta no seu chamado — ${chamado.assunto}`, {
    titulo: "O suporte respondeu seu chamado",
    intro: "A equipe do ObraViva enviou uma nova mensagem no seu chamado de suporte.",
    assunto: chamado.assunto,
    detalhe: corta(mensagem),
    url: `${urlBase()}/suporte/${chamadoId}`,
    rodape: "Você recebeu este e-mail porque abriu este chamado no ObraViva.",
  });
}

/** Avisa o cliente que a situação do chamado mudou. */
export async function notificarClienteStatus(
  chamadoId: string,
  status: SuporteStatus,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: chamado } = await supabaseAdmin
    .from("suporte_chamados")
    .select("id, assunto, cliente_id")
    .eq("id", chamadoId)
    .maybeSingle();
  if (!chamado) return;

  const { data: cliente } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", chamado.cliente_id)
    .maybeSingle();
  if (!cliente?.email) return;

  await enviar([cliente.email], `Chamado ${rotuloStatus[status].toLowerCase()} — ${chamado.assunto}`, {
    titulo: `Chamado ${rotuloStatus[status].toLowerCase()}`,
    intro: `A situação do seu chamado passou para "${rotuloStatus[status]}".`,
    assunto: chamado.assunto,
    url: `${urlBase()}/suporte/${chamadoId}`,
    rodape: "Você recebeu este e-mail porque abriu este chamado no ObraViva.",
  });
}
