import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, CheckCircle2, FileSpreadsheet, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { excluirAtualizacao, gerarResumoRelatorio, obterAtualizacao } from "@/lib/obras.functions";


export const Route = createFileRoute("/_authenticated/atualizacoes/$id")({
  head: () => ({
    meta: [
      { title: "Atualização da obra — ObraViva" },
      {
        name: "description",
        content: "Fotos, vídeos, relatório em tabela e etapas concluídas na visita técnica.",
      },
      { property: "og:title", content: "Atualização da obra — ObraViva" },
      { property: "og:description", content: "Registro completo da visita técnica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AtualizacaoPage,
});

function AtualizacaoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const obterFn = useServerFn(obterAtualizacao);
  const gerarFn = useServerFn(gerarResumoRelatorio);
  const excluirFn = useServerFn(excluirAtualizacao);
  const [gerando, setGerando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const consulta = useQuery({
    queryKey: ["atualizacao", id],
    queryFn: () => obterFn({ data: { atualizacaoId: id } }),
  });

  if (consulta.isLoading) {
    return (
      <AppShell titulo="Carregando atualização">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (consulta.error || !consulta.data) {
    return (
      <AppShell titulo="Atualização indisponível" descricao="Você não tem acesso a este registro.">
        <Button asChild variant="outline">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </AppShell>
    );
  }

  const dados = consulta.data;

  async function confirmarExclusao() {
    setExcluindo(true);
    try {
      await excluirFn({ data: { atualizacaoId: id } });
      await queryClient.invalidateQueries({ queryKey: ["obra", dados.obraId] });
      await queryClient.invalidateQueries({ queryKey: ["painel"] });
      toast.success("Atualização excluída.");
      navigate({ to: "/obras/$id", params: { id: dados.obraId } });
    } catch (erro) {
      toast.error("Não foi possível excluir a atualização", {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <AppShell
      titulo={`Visita de ${new Date(`${dados.data_visita}T12:00:00`).toLocaleDateString("pt-BR")}`}
      descricao={dados.obraNome}
      acao={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/obras/$id" params={{ id: dados.obraId }}>Ver obra</Link>
          </Button>
          {dados.souEngenheiro && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={excluindo}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {excluindo ? "Excluindo..." : "Excluir atualização"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir esta atualização?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As fotos, vídeos, planilha e resumos desta visita serão apagados
                    permanentemente. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmarExclusao}>
                    Excluir definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      }
    >

    >
      <div className="grid max-w-4xl gap-6">
        {dados.observacoes && (
          <Card className="rounded-sm border-l-4 border-l-accent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display uppercase">
                <CalendarDays className="h-4 w-4 text-accent" /> Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed">{dados.observacoes}</p>
            </CardContent>
          </Card>
        )}

        {dados.etapasAtualizadas.length > 0 && (
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display uppercase">Etapas concluídas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {dados.etapasAtualizadas.map((etapa) => (
                <span
                  key={etapa.id}
                  className="flex items-center gap-1 rounded-sm bg-secondary px-2 py-1 text-sm font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4 text-accent" /> {etapa.nome}
                </span>
              ))}
            </CardContent>
          </Card>
        )}

        {dados.fotos.length > 0 && (
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display uppercase">Fotos ({dados.fotos.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {dados.fotos.map((foto) => (
                <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer" title={foto.unidade ?? "Geral"}>
                  <img
                    src={foto.url}
                    alt={`Foto da visita em ${dados.obraNome}`}
                    loading="lazy"
                    className="aspect-square w-full rounded-sm border border-border object-cover"
                  />
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {dados.videos.length > 0 && (
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display uppercase">Vídeos ({dados.videos.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {dados.videos.map((video) => (
                <video
                  key={video.id}
                  src={video.url}
                  controls
                  preload="metadata"
                  className="w-full rounded-sm border border-border"
                />
              ))}
            </CardContent>
          </Card>
        )}

        {dados.excel_dados && (
          <Card className="rounded-sm border-l-4 border-l-accent bg-secondary/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display uppercase">
                <UserRound className="h-4 w-4 text-accent" /> Resumo do relatório
              </CardTitle>
              {dados.responsavelNome && (
                <p className="text-xs text-muted-foreground">
                  Responsável técnico: {dados.responsavelNome}
                </p>
              )}
              {dados.unidades.length > 0 && (
                <p className="text-xs font-semibold uppercase text-accent">
                  {dados.unidades.join(" · ")}
                </p>
              )}

            </CardHeader>
            <CardContent className="space-y-3">
              {dados.resumo_ia ? (
                <>
                  <p className="font-display text-base font-semibold uppercase">
                    {dados.resumo_ia.titulo}
                  </p>
                  <p className="text-sm leading-relaxed">{dados.resumo_ia.resumo}</p>
                  {dados.resumo_ia.pontos.length > 0 && (
                    <ul className="space-y-1.5">
                      {dados.resumo_ia.pontos.map((ponto, indice) => (
                        <li key={indice} className="flex gap-2 text-sm leading-relaxed">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{ponto}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {dados.souEngenheiro
                    ? "Nenhum resumo gerado para este relatório ainda."
                    : "Resumo indisponível para este relatório."}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Resumo elaborado a partir do relatório da visita técnica.
              </p>

              {dados.souEngenheiro && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={gerando}
                  onClick={async () => {
                    setGerando(true);
                    try {
                      await gerarFn({ data: { atualizacaoId: id } });
                      await consulta.refetch();
                      toast.success("Resumo atualizado!");
                    } catch (erro) {
                      toast.error("Não foi possível gerar o resumo", {
                        description: erro instanceof Error ? erro.message : undefined,
                      });
                    } finally {
                      setGerando(false);
                    }
                  }}
                >
                  {gerando ? "Gerando..." : dados.resumo_ia ? "Gerar novamente" : "Gerar resumo"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {Object.keys(dados.resumosUnidades).length > 0 && (
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display uppercase">Resumos por casa</CardTitle>
              <p className="text-xs text-muted-foreground">
                {dados.souEngenheiro
                  ? "Cada cliente vê apenas o resumo das casas vinculadas a ele."
                  : "Um resumo para cada casa vinculada ao seu cadastro."}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {Object.entries(dados.resumosUnidades).map(([unidade, resumo]) => (
                <div key={unidade} className="space-y-2 rounded-sm border border-border p-3">
                  <p className="font-display text-sm font-semibold uppercase text-accent">
                    {unidade}
                  </p>
                  <p className="text-sm font-semibold">{resumo.titulo}</p>
                  <p className="text-sm leading-relaxed">{resumo.resumo}</p>
                  {resumo.pontos.length > 0 && (
                    <ul className="space-y-1.5">
                      {resumo.pontos.map((ponto, indice) => (
                        <li key={indice} className="flex gap-2 text-sm leading-relaxed">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{ponto}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {dados.excel_dados && dados.souEngenheiro && (
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display uppercase">
                <FileSpreadsheet className="h-4 w-4 text-accent" />
                {dados.excel_nome ?? "Relatório"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dados.excel_dados.aviso && (
                <p className="mb-3 rounded-sm bg-secondary p-2 text-xs text-muted-foreground">
                  {dados.excel_dados.aviso}
                </p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {dados.excel_dados.colunas.map((coluna) => (
                        <TableHead key={coluna} className="whitespace-nowrap uppercase">
                          {coluna}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dados.excel_dados.linhas.map((linha, indice) => (
                      <TableRow key={indice}>
                        {dados.excel_dados!.colunas.map((coluna) => (
                          <TableCell key={coluna} className="whitespace-nowrap">
                            {linha[coluna]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {dados.excelUrl && (
                <Button asChild variant="outline" className="mt-3">
                  <a href={dados.excelUrl} target="_blank" rel="noreferrer">
                    Baixar planilha original
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
