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

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
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
  email: z.string().trim().email("E-mail inválido").max(255),
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
