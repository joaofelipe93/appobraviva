import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  buscaCodigoSchema,
  materialSchema,
  materialUpdateSchema,
  movimentacaoSchema,
  normalizarCodigo,
} from "./almoxarifado.schemas";
import type { MaterialComSaldo } from "./almoxarifado.schemas";
import {
  CAMPOS_MATERIAL,
  exigirEquipe,
  montarMaterial,
  nomeDoUsuario,
} from "./almoxarifado.server";

const idSchema = z.object({ id: z.string().uuid() });

/** Papel do usuário no armazém geral. */
export const acessoAlmoxarifado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const papel = await exigirEquipe(context);
    const nome = await nomeDoUsuario(context);
    return { papel, nome };
  });

export const listarEstoque = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirEquipe(context);
    const { data: materiais, error } = await context.supabase
      .from("materiais")
      .select(CAMPOS_MATERIAL)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);

    const itens: MaterialComSaldo[] = (materiais ?? []).map(montarMaterial);

    return {
      itens,
      totalMateriais: itens.length,
      valorTotal: itens.reduce((soma, i) => soma + i.valorEstoque, 0),
      alertas: itens.filter((i) => i.abaixoDoMinimo).length,
    };
  });

/** Busca um material pelo código interno (QR) ou pelo código de barras do fabricante. */
export const buscarMaterialPorCodigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => buscaCodigoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipe(context);
    // Somente caracteres seguros: o valor entra em um filtro `or` do PostgREST.
    const codigo = normalizarCodigo(data.codigo).replace(/[^A-Z0-9._-]/g, "");
    if (!codigo) return { encontrado: false as const, codigo };

    const { data: materiais, error } = await context.supabase
      .from("materiais")
      .select(CAMPOS_MATERIAL)
      .or(`codigo_interno.eq.${codigo},codigo_barras.eq.${codigo}`)
      .limit(1);
    if (error) throw new Error(error.message);

    const bruto = (materiais ?? [])[0];
    if (!bruto) return { encontrado: false as const, codigo };
    return { encontrado: true as const, codigo, material: montarMaterial(bruto) };
  });

export const criarMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => materialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: criado, error } = await context.supabase
      .from("materiais")
      .insert({
        nome: data.nome,
        categoria: data.categoria,
        unidade_medida: data.unidadeMedida,
        custo_unitario: data.custoUnitario,
        fornecedor: data.fornecedor,
        estoque_minimo: data.estoqueMinimo,
        observacoes: data.observacoes,
        codigo_barras: data.codigoBarras ? data.codigoBarras.toUpperCase() : null,
      })
      .select("id, codigo_interno, codigo_barras")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, material: criado };
  });

export const atualizarMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => materialUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("materiais")
      .update({
        nome: data.nome,
        categoria: data.categoria,
        unidade_medida: data.unidadeMedida,
        custo_unitario: data.custoUnitario,
        fornecedor: data.fornecedor,
        estoque_minimo: data.estoqueMinimo,
        observacoes: data.observacoes,
        codigo_barras: data.codigoBarras ? data.codigoBarras.toUpperCase() : null,
      })
      .eq("id", data.materialId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const excluirMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("materiais").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registrarMovimentacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => movimentacaoSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.tipo === "saida") {
      const { data: material, error: erroMaterial } = await context.supabase
        .from("materiais")
        .select("nome, movimentacoes_estoque(tipo, quantidade)")
        .eq("id", data.materialId)
        .maybeSingle();
      if (erroMaterial) throw new Error(erroMaterial.message);
      if (!material) throw new Error("Material não encontrado.");
      const movimentos = (material.movimentacoes_estoque ?? []) as {
        tipo: "entrada" | "saida";
        quantidade: number;
      }[];
      const saldo = movimentos.reduce(
        (soma, mv) => soma + (mv.tipo === "entrada" ? Number(mv.quantidade) : -Number(mv.quantidade)),
        0,
      );
      if (data.quantidade > saldo) {
        throw new Error(`Saldo insuficiente: disponível ${saldo} de ${material.nome}.`);
      }
    }

    const { error } = await context.supabase.from("movimentacoes_estoque").insert({
      material_id: data.materialId,
      tipo: data.tipo,
      quantidade: data.quantidade,
      custo_unitario: data.custoUnitario,
      fornecedor: data.fornecedor,
      nota_fiscal: data.notaFiscal,
      responsavel: data.responsavel,
      observacoes: data.observacoes,
      data_movimento: data.dataMovimento,
      criado_por: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirMovimentacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("movimentacoes_estoque")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
