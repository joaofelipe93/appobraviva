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
  vincularClienteSchema,
  ETAPAS_PADRAO,
} from "./obras.schemas";
import type { ExcelDados, ResumoIA } from "./obras.schemas";
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

    if (!papel) {
      const { data: liberacao } = await supabaseAdmin
        .from("pre_cadastros")
        .select("id, nome, papel, usado_por")
        .eq("cpf", data.cpf)
        .maybeSingle();

      if (!liberacao) {
        throw new Error(
          "Este CPF não foi liberado pelo administrador. Solicite o pré-cadastro para acessar.",
        );
      }
      if (liberacao.usado_por && liberacao.usado_por !== context.userId) {
        throw new Error("Este CPF já está vinculado a outra conta.");
      }
      papel = liberacao.papel;

      await supabaseAdmin
        .from("pre_cadastros")
        .update({ usado_em: new Date().toISOString(), usado_por: context.userId })
        .eq("id", liberacao.id);
    }

    const { error: perfilErro } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: context.userId, nome: data.nome, email, cpf: data.cpf },
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
    const { data, error } = await context.supabase
      .from("pre_cadastros")
      .select("id, nome, cpf, email, papel, usado_em, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarPreCadastro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => preCadastroSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { garantirAdmin } = await import("./admin.server");
    await garantirAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("pre_cadastros").insert({
      nome: data.nome,
      cpf: data.cpf,
      email: data.email,
      papel: data.papel,
      criado_por: context.userId,
    });
    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate")) {
        throw new Error("Já existe um pré-cadastro com este CPF.");
      }
      throw new Error(error.message);
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
        context.supabase.from("obra_clientes").select("cliente_id").eq("obra_id", data.obraId),
        context.supabase.from("leituras").select("atualizacao_id").eq("user_id", context.userId),
      ]);

    const clienteIds = (vinculos ?? []).map((v) => v.cliente_id);
    let clientes: { id: string; nome: string; email: string; cpf: string | null }[] = [];
    if (clienteIds.length > 0) {
      const { data: perfis } = await context.supabase
        .from("profiles")
        .select("id, nome, email, cpf")
        .in("id", clienteIds);
      clientes = perfis ?? [];
    }

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

    const { error } = await context.supabase
      .from("obra_clientes")
      .insert({ obra_id: data.obraId, cliente_id: perfil.id });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);

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

export const obterAtualizacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ atualizacaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: atualizacao, error } = await context.supabase
      .from("atualizacoes")
      .select(
        "id, obra_id, data_visita, observacoes, excel_path, excel_nome, excel_dados, resumo_ia, etapas_atualizadas, midias(id, tipo, path), obras(nome, engenheiro_id)",
      )
      .eq("id", data.atualizacaoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!atualizacao) throw new Error("Atualização não encontrada");

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

    return {
      id: atualizacao.id,
      obraId: atualizacao.obra_id,
      obraNome: atualizacao.obras?.nome ?? "Obra",
      data_visita: atualizacao.data_visita,
      observacoes: atualizacao.observacoes,
      excel_nome: atualizacao.excel_nome,
      excelUrl: atualizacao.excel_path ? (urls[atualizacao.excel_path] ?? null) : null,
      excel_dados: (atualizacao.excel_dados as ExcelDados | null) ?? null,
      resumo_ia: (atualizacao.resumo_ia as ResumoIA | null) ?? null,
      fotos: (atualizacao.midias ?? [])
        .filter((m) => m.tipo === "foto")
        .map((m) => ({ id: m.id, url: urls[m.path] ?? "" })),
      videos: (atualizacao.midias ?? [])
        .filter((m) => m.tipo === "video")
        .map((m) => ({ id: m.id, url: urls[m.path] ?? "" })),
      etapasAtualizadas: (etapas ?? []).filter((e) =>
        (atualizacao.etapas_atualizadas ?? []).includes(e.id),
      ),
      souEngenheiro,
    };
  });
