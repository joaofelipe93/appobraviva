import { z } from "zod";

export const ETAPAS_PADRAO = [
  "Fundação",
  "Estrutura",
  "Alvenaria",
  "Elétrica",
  "Hidráulica",
  "Acabamento",
  "Entrega",
];

export const COLUNAS_EXCEL_PADRAO = [
  "Item",
  "Descrição",
  "Status",
  "% Concluído",
  "Observações",
];

export type EtapaStatus = "nao_iniciada" | "em_andamento" | "concluida";

export const STATUS_LABEL: Record<EtapaStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export type ExcelDados = {
  colunas: string[];
  linhas: Record<string, string>[];
  aviso?: string;
};

export type ResumoIA = {
  titulo: string;
  resumo: string;
  pontos: string[];
};

export function soDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function formatarCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export const cpfSchema = z
  .string()
  .trim()
  .transform(soDigitos)
  .refine(cpfValido, "CPF inválido");

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  papel: z.enum(["engenheiro", "cliente"]),
  cpf: cpfSchema,
});

export const preCadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  cpf: cpfSchema,
  email: z.string().trim().email("E-mail inválido").max(255).toLowerCase(),
  papel: z.enum(["engenheiro", "cliente"]),
});

export const criarObraSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da obra").max(140),
  endereco: z.string().trim().max(240).default(""),
  data_inicio: z.string().trim().max(10).optional(),
  previsao_termino: z.string().trim().max(10).optional(),
});

export const vincularClienteSchema = z.object({
  obraId: z.string().uuid(),
  cpf: cpfSchema,
});

export const etapaUpdateSchema = z.object({
  etapaId: z.string().uuid(),
  status: z.enum(["nao_iniciada", "em_andamento", "concluida"]),
  data_conclusao: z.string().trim().max(10).nullable().optional(),
});

export const novaEtapaSchema = z.object({
  obraId: z.string().uuid(),
  nome: z.string().trim().min(2, "Informe o nome da etapa").max(120),
});

export const criarAtualizacaoSchema = z.object({
  obraId: z.string().uuid(),
  data_visita: z.string().trim().min(10).max(10),
  observacoes: z.string().trim().max(4000).default(""),
  etapas_atualizadas: z.array(z.string().uuid()).max(60).default([]),
});

export const midiasSchema = z.object({
  atualizacaoId: z.string().uuid(),
  midias: z
    .array(
      z.object({
        tipo: z.enum(["foto", "video"]),
        path: z.string().trim().min(3).max(400),
      }),
    )
    .max(40),
});

export const excelSchema = z.object({
  atualizacaoId: z.string().uuid(),
  path: z.string().trim().min(3).max(400),
  nome: z.string().trim().min(1).max(240),
});

export function progressoDasEtapas(
  etapas: { status: EtapaStatus }[] | null | undefined,
): number {
  if (!etapas || etapas.length === 0) return 0;
  const total = etapas.reduce(
    (soma, etapa) =>
      soma + (etapa.status === "concluida" ? 1 : etapa.status === "em_andamento" ? 0.5 : 0),
    0,
  );
  return Math.round((total / etapas.length) * 100);
}
