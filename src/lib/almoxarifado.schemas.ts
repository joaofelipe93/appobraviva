import { z } from "zod";

export const UNIDADES_MEDIDA = [
  "un",
  "sc",
  "kg",
  "t",
  "m",
  "m²",
  "m³",
  "l",
  "cx",
  "pç",
  "rolo",
  "br",
] as const;

export const materialSchema = z.object({
  obraId: z.string().uuid(),
  nome: z.string().trim().min(2, "Informe o nome do material"),
  categoria: z.string().trim().max(60).default(""),
  unidadeMedida: z.string().trim().min(1).max(10).default("un"),
  custoUnitario: z.number().nonnegative().nullable().default(null),
  fornecedor: z.string().trim().max(120).default(""),
  estoqueMinimo: z.number().nonnegative().default(0),
  observacoes: z.string().trim().max(500).default(""),
});

export const materialUpdateSchema = materialSchema.omit({ obraId: true }).extend({
  materialId: z.string().uuid(),
});

export const movimentacaoSchema = z.object({
  materialId: z.string().uuid(),
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.number().positive("A quantidade deve ser maior que zero"),
  custoUnitario: z.number().nonnegative().nullable().default(null),
  fornecedor: z.string().trim().max(120).default(""),
  notaFiscal: z.string().trim().max(60).default(""),
  responsavel: z.string().trim().max(120).default(""),
  observacoes: z.string().trim().max(500).default(""),
  dataMovimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export type MaterialInput = z.infer<typeof materialSchema>;
export type MovimentacaoInput = z.infer<typeof movimentacaoSchema>;

export type MovimentacaoItem = {
  id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  custo_unitario: number | null;
  fornecedor: string;
  nota_fiscal: string;
  responsavel: string;
  observacoes: string;
  data_movimento: string;
  created_at: string;
};

export type MaterialComSaldo = {
  id: string;
  nome: string;
  categoria: string;
  unidade_medida: string;
  custo_unitario: number | null;
  fornecedor: string;
  estoque_minimo: number;
  observacoes: string;
  entradas: number;
  saidas: number;
  saldo: number;
  valorEstoque: number;
  abaixoDoMinimo: boolean;
  movimentacoes: MovimentacaoItem[];
};

export function formatarQuantidade(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(valor);
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
