import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  materialSchema,
  materialUpdateSchema,
  movimentacaoSchema,
} from "./almoxarifado.schemas";
import type { MaterialComSaldo, MovimentacaoItem } from "./almoxarifado.schemas";

const obraIdSchema = z.object({ obraId: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });

/** Obras que o usuário pode gerenciar no almoxarifado (engenheiro dono ou admin). */
export const obrasDoAlmoxarifado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: papeis } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const papel = papeis?.[0]?.role ?? null;
    if (papel !== "engenheiro" && papel !== "admin") {
      throw new Error("Apenas engenheiros e administradores acessam o almoxarifado.");
    }

    if (papel === "admin") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("obras")
        .select("id, nome")
        .order("nome", { ascending: true });
      if (error) throw new Error(error.message);
      return { papel, obras: data ?? [] };
    }

    const { data, error } = await context.supabase
      .from("obras")
      .select("id, nome")
      .eq("engenheiro_id", context.userId)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return { papel, obras: data ?? [] };
  });

export const listarEstoque = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => obraIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: materiais, error } = await context.supabase
      .from("materiais")
      .select(
        "id, nome, categoria, unidade_medida, custo_unitario, fornecedor, estoque_minimo, observacoes, movimentacoes_estoque(id, tipo, quantidade, custo_unitario, fornecedor, nota_fiscal, responsavel, observacoes, data_movimento, created_at)",
      )
      .eq("obra_id", data.obraId)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);

    const itens: MaterialComSaldo[] = (materiais ?? []).map((m) => {
      const movimentacoes = ((m.movimentacoes_estoque ?? []) as MovimentacaoItem[])
        .map((mv) => ({ ...mv, quantidade: Number(mv.quantidade) }))
        .sort((a, b) =>
          a.data_movimento === b.data_movimento
            ? b.created_at.localeCompare(a.created_at)
            : b.data_movimento.localeCompare(a.data_movimento),
        );
      const entradas = movimentacoes
        .filter((mv) => mv.tipo === "entrada")
        .reduce((soma, mv) => soma + mv.quantidade, 0);
      const saidas = movimentacoes
        .filter((mv) => mv.tipo === "saida")
        .reduce((soma, mv) => soma + mv.quantidade, 0);
      const saldo = entradas - saidas;
      const custo = m.custo_unitario === null ? null : Number(m.custo_unitario);
      return {
        id: m.id,
        nome: m.nome,
        categoria: m.categoria,
        unidade_medida: m.unidade_medida,
        custo_unitario: custo,
        fornecedor: m.fornecedor,
        estoque_minimo: Number(m.estoque_minimo),
        observacoes: m.observacoes,
        entradas,
        saidas,
        saldo,
        valorEstoque: custo === null ? 0 : saldo * custo,
        abaixoDoMinimo: Number(m.estoque_minimo) > 0 && saldo < Number(m.estoque_minimo),
        movimentacoes,
      };
    });

    return {
      itens,
      totalMateriais: itens.length,
      valorTotal: itens.reduce((soma, i) => soma + i.valorEstoque, 0),
      alertas: itens.filter((i) => i.abaixoDoMinimo).length,
    };
  });

export const criarMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => materialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("materiais").insert({
      obra_id: data.obraId,
      nome: data.nome,
      categoria: data.categoria,
      unidade_medida: data.unidadeMedida,
      custo_unitario: data.custoUnitario,
      fornecedor: data.fornecedor,
      estoque_minimo: data.estoqueMinimo,
      observacoes: data.observacoes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
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
