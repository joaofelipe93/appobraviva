import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  criarAtualizacaoSchema,
  criarObraSchema,
  etapaUpdateSchema,
  excelSchema,
  midiasSchema,
  novaEtapaSchema,
  perfilSchema,
  preCadastroSchema,
  preCadastroUnidadeSchema,
  vincularClienteSchema,
  ETAPAS_PADRAO,
  agruparExcelPorUnidade,
  filtrarExcelPorUnidades,
  normalizarUnidade,
  resumoDaUnidade,
  unidadeBanco,
  unidadesDoCliente,
} from "./obras.schemas";
import type { ExcelDados, ResumoIA, ResumosUnidades } from "./obras.schemas";

import { z } from "zod";

export const registrarPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => perfilSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims["email"] as string | undefined) ?? "";

    const { data: papeis } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    let papel = papeis?.[0]?.role ?? null;
    let telefone: string | null = null;


    if (!papel) {
      const { data: liberacao } = await supabaseAdmin
        .from("pre_cadastros")
        .select("id, nome, papel, usado_por, email, telefone, obra_id, unidade")
        .eq("cpf", data.cpf)
        .maybeSingle();

      if (!liberacao || liberacao.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error(
          "Este CPF não foi liberado pelo administrador. Solicite o pré-cadastro para acessar.",
        );
      }
      if (liberacao.usado_por && liberacao.usado_por !== context.userId) {
        throw new Error("Este CPF já está vinculado a outra conta.");
      }

      papel = liberacao.papel;
      telefone = liberacao.telefone ?? null;

      await supabaseAdmin
        .from("pre_cadastros")
        .update({ usado_em: new Date().toISOString(), usado_por: context.userId })
        .eq("id", liberacao.id);

      // Vínculo automático com todas as casas definidas pelo administrador no pré-cadastro.
      if (papel === "cliente") {
        const { data: casas } = await supabaseAdmin
          .from("pre_cadastro_unidades")
          .select("obra_id, unidade, percentual, contrato_ok")
          .eq("pre_cadastro_id", liberacao.id);

        const vinculos = (casas ?? []).map((casa) => ({
          obra_id: casa.obra_id,
          cliente_id: context.userId,
          unidade: unidadeBanco(casa.unidade),
          percentual: casa.percentual,
          contrato_ok: casa.contrato_ok,
        }));

        // Compatibilidade com pré-cadastros antigos (uma casa na própria linha).
        if (vinculos.length === 0 && liberacao.obra_id) {
          vinculos.push({
            obra_id: liberacao.obra_id,
            cliente_id: context.userId,
            unidade: unidadeBanco(liberacao.unidade),
            percentual: null,
            contrato_ok: false,
          });
        }

        if (vinculos.length > 0) {
          await supabaseAdmin
            .from("obra_clientes")
            .upsert(vinculos, { onConflict: "obra_id,cliente_id,unidade" });
        }
      }
    }


    const { error: perfilErro } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: context.userId, nome: data.nome, email, cpf: data.cpf, ...(telefone ? { telefone } : {}) },
        { onConflict: "id" },
      );

    if (perfilErro) {
      if (perfilErro.code === "23505" || perfilErro.message.includes("duplicate")) {
        throw new Error("Este CPF já está cadastrado em outra conta.");
      }
      throw new Error(perfilErro.message);
    }

    if (!papeis || papeis.length === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: papel });
    }

    return { papel };
  });

export const verificarLiberacao = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        cpf: z.string().trim().transform((v) => v.replace(/\D/g, "")),
        email: z.string().trim().email().max(255).toLowerCase(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: liberacao } = await supabaseAdmin
      .from("pre_cadastros")
      .select("nome, papel, email, usado_por")
      .eq("cpf", data.cpf)
      .maybeSingle();

    if (!liberacao || liberacao.email.toLowerCase() !== data.email) {
      return { liberado: false as const };
    }
    if (liberacao.usado_por) {
      return { liberado: false as const, jaUsado: true as const };
    }
    return { liberado: true as const, nome: liberacao.nome, papel: liberacao.papel };
  });

