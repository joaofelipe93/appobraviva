import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  alterarStatusSchema,
  criarChamadoSchema,
  responderChamadoSchema,
} from "./suporte.schemas";
import type { SuportePrioridade, SuporteStatus } from "./suporte.schemas";
import { normalizarUnidade } from "./obras.schemas";

type Contexto = { supabase: any; userId: string };

async function papelDoUsuario(context: Contexto) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const papeis = ((data ?? []) as { role: string }[]).map((p) => p.role);
  return {
    admin: papeis.includes("admin"),
    papel: (papeis[0] ?? null) as "engenheiro" | "cliente" | "admin" | null,
  };
}

async function exigirAdmin(context: Contexto) {
  const { admin } = await papelDoUsuario(context);
  if (!admin) throw new Error("Apenas o administrador pode atender chamados.");
}

/** Obras e casas do cliente, para preencher o formulário do chamado. */
export const minhasCasas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("obra_clientes")
      .select("obra_id, unidade, obras(nome)")
      .eq("cliente_id", context.userId);

    const obras = new Map<string, { id: string; nome: string; unidades: string[] }>();
    for (const vinculo of (data ?? []) as {
      obra_id: string;
      unidade: string | null;
      obras: { nome: string } | null;
    }[]) {
      const atual = obras.get(vinculo.obra_id) ?? {
        id: vinculo.obra_id,
        nome: vinculo.obras?.nome ?? "Obra",
        unidades: [],
      };
      const unidade = normalizarUnidade(vinculo.unidade);
      if (unidade && !atual.unidades.includes(unidade)) atual.unidades.push(unidade);
      obras.set(vinculo.obra_id, atual);
    }

    return [...obras.values()].map((obra) => ({
      ...obra,
      unidades: obra.unidades.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    }));
  });

/** Cliente vê apenas os próprios chamados; administrador vê todos. */
export const listarChamados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, papel } = await papelDoUsuario(context);

    const { data, error } = await context.supabase
      .from("suporte_chamados")
      .select(
        "id, assunto, unidade, prioridade, status, created_at, ultima_mensagem_em, cliente_id, obras(nome)",
      )
      .order("ultima_mensagem_em", { ascending: false });
    if (error) throw new Error(error.message);

    const linhas = (data ?? []) as {
      id: string;
      assunto: string;
      unidade: string;
      prioridade: SuportePrioridade;
      status: SuporteStatus;
      created_at: string;
      ultima_mensagem_em: string;
      cliente_id: string;
      obras: { nome: string } | null;
    }[];

    let nomes = new Map<string, string>();
    if (admin && linhas.length > 0) {
      const { data: perfis } = await context.supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", [...new Set(linhas.map((l) => l.cliente_id))]);
      nomes = new Map(
        ((perfis ?? []) as { id: string; nome: string; email: string }[]).map((p) => [
          p.id,
          p.nome || p.email,
        ]),
      );
    }

    return {
      admin,
      papel,
      chamados: linhas.map((linha) => ({
        id: linha.id,
        assunto: linha.assunto,
        unidade: linha.unidade,
        obraNome: linha.obras?.nome ?? null,
        prioridade: linha.prioridade,
        status: linha.status,
        created_at: linha.created_at,
        ultima_mensagem_em: linha.ultima_mensagem_em,
        clienteNome: nomes.get(linha.cliente_id) ?? null,
      })),
    };
  });

export const obterChamado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chamadoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin } = await papelDoUsuario(context);

    const { data: chamado, error } = await context.supabase
      .from("suporte_chamados")
      .select(
        "id, assunto, descricao, unidade, prioridade, status, created_at, fechado_em, cliente_id, obras(nome)",
      )
      .eq("id", data.chamadoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!chamado) throw new Error("Chamado não encontrado");

    const [{ data: mensagens }, { data: anexos }, { data: cliente }] = await Promise.all([
      context.supabase
        .from("suporte_mensagens")
        .select("id, mensagem, autor_id, autor_papel, created_at")
        .eq("chamado_id", data.chamadoId)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("suporte_anexos")
        .select("id, path, mensagem_id, created_at")
        .eq("chamado_id", data.chamadoId)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("profiles")
        .select("nome, email")
        .eq("id", chamado.cliente_id)
        .maybeSingle(),
    ]);

    const paths = ((anexos ?? []) as { path: string }[]).map((a) => a.path);
    const urls: Record<string, string> = {};
    if (paths.length > 0) {
      const { data: assinadas } = await context.supabase.storage
        .from("suporte")
        .createSignedUrls(paths, 3600);
      for (const item of (assinadas ?? []) as { path: string | null; signedUrl: string | null }[]) {
        if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
      }
    }

    return {
      admin,
      souCliente: chamado.cliente_id === context.userId,
      chamado: {
        id: chamado.id,
        assunto: chamado.assunto,
        descricao: chamado.descricao,
        unidade: chamado.unidade,
        obraNome: chamado.obras?.nome ?? null,
        prioridade: chamado.prioridade as SuportePrioridade,
        status: chamado.status as SuporteStatus,
        created_at: chamado.created_at,
        fechado_em: chamado.fechado_em,
        clienteNome: cliente?.nome || cliente?.email || "Cliente",
      },
      mensagens: (mensagens ?? []) as {
        id: string;
        mensagem: string;
        autor_id: string;
        autor_papel: "engenheiro" | "cliente" | "admin";
        created_at: string;
      }[],
      anexos: ((anexos ?? []) as { id: string; path: string; mensagem_id: string | null }[]).map(
        (anexo) => ({ ...anexo, url: urls[anexo.path] ?? null }),
      ),
    };
  });

