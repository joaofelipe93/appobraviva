import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, Output } from "ai";
import { z } from "zod";
import type { ExcelDados, ResumoIA } from "./obras.schemas";

const saidaSchema = z.object({
  titulo: z.string(),
  resumo: z.string(),
  pontos: z.array(z.string()),
});

function limitar(texto: string, max: number): string {
  const limpo = (texto ?? "").replace(/\s+/g, " ").trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo;
}

function planilhaEmTexto(dados: ExcelDados): string {
  const linhas = dados.linhas.slice(0, 120);
  const cabecalho = dados.colunas.join(" | ");
  const corpo = linhas
    .map((linha) => dados.colunas.map((coluna) => linha[coluna] ?? "").join(" | "))
    .join("\n");
  return `${cabecalho}\n${corpo}`;
}

export async function gerarResumoDoRelatorio(params: {
  dados: ExcelDados;
  obraNome: string;
  dataVisita: string;
  observacoes?: string | null;
}): Promise<ResumoIA> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A IA não está configurada neste projeto.");

  const gateway = createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  const prompt = [
    `Obra: ${params.obraNome}`,
    `Data da visita: ${params.dataVisita}`,
    params.observacoes ? `Observações do engenheiro: ${params.observacoes}` : "",
    "",
    "Relatório de andamento (planilha enviada pelo engenheiro):",
    planilhaEmTexto(params.dados),
  ]
    .filter(Boolean)
    .join("\n");

  const resultado = streamText({
    model: gateway("google/gemini-2.5-flash"),
    system: [
      "Você explica relatórios técnicos de obras de construção civil para o cliente final, que não é da área.",
      "Escreva em português do Brasil, tom claro, direto e tranquilizador, sem jargão técnico e sem siglas.",
      "Use APENAS as informações do relatório e das observações fornecidas. Nunca invente prazos, valores, percentuais ou etapas.",
      "Formato: 'titulo' com no máximo 60 caracteres; 'resumo' com 2 a 4 frases (máx. 600 caracteres) sobre o andamento geral;",
      "'pontos' com 3 a 5 frases curtas destacando o que avançou, o que está em execução e pendências ou pontos de atenção, quando houver.",
    ].join(" "),
    prompt,
    output: Output.object({ schema: saidaSchema }),
  });

  const saida = await resultado.output;

  return {
    titulo: limitar(saida.titulo, 80) || "Resumo do relatório",
    resumo: limitar(saida.resumo, 700),
    pontos: saida.pontos
      .map((ponto) => limitar(ponto, 220))
      .filter((ponto) => ponto.length > 0)
      .slice(0, 6),
  };
}