export const listarPreCadastros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { garantirAdmin } = await import("./admin.server");
    await garantirAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await context.supabase
      .from("pre_cadastros")
      .select("id, nome, cpf, email, telefone, papel, usado_em, created_at, obra_id, unidade")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const lista = data ?? [];

    const { data: casas } = await context.supabase
      .from("pre_cadastro_unidades")
      .select("id, pre_cadastro_id, obra_id, unidade, percentual, contrato_ok");

    const { data: obras } = await supabaseAdmin
      .from("obras")
      .select("id, nome")
      .order("nome", { ascending: true });
    const nomes = new Map((obras ?? []).map((o) => [o.id, o.nome]));

    return lista.map((item) => {
      const minhas = (casas ?? [])
        .filter((c) => c.pre_cadastro_id === item.id)
        .map((c) => ({
          id: c.id,
          obraId: c.obra_id,
          obraNome: nomes.get(c.obra_id) ?? "Obra removida",
          unidade: c.unidade,
          percentual: c.percentual,
          contrato_ok: c.contrato_ok,
        }))
        .sort(
          (a, b) =>
            a.obraNome.localeCompare(b.obraNome, "pt-BR") ||
            a.unidade.localeCompare(b.unidade, "pt-BR", { numeric: true }),
        );

      // Pré-cadastros antigos guardavam uma única casa na própria linha.
      if (minhas.length === 0 && item.obra_id) {
        minhas.push({
          id: `legado-${item.id}`,
          obraId: item.obra_id,
          obraNome: nomes.get(item.obra_id) ?? "Obra removida",
          unidade: item.unidade ?? "",
          percentual: null,
          contrato_ok: false,
        });
      }

      return { ...item, unidades: minhas };
    });
  });

/** Todas as obras cadastradas, para o admin vincular o cliente já no pré-cadastro. */
export const listarObrasAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { garantirAdmin } = await import("./admin.server");
    await garantirAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("obras")
      .select("id, nome")
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarPreCadastro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => preCadastroSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { garantirAdmin } = await import("./admin.server");
    await garantirAdmin(context.supabase, context.userId);
    const cliente = data.papel === "cliente";
    const { data: criado, error } = await context.supabase
      .from("pre_cadastros")
      .insert({
        nome: data.nome,
        cpf: data.cpf,
        email: data.email,
        papel: data.papel,
        telefone: data.telefone ?? null,
        criado_por: context.userId,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate")) {
        throw new Error("Já existe um pré-cadastro com este CPF.");
      }
      throw new Error(error.message);
    }

    if (cliente && data.unidades.length > 0) {
      const { error: erroCasas } = await context.supabase.from("pre_cadastro_unidades").insert(
        data.unidades.map((casa) => ({
          pre_cadastro_id: criado.id,
          obra_id: casa.obraId,
          unidade: casa.unidade,
          percentual: casa.percentual ?? null,
          contrato_ok: casa.contrato_ok,
        })),
      );
      if (erroCasas) throw new Error(erroCasas.message);
    }

    return { id: criado.id };
  });

/** Acrescenta uma casa a uma pessoa já pré-cadastrada. */
export const adicionarUnidadePreCadastro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    preCadastroUnidadeSchema
      .extend({ preCadastroId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { garantirAdmin } = await import("./admin.server");
    await garantirAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("pre_cadastro_unidades").upsert(
      {
        pre_cadastro_id: data.preCadastroId,
        obra_id: data.obraId,
        unidade: data.unidade,
        percentual: data.percentual ?? null,
        contrato_ok: data.contrato_ok,
      },
      { onConflict: "pre_cadastro_id,obra_id,unidade" },
    );
    if (error) throw new Error(error.message);

    // Se a pessoa já criou a conta, o vínculo vale de imediato.
    const { data: pre } = await context.supabase
      .from("pre_cadastros")
      .select("usado_por")
      .eq("id", data.preCadastroId)
      .maybeSingle();
    if (pre?.usado_por) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("obra_clientes").upsert(
        {
          obra_id: data.obraId,
          cliente_id: pre.usado_por,
          unidade: data.unidade,
          percentual: data.percentual ?? null,
          contrato_ok: data.contrato_ok,
        },
        { onConflict: "obra_id,cliente_id,unidade" },
      );
    }
    return { ok: true };
  });

export const removerUnidadePreCadastro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { garantirAdmin } = await import("./admin.server");
    await garantirAdmin(context.supabase, context.userId);

    const { data: casa } = await context.supabase
      .from("pre_cadastro_unidades")
      .select("obra_id, unidade, pre_cadastros(usado_por)")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("pre_cadastro_unidades")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const clienteId = casa?.pre_cadastros?.usado_por ?? null;
    if (casa && clienteId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("obra_clientes")
        .delete()
        .eq("obra_id", casa.obra_id)
        .eq("cliente_id", clienteId)
        .eq("unidade", casa.unidade);
    }
    return { ok: true };
  });


