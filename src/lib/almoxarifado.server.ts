import type { MaterialComSaldo, MovimentacaoItem } from "./almoxarifado.schemas";

export const CAMPOS_MATERIAL =
  "id, nome, codigo_interno, codigo_barras, categoria, unidade_medida, custo_unitario, fornecedor, estoque_minimo, observacoes, movimentacoes_estoque(id, tipo, quantidade, custo_unitario, fornecedor, nota_fiscal, responsavel, observacoes, data_movimento, created_at)";

/** Confirma que o usuário é engenheiro ou administrador (únicos com acesso ao armazém). */
export async function exigirEquipe(context: { supabase: any; userId: string }) {
  const { data: papeis } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const papel = (papeis?.[0]?.role ?? null) as "engenheiro" | "cliente" | "admin" | null;
  if (papel !== "engenheiro" && papel !== "admin") {
    throw new Error("Apenas engenheiros e administradores acessam o almoxarifado.");
  }
  return papel;
}

/** Converte a linha do banco (material + movimentações) no item com saldo usado na tela. */
export function montarMaterial(m: any): MaterialComSaldo {
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
    codigo_interno: m.codigo_interno ?? "",
    codigo_barras: m.codigo_barras ?? "",
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
}