export const criarChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => criarChamadoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { papel, admin } = await papelDoUsuario(context);
    if (papel !== "cliente" && !admin) {
      throw new Error("Somente clientes podem abrir chamados de suporte.");
    }

    const { data: chamado, error } = await context.supabase
      .from("suporte_chamados")
      .insert({
        cliente_id: context.userId,
        obra_id: data.obraId ?? null,
        unidade: normalizarUnidade(data.unidade) ?? "",
        assunto: data.assunto,
        descricao: data.descricao,
        prioridade: data.prioridade,
        status: "aberto",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const anexosDoUsuario = data.anexos.filter((path) => path.startsWith(`${context.userId}/`));
    if (anexosDoUsuario.length > 0) {
      await context.supabase
        .from("suporte_anexos")
        .insert(anexosDoUsuario.map((path) => ({ chamado_id: chamado.id, path })));
    }

    try {
      const { notificarAdminsNovoChamado } = await import("./suporte.server");
      await notificarAdminsNovoChamado(chamado.id);
    } catch (erro) {
      console.error("[suporte] falha ao notificar administradores", erro);
    }

    return { id: chamado.id as string };
  });

export const responderChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => responderChamadoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { admin, papel } = await papelDoUsuario(context);

    const { data: chamado } = await context.supabase
      .from("suporte_chamados")
      .select("id, status, cliente_id")
      .eq("id", data.chamadoId)
      .maybeSingle();
    if (!chamado) throw new Error("Chamado não encontrado");
    if (!admin && chamado.cliente_id !== context.userId) {
      throw new Error("Você não tem acesso a este chamado.");
    }
    if (chamado.status === "fechado") {
      throw new Error("Este chamado está fechado e não recebe novas mensagens.");
    }

    const { data: mensagem, error } = await context.supabase
      .from("suporte_mensagens")
      .insert({
        chamado_id: data.chamadoId,
        autor_id: context.userId,
        autor_papel: admin ? "admin" : (papel ?? "cliente"),
        mensagem: data.mensagem,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const anexosDoUsuario = data.anexos.filter((path) => path.startsWith(`${context.userId}/`));
    if (anexosDoUsuario.length > 0) {
      await context.supabase.from("suporte_anexos").insert(
        anexosDoUsuario.map((path) => ({
          chamado_id: data.chamadoId,
          mensagem_id: mensagem.id,
          path,
        })),
      );
    }

    // Resposta do suporte coloca o chamado em atendimento; resposta do cliente reabre.
    const novoStatus = admin
      ? chamado.status === "aberto"
        ? "em_atendimento"
        : chamado.status
      : chamado.status === "resolvido"
        ? "em_atendimento"
        : chamado.status;

    await context.supabase
      .from("suporte_chamados")
      .update({ ultima_mensagem_em: new Date().toISOString(), status: novoStatus })
      .eq("id", data.chamadoId);

    if (admin) {
      try {
        const { notificarClienteResposta } = await import("./suporte.server");
        await notificarClienteResposta(data.chamadoId, data.mensagem);
      } catch (erro) {
        console.error("[suporte] falha ao notificar o cliente", erro);
      }
    }

    return { id: mensagem.id as string };
  });

export const alterarStatusChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => alterarStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);

    const fechando = data.status === "fechado";
    const { error } = await context.supabase
      .from("suporte_chamados")
      .update({
        status: data.status,
        fechado_em: fechando ? new Date().toISOString() : null,
        fechado_por: fechando ? context.userId : null,
      })
      .eq("id", data.chamadoId);
    if (error) throw new Error(error.message);

    try {
      const { notificarClienteStatus } = await import("./suporte.server");
      await notificarClienteStatus(data.chamadoId, data.status);
    } catch (erro) {
      console.error("[suporte] falha ao notificar mudança de situação", erro);
    }

    return { ok: true };
  });