export const removerPreCadastro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { garantirAdmin } = await import("./admin.server");
    await garantirAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("pre_cadastros").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const meuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: perfil }, { data: papeis }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("nome, email, cpf")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    return {
      userId: context.userId,
      nome: perfil?.nome ?? "",
      email: perfil?.email ?? ((context.claims["email"] as string | undefined) ?? ""),
      cpf: perfil?.cpf ?? "",
      papel: (papeis?.[0]?.role ?? null) as "engenheiro" | "cliente" | "admin" | null,
    };
  });

export const listarMinhasObras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: obras, error } = await context.supabase
      .from("obras")
      .select(
        "id, nome, endereco, data_inicio, previsao_termino, engenheiro_id, etapas(status), atualizacoes(id, data_visita)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: leituras } = await context.supabase
      .from("leituras")
      .select("atualizacao_id")
      .eq("user_id", context.userId);
    const lidas = new Set((leituras ?? []).map((l) => l.atualizacao_id));

    return (obras ?? []).map((obra) => {
      const atualizacoes = obra.atualizacoes ?? [];
      const ultima = atualizacoes
        .map((a) => a.data_visita)
        .sort()
        .reverse()[0] ?? null;
      return {
        id: obra.id,
        nome: obra.nome,
        endereco: obra.endereco,
        data_inicio: obra.data_inicio,
        previsao_termino: obra.previsao_termino,
        souEngenheiro: obra.engenheiro_id === context.userId,
        etapas: (obra.etapas ?? []).map((e) => ({ status: e.status })),
        totalAtualizacoes: atualizacoes.length,
        ultimaAtualizacao: ultima,
        naoLidas: atualizacoes.filter((a) => !lidas.has(a.id)).length,
      };
    });
  });

export const obterObra = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ obraId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: obra, error } = await context.supabase
      .from("obras")
      .select("id, nome, endereco, data_inicio, previsao_termino, engenheiro_id")
      .eq("id", data.obraId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!obra) throw new Error("Obra não encontrada");

    const [{ data: etapas }, { data: atualizacoes }, { data: vinculos }, { data: leituras }] =
      await Promise.all([
        context.supabase
          .from("etapas")
          .select("id, nome, ordem, status, data_conclusao")
          .eq("obra_id", data.obraId)
          .order("ordem", { ascending: true }),
        context.supabase
          .from("atualizacoes")
          .select("id, data_visita, observacoes, excel_nome, created_at, midias(id, tipo, path)")
          .eq("obra_id", data.obraId)
          .order("data_visita", { ascending: false })
          .order("created_at", { ascending: false }),
        context.supabase
          .from("obra_clientes")
          .select("cliente_id, unidade")
          .eq("obra_id", data.obraId),
        context.supabase.from("leituras").select("atualizacao_id").eq("user_id", context.userId),
      ]);

    const clienteIds = (vinculos ?? []).map((v) => v.cliente_id);
    let clientes: {
      id: string;
      nome: string;
      email: string;
      cpf: string | null;
      unidade: string | null;
    }[] = [];
    if (clienteIds.length > 0) {
      const { data: perfis } = await context.supabase
        .from("profiles")
        .select("id, nome, email, cpf")
        .in("id", clienteIds);
      clientes = (perfis ?? []).map((perfil) => ({
        ...perfil,
        unidade: (vinculos ?? []).find((v) => v.cliente_id === perfil.id)?.unidade ?? null,
      }));
    }

    const unidades = Array.from(
      new Set(
        (vinculos ?? [])
          .map((v) => normalizarUnidade(v.unidade))
          .filter((u): u is string => !!u),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

    const lidas = new Set((leituras ?? []).map((l) => l.atualizacao_id));
    const souEngenheiro = obra.engenheiro_id === context.userId;

    const midiaPaths = (atualizacoes ?? []).flatMap((a) =>
      (a.midias ?? []).slice(0, 4).map((m) => m.path),
    );
    const capas: Record<string, string> = {};
    if (midiaPaths.length > 0) {
      const { data: assinadas } = await context.supabase.storage
        .from("obras")
        .createSignedUrls(midiaPaths, 3600);
      for (const item of assinadas ?? []) {
        if (item.path && item.signedUrl) capas[item.path] = item.signedUrl;
      }
    }

    return {
      obra: {
        id: obra.id,
        nome: obra.nome,
        endereco: obra.endereco,
        data_inicio: obra.data_inicio,
        previsao_termino: obra.previsao_termino,
      },
      souEngenheiro,
      etapas: etapas ?? [],
      clientes,
      unidades,
      urls: capas,
      atualizacoes: (atualizacoes ?? []).map((a) => ({
        id: a.id,
        data_visita: a.data_visita,
        observacoes: a.observacoes,
        excel_nome: a.excel_nome,
        fotos: (a.midias ?? []).filter((m) => m.tipo === "foto").map((m) => m.path),
        videos: (a.midias ?? []).filter((m) => m.tipo === "video").length,
        lida: lidas.has(a.id),
      })),
    };
  });

