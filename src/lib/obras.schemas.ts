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

export const telefoneSchema = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : undefined));

/** Uma casa vinculada à pessoa no pré-cadastro (unidade vazia = obra inteira). */
export const preCadastroUnidadeSchema = z.object({
  obraId: z.string().uuid(),
  unidade: z
    .string()
    .trim()
    .max(60)
    .default("")
    .transform((valor) => normalizarUnidade(valor) ?? ""),
  percentual: z.coerce.number().min(0).max(100).nullable().optional(),
  contrato_ok: z.boolean().default(false),
});

export type PreCadastroUnidade = z.infer<typeof preCadastroUnidadeSchema>;

export const preCadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  cpf: cpfSchema,
  email: z.string().trim().email("E-mail inválido").max(255).toLowerCase(),
  papel: z.enum(["engenheiro", "cliente"]),
  telefone: telefoneSchema,
  unidades: z.array(preCadastroUnidadeSchema).max(40).default([]),
});


export const criarObraSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da obra").max(140),
  endereco: z.string().trim().max(240).default(""),
  data_inicio: z.string().trim().max(10).optional(),
  previsao_termino: z.string().trim().max(10).optional(),
});

export const unidadeSchema = z
  .string()
  .trim()
  .max(60)
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : undefined));

export const vincularClienteSchema = z.object({
  obraId: z.string().uuid(),
  cpf: cpfSchema,
  unidade: unidadeSchema,
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
        unidade: unidadeSchema,
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

/** Resumos por casa/unidade guardados junto da atualização. */
export type ResumosUnidades = Record<string, ResumoIA>;

/** Normaliza o rótulo de uma casa/unidade ("casa 01" -> "Casa 1"). */
export function normalizarUnidade(valor: string | null | undefined): string | null {
  const texto = (valor ?? "").replace(/\s+/g, " ").trim();
  if (!texto) return null;
  const casada = texto.match(
    /(casa|lote|unidade|apto|apartamento|quadra|torre|bloco)\s*(?:n[º°.]?|nº|no\.?|#|:|-)?\s*([0-9]{1,4})\s*([a-zA-Z])?/i,
  );
  if (casada) {
    const tipo = casada[1]!.toLowerCase();
    const rotulo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    const numero = String(Number(casada[2]));
    const sufixo = casada[3] ? casada[3].toUpperCase() : "";
    return `${rotulo} ${numero}${sufixo}`;
  }
  return texto.slice(0, 60);
}

export function mesmaUnidade(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizarUnidade(a);
  const nb = normalizarUnidade(b);
  if (!na || !nb) return true;
  return na.toLowerCase() === nb.toLowerCase();
}

/** Detecta a casa/unidade a partir do texto das células da linha (Item/Descrição). */
export function detectarUnidadeDaLinha(linha: Record<string, string>): string | null {
  for (const valor of Object.values(linha)) {
    const unidade = normalizarUnidade(
      /(casa|lote|unidade|apto|apartamento)/i.test(valor ?? "") ? valor : "",
    );
    if (unidade) return unidade;
  }
  return null;
}

/** Mantém apenas as linhas da casa informada (linhas sem casa detectada são gerais). */
export function filtrarExcelPorUnidade(
  dados: ExcelDados | null,
  unidade: string | null | undefined,
): ExcelDados | null {
  if (!dados) return null;
  const alvo = normalizarUnidade(unidade);
  if (!alvo) return dados;
  const linhas = dados.linhas.filter((linha) => {
    const daLinha = detectarUnidadeDaLinha(linha);
    return !daLinha || daLinha.toLowerCase() === alvo.toLowerCase();
  });
  return { ...dados, linhas };
}

/** Agrupa as linhas do relatório por casa/unidade detectada. */
export function agruparExcelPorUnidade(dados: ExcelDados): Map<string, ExcelDados> {
  const grupos = new Map<string, ExcelDados>();
  const gerais: Record<string, string>[] = [];
  for (const linha of dados.linhas) {
    const unidade = detectarUnidadeDaLinha(linha);
    if (!unidade) {
      gerais.push(linha);
      continue;
    }
    const atual = grupos.get(unidade);
    if (atual) atual.linhas.push(linha);
    else grupos.set(unidade, { colunas: dados.colunas, linhas: [linha] });
  }
  if (gerais.length > 0) {
    for (const grupo of grupos.values()) grupo.linhas = [...gerais, ...grupo.linhas];
  }
  return grupos;
}
