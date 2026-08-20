import { render } from "@react-email/render";
import { NovaAtualizacaoEmail } from "./email-templates/nova-atualizacao";
import { enviarEmail } from "./resend.server";
import { normalizarUnidade } from "./obras.schemas";
import type { ResumoIA, ResumosUnidades } from "./obras.schemas";

function urlBase(): string {
  return process.env["SITE_URL"] ?? "https://appobraviva.travuscapital.com.br";
}

function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

/**
 * Avisa por e-mail os clientes vinculados à obra sobre uma nova atualização.
 * Cada cliente recebe apenas o destaque da sua casa/unidade.
 */
export async function notificarClientesDaAtualizacao(atualizacaoId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: atualizacao } = await supabaseAdmin
    .from("atualizacoes")
    .select("id, obra_id, data_visita, resumo_ia, resumos_unidades, obras(nome)")
    .eq("id", atualizacaoId)
    .maybeSingle();
  if (!atualizacao) return 0;

  const { data: vinculos } = await supabaseAdmin
    .from("obra_clientes")
    .select("cliente_id, unidade")
    .eq("obra_id", atualizacao.obra_id);
  if (!vinculos || vinculos.length === 0) return 0;

  // Um e-mail por investidor, com todas as casas dele nesta obra.
  const casasPorCliente = new Map<string, string[]>();
  for (const vinculo of vinculos) {
    const unidade = normalizarUnidade(vinculo.unidade);
    const atual = casasPorCliente.get(vinculo.cliente_id) ?? [];
    if (unidade && !atual.includes(unidade)) atual.push(unidade);
    casasPorCliente.set(vinculo.cliente_id, atual);
  }

  const { data: perfis } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .in("id", [...casasPorCliente.keys()]);
  const emails = new Map((perfis ?? []).map((p) => [p.id, p.email]));

  const resumoGeral = (atualizacao.resumo_ia as ResumoIA | null) ?? null;
  const resumosUnidades = (atualizacao.resumos_unidades as ResumosUnidades | null) ?? {};
  const obraNome = atualizacao.obras?.nome ?? "Obra";
  const url = `${urlBase()}/atualizacoes/${atualizacaoId}`;

  let enviados = 0;
  for (const [clienteId, unidades] of casasPorCliente) {
    const email = emails.get(clienteId);
    if (!email) continue;

    const casas = unidades
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
      .map((unidade) => ({
        unidade,
        destaque: resumoDaUnidade(resumosUnidades, unidade)?.titulo ?? undefined,
      }));

    const uma = casas.length === 1 ? casas[0]! : null;
    const html = await render(
      NovaAtualizacaoEmail({
        obraNome,
        dataVisita: dataBR(atualizacao.data_visita),
        unidade: uma?.unidade,
        destaque: uma?.destaque ?? resumoGeral?.titulo ?? undefined,
        casas: casas.length > 1 ? casas : undefined,
        url,
      }),
    );

    const sufixo = uma ? ` (${uma.unidade})` : casas.length > 1 ? ` (${casas.length} casas)` : "";
    const ok = await enviarEmail({
      to: email,
      subject: `Nova atualização — ${obraNome}${sufixo}`,
      html,
    });
    if (ok) enviados += 1;
  }

  return enviados;
}