export const criarObra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => criarObraSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: obra, error } = await context.supabase
      .from("obras")
      .insert({
        nome: data.nome,
        endereco: data.endereco ?? "",
        data_inicio: data.data_inicio || null,
        previsao_termino: data.previsao_termino || null,
        engenheiro_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("etapas").insert(
      ETAPAS_PADRAO.map((nome, indice) => ({
        obra_id: obra.id,
        nome,
        ordem: indice,
      })),
    );

    return { id: obra.id };
  });

export const excluirObra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ obraId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("obras").delete().eq("id", data.obraId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const vincularCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => vincularClienteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: obra } = await context.supabase
      .from("obras")
      .select("id")
      .eq("id", data.obraId)
      .eq("engenheiro_id", context.userId)
      .maybeSingle();
    if (!obra) throw new Error("Você não é o engenheiro responsável por esta obra");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("id, nome")
      .eq("cpf", data.cpf)
      .maybeSingle();

    if (!perfil) {
      throw new Error(
        "Nenhuma conta encontrada com este CPF. Peça ao cliente para se cadastrar primeiro.",
      );
    }

    const { data: papeis } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", perfil.id);
    if (!papeis?.some((p) => p.role === "cliente")) {
      throw new Error("Esta conta não é uma conta de cliente.");
    }

    const unidade = normalizarUnidade(data.unidade);
    const { error } = await context.supabase
      .from("obra_clientes")
      .upsert(
        { obra_id: data.obraId, cliente_id: perfil.id, unidade },
        { onConflict: "obra_id,cliente_id" },
      );
    if (error) throw new Error(error.message);

    return { nome: perfil.nome };
  });

export const desvincularCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ obraId: z.string().uuid(), clienteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("obra_clientes")
      .delete()
      .eq("obra_id", data.obraId)
      .eq("cliente_id", data.clienteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const salvarEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => etapaUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("etapas")
      .update({
        status: data.status,
        data_conclusao:
          data.status === "concluida"
            ? data.data_conclusao || new Date().toISOString().slice(0, 10)
            : null,
      })
      .eq("id", data.etapaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adicionarEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => novaEtapaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existentes } = await context.supabase
      .from("etapas")
      .select("ordem")
      .eq("obra_id", data.obraId);
    const ordem = (existentes ?? []).reduce((max, e) => Math.max(max, e.ordem), -1) + 1;
    const { error } = await context.supabase
      .from("etapas")
      .insert({ obra_id: data.obraId, nome: data.nome, ordem });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ etapaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("etapas").delete().eq("id", data.etapaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const criarAtualizacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => criarAtualizacaoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: criada, error } = await context.supabase
      .from("atualizacoes")
      .insert({
        obra_id: data.obraId,
        criado_por: context.userId,
        data_visita: data.data_visita,
        observacoes: data.observacoes ?? "",
        etapas_atualizadas: data.etapas_atualizadas ?? [],
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: criada.id };
  });

export const notificarAtualizacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ atualizacaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: atualizacao, error } = await context.supabase
      .from("atualizacoes")
      .select("id, obras(engenheiro_id)")
      .eq("id", data.atualizacaoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!atualizacao || atualizacao.obras?.engenheiro_id !== context.userId) {
      throw new Error("Apenas o engenheiro responsável pode notificar os clientes.");
    }

    const { notificarClientesDaAtualizacao } = await import("./notificacoes.server");
    const enviados = await notificarClientesDaAtualizacao(data.atualizacaoId);
    return { enviados };
  });



export const excluirAtualizacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ atualizacaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("atualizacoes")
      .delete()
      .eq("id", data.atualizacaoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



export const registrarMidias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => midiasSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.midias.length === 0) return { ok: true };
    const { error } = await context.supabase.from("midias").insert(
      data.midias.map((m) => ({
        atualizacao_id: data.atualizacaoId,
        tipo: m.tipo,
        path: m.path,
        unidade: normalizarUnidade(m.unidade),
      })),
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const processarExcel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => excelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: arquivo, error: erroDownload } = await context.supabase.storage
      .from("obras")
      .download(data.path);
    if (erroDownload || !arquivo) throw new Error("Não foi possível ler o arquivo enviado.");

    const XLSX = await import("xlsx");
    const buffer = await arquivo.arrayBuffer();
    const planilha = XLSX.read(buffer, { type: "array" });
    const primeira = planilha.SheetNames[0];
    if (!primeira) throw new Error("A planilha está vazia.");

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(planilha.Sheets[primeira]!, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    const cabecalho = (matriz[0] ?? []).map((celula, indice) =>
      String(celula ?? "").trim() || `Coluna ${indice + 1}`,
    );
    const linhas = matriz.slice(1, 501).map((linha) => {
      const registro: Record<string, string> = {};
      cabecalho.forEach((coluna, indice) => {
        const valor = (linha as unknown[])[indice];
        registro[coluna] = valor === null || valor === undefined ? "" : String(valor).trim();
      });
      return registro;
    });

    const normalizadas = cabecalho.map((c) => c.toLowerCase());
    const esperadas = ["item", "descrição", "status", "% concluído", "observações"];
    const faltando = esperadas.filter(
      (esperada) => !normalizadas.some((c) => c.includes(esperada.replace("% ", ""))),
    );
    const dados: ExcelDados = {
      colunas: cabecalho,
      linhas,
      ...(faltando.length > 0
        ? {
            aviso: `A planilha não segue o padrão recomendado. Colunas não encontradas: ${faltando.join(", ")}. Os dados foram exibidos com as colunas encontradas.`,
          }
        : {}),
    };

    const { error } = await context.supabase
      .from("atualizacoes")
      .update({ excel_path: data.path, excel_nome: data.nome, excel_dados: dados })
      .eq("id", data.atualizacaoId);
    if (error) throw new Error(error.message);

    return dados;
  });

export const gerarResumoRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ atualizacaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: atualizacao, error } = await context.supabase
      .from("atualizacoes")
      .select("id, data_visita, observacoes, obras(nome, engenheiro_id)")
      .eq("id", data.atualizacaoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!atualizacao) throw new Error("Atualização não encontrada");
    if (atualizacao.obras?.engenheiro_id !== context.userId) {
      throw new Error("Apenas o engenheiro responsável pode gerar o resumo.");
    }

    // Conteúdo do relatório fica fora do alcance do cliente: leitura só no servidor.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sigiloso } = await supabaseAdmin
      .from("atualizacoes")
      .select("excel_dados")
      .eq("id", data.atualizacaoId)
      .maybeSingle();

    const dados = (sigiloso?.excel_dados as ExcelDados | null) ?? null;
    if (!dados || dados.linhas.length === 0) {
      throw new Error("Esta atualização não tem relatório para resumir.");
    }


    const { gerarResumoDoRelatorio } = await import("./resumo.server");
    const obraNome = atualizacao.obras?.nome ?? "Obra";

    let resumo: ResumoIA;
    const resumosUnidades: ResumosUnidades = {};
    try {
      resumo = await gerarResumoDoRelatorio({
        dados,
        obraNome,
        dataVisita: atualizacao.data_visita,
        observacoes: atualizacao.observacoes,
      });

      // Um resumo por casa/unidade detectada no relatório, para cada cliente ver só a sua.
      const grupos = agruparExcelPorUnidade(dados);
      for (const [unidade, dadosUnidade] of grupos) {
        resumosUnidades[unidade] = await gerarResumoDoRelatorio({
          dados: dadosUnidade,
          obraNome: `${obraNome} — ${unidade}`,
          dataVisita: atualizacao.data_visita,
          observacoes: atualizacao.observacoes,
        });
      }
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "";
      if (mensagem.includes("429")) {
        throw new Error("Muitas solicitações à IA agora. Tente novamente em alguns instantes.");
      }
      if (mensagem.includes("402")) {
        throw new Error("Os créditos de IA do projeto acabaram. Adicione créditos para continuar.");
      }
      console.error("[resumo-ia]", mensagem);
      throw new Error("Não foi possível gerar o resumo do relatório agora.");
    }

    const { error: erroUpdate } = await context.supabase
      .from("atualizacoes")
      .update({
        resumo_ia: resumo,
        resumos_unidades: resumosUnidades,
        resumo_ia_em: new Date().toISOString(),
      })
      .eq("id", data.atualizacaoId);
    if (erroUpdate) throw new Error(erroUpdate.message);

    return resumo;
  });

export const obterAtualizacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ atualizacaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: atualizacao, error } = await context.supabase
      .from("atualizacoes")
      .select(
        "id, obra_id, data_visita, observacoes, excel_path, excel_nome, etapas_atualizadas, midias(id, tipo, path, unidade), obras(nome, engenheiro_id)",
      )
      .eq("id", data.atualizacaoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!atualizacao) throw new Error("Atualização não encontrada");

    // Acesso à linha já validado pelas regras do banco acima; o conteúdo do
    // relatório é lido apenas aqui no servidor e filtrado por casa/unidade.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conteudo } = await supabaseAdmin
      .from("atualizacoes")
      .select("excel_dados, resumo_ia, resumos_unidades")
      .eq("id", data.atualizacaoId)
      .maybeSingle();


    const paths = (atualizacao.midias ?? []).map((m) => m.path);
    if (atualizacao.excel_path) paths.push(atualizacao.excel_path);
    const urls: Record<string, string> = {};
    if (paths.length > 0) {
      const { data: assinadas } = await context.supabase.storage
        .from("obras")
        .createSignedUrls(paths, 3600);
      for (const item of assinadas ?? []) {
        if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
      }
    }

    const souEngenheiro = atualizacao.obras?.engenheiro_id === context.userId;

    let minhaUnidade: string | null = null;
    if (!souEngenheiro) {
      const { data: vinculo } = await context.supabase
        .from("obra_clientes")
        .select("unidade")
        .eq("obra_id", atualizacao.obra_id)
        .eq("cliente_id", context.userId)
        .maybeSingle();
      minhaUnidade = normalizarUnidade(vinculo?.unidade);
    }

    if (!souEngenheiro) {
      await context.supabase
        .from("leituras")
        .upsert(
          { atualizacao_id: atualizacao.id, user_id: context.userId },
          { onConflict: "atualizacao_id,user_id" },
        );
    }

    const { data: etapas } = await context.supabase
      .from("etapas")
      .select("id, nome")
      .eq("obra_id", atualizacao.obra_id);

    let responsavelNome: string | null = null;
    if (atualizacao.obras?.engenheiro_id) {
      const { data: perfil } = await context.supabase
        .from("profiles")
        .select("nome")
        .eq("id", atualizacao.obras.engenheiro_id)
        .maybeSingle();
      responsavelNome = perfil?.nome?.trim() || null;
    }

    return {
      id: atualizacao.id,
      obraId: atualizacao.obra_id,
      obraNome: atualizacao.obras?.nome ?? "Obra",
      responsavelNome,
      data_visita: atualizacao.data_visita,
      observacoes: atualizacao.observacoes,
      excel_nome: atualizacao.excel_nome,
      excelUrl: atualizacao.excel_path ? (urls[atualizacao.excel_path] ?? null) : null,
      unidade: minhaUnidade,
      excel_dados: souEngenheiro
        ? ((conteudo?.excel_dados as ExcelDados | null) ?? null)
        : filtrarExcelPorUnidade(conteudo?.excel_dados as ExcelDados | null, minhaUnidade),
      resumo_ia: (() => {
        const geral = (conteudo?.resumo_ia as ResumoIA | null) ?? null;
        if (souEngenheiro || !minhaUnidade) return geral;
        const porUnidade = (conteudo?.resumos_unidades as ResumosUnidades | null) ?? {};
        const chave = Object.keys(porUnidade).find(
          (k) => k.toLowerCase() === minhaUnidade!.toLowerCase(),
        );
        return chave ? porUnidade[chave]! : geral;
      })(),
      resumosUnidades: souEngenheiro
        ? ((conteudo?.resumos_unidades as ResumosUnidades | null) ?? {})
        : {},

      fotos: (atualizacao.midias ?? [])
        .filter((m) => m.tipo === "foto")
        .map((m) => ({ id: m.id, url: urls[m.path] ?? "", unidade: m.unidade ?? null })),
      videos: (atualizacao.midias ?? [])
        .filter((m) => m.tipo === "video")
        .map((m) => ({ id: m.id, url: urls[m.path] ?? "", unidade: m.unidade ?? null })),
      etapasAtualizadas: (etapas ?? []).filter((e) =>
        (atualizacao.etapas_atualizadas ?? []).includes(e.id),
      ),
      souEngenheiro,
    };
  });
