import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, FileSpreadsheet, Images, Plus, Trash2, UserPlus, Video } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BarraProgresso, TimelineEtapas } from "@/components/ProgressoObra";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adicionarEtapa,
  desvincularCliente,
  obterObra,
  removerEtapa,
  salvarEtapa,
  vincularCliente,
} from "@/lib/obras.functions";
import {
  STATUS_LABEL,
  formatarCpf,
  progressoDasEtapas,
  type EtapaStatus,
} from "@/lib/obras.schemas";

export const Route = createFileRoute("/_authenticated/obras/$id")({
  head: () => ({
    meta: [
      { title: "Obra — ObraViva" },
      {
        name: "description",
        content: "Progresso das etapas, clientes vinculados e linha do tempo das atualizações da obra.",
      },
      { property: "og:title", content: "Obra — ObraViva" },
      { property: "og:description", content: "Etapas, progresso e atualizações da obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ObraPage,
});

function ObraPage() {
  const { id } = Route.useParams();
  const obterFn = useServerFn(obterObra);
  const queryClient = useQueryClient();

  const consulta = useQuery({
    queryKey: ["obra", id],
    queryFn: () => obterFn({ data: { obraId: id } }),
  });

  async function recarregar() {
    await queryClient.invalidateQueries({ queryKey: ["obra", id] });
    await queryClient.invalidateQueries({ queryKey: ["obras"] });
  }

  if (consulta.isLoading) {
    return (
      <AppShell titulo="Carregando obra">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (consulta.error || !consulta.data) {
    return (
      <AppShell titulo="Obra indisponível" descricao="Você não tem acesso a esta obra.">
        <Button asChild variant="outline">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </AppShell>
    );
  }

  const { obra, etapas, clientes, atualizacoes, souEngenheiro, urls } = consulta.data;
  const progresso = progressoDasEtapas(etapas);

  return (
    <AppShell
      titulo={obra.nome}
      descricao={obra.endereco || "Endereço não informado"}
      acao={
        souEngenheiro ? (
          <Button asChild>
            <Link to="/obras/$id/nova-atualizacao" params={{ id }}>
              <Plus className="mr-1 h-4 w-4" /> Nova atualização
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="rounded-sm border-t-4 border-t-accent">
            <CardHeader className="pb-2">
              <CardTitle className="font-display uppercase">Progresso geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <BarraProgresso valor={progresso} />
                <span className="font-display text-3xl font-bold">{progresso}%</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                <span>
                  Início:{" "}
                  {obra.data_inicio
                    ? new Date(`${obra.data_inicio}T12:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </span>
                <span>
                  Previsão:{" "}
                  {obra.previsao_termino
                    ? new Date(`${obra.previsao_termino}T12:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </span>
                <span>{etapas.length} etapas</span>
                <span>{atualizacoes.length} atualizações</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display uppercase">Linha do tempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {atualizacoes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma atualização publicada até agora.
                </p>
              )}
              {atualizacoes.map((item) => (
                <Link
                  key={item.id}
                  to="/atualizacoes/$id"
                  params={{ id: item.id }}
                  className="block rounded-sm border border-border bg-background p-3 transition-colors hover:border-accent"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 font-display text-lg font-bold uppercase">
                      <CalendarDays className="h-4 w-4 text-accent" />
                      {new Date(`${item.data_visita}T12:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                    {!souEngenheiro && !item.lida && (
                      <Badge className="bg-accent text-accent-foreground">Nova</Badge>
                    )}
                    {item.excel_nome && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileSpreadsheet className="h-3.5 w-3.5" /> relatório
                      </span>
                    )}
                    {item.fotos.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Images className="h-3.5 w-3.5" /> {item.fotos.length}
                      </span>
                    )}
                    {item.videos > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Video className="h-3.5 w-3.5" /> {item.videos}
                      </span>
                    )}
                  </div>
                  {item.observacoes && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.observacoes}
                    </p>
                  )}
                  {item.fotos.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {item.fotos.slice(0, 4).map((path) => (
                        <img
                          key={path}
                          src={urls[path]}
                          alt={`Foto da visita de ${item.data_visita}`}
                          loading="lazy"
                          className="h-16 w-16 rounded-sm border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display uppercase">Etapas</CardTitle>
            </CardHeader>
            <CardContent>
              {souEngenheiro ? (
                <EtapasEditaveis obraId={id} etapas={etapas} onChange={recarregar} />
              ) : (
                <TimelineEtapas etapas={etapas} />
              )}
            </CardContent>
          </Card>

          {souEngenheiro && (
            <Card className="rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="font-display uppercase">Clientes vinculados</CardTitle>
              </CardHeader>
              <CardContent>
                <Clientes obraId={id} clientes={clientes} onChange={recarregar} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function EtapasEditaveis({
  obraId,
  etapas,
  onChange,
}: {
  obraId: string;
  etapas: { id: string; nome: string; status: EtapaStatus; data_conclusao: string | null }[];
  onChange: () => Promise<void>;
}) {
  const salvar = useServerFn(salvarEtapa);
  const adicionar = useServerFn(adicionarEtapa);
  const remover = useServerFn(removerEtapa);
  const [nova, setNova] = useState("");

  async function mudarStatus(etapaId: string, status: EtapaStatus) {
    try {
      await salvar({ data: { etapaId, status } });
      await onChange();
    } catch (erro) {
      toast.error("Não foi possível atualizar a etapa", {
        description: erro instanceof Error ? erro.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-3">
      {etapas.map((etapa) => (
        <div key={etapa.id} className="rounded-sm border border-border p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{etapa.nome}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={async () => {
                await remover({ data: { etapaId: etapa.id } });
                await onChange();
              }}
              aria-label={`Remover etapa ${etapa.nome}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={etapa.status}
            onValueChange={(valor) => mudarStatus(etapa.id, valor as EtapaStatus)}
          >
            <SelectTrigger className="mt-1 h-9 rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as EtapaStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {etapa.data_conclusao && (
            <p className="mt-1 text-xs text-muted-foreground">
              Concluída em{" "}
              {new Date(`${etapa.data_conclusao}T12:00:00`).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      ))}

      <form
        className="flex gap-2"
        onSubmit={async (evento) => {
          evento.preventDefault();
          if (nova.trim().length < 2) return;
          try {
            await adicionar({ data: { obraId, nome: nova.trim() } });
            setNova("");
            await onChange();
          } catch (erro) {
            toast.error("Não foi possível adicionar a etapa", {
              description: erro instanceof Error ? erro.message : undefined,
            });
          }
        }}
      >
        <Input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova etapa"
          maxLength={120}
          className="rounded-sm"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Adicionar etapa">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function Clientes({
  obraId,
  clientes,
  onChange,
}: {
  obraId: string;
  clientes: {
    id: string;
    nome: string;
    email: string;
    cpf: string | null;
    unidade: string | null;
    unidadeChave: string;
    percentual: number | null;
    contrato_ok: boolean;
  }[];
  onChange: () => Promise<void>;
}) {
  const vincular = useServerFn(vincularCliente);
  const desvincular = useServerFn(desvincularCliente);
  const [cpf, setCpf] = useState("");
  const [unidade, setUnidade] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="space-y-3">
      {clientes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum cliente vinculado. O cliente precisa ter uma conta criada no ObraViva.
        </p>
      )}
      {clientes.map((cliente) => (
        <div
          key={`${cliente.id}-${cliente.unidadeChave}`}
          className="flex items-center justify-between gap-2 rounded-sm border border-border p-2"
        >
          <div>
            <p className="font-semibold">{cliente.nome || "Cliente"}</p>
            <p className="text-xs text-muted-foreground">
              {cliente.cpf ? formatarCpf(cliente.cpf) : cliente.email}
            </p>
            <p className="text-xs font-semibold uppercase text-accent">
              {cliente.unidade ? cliente.unidade : "Obra inteira"}
              {cliente.percentual !== null ? ` · ${cliente.percentual}% da cota` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label={`Remover ${cliente.nome} de ${cliente.unidade ?? "obra inteira"}`}
            onClick={async () => {
              await desvincular({
                data: { obraId, clienteId: cliente.id, unidade: cliente.unidadeChave },
              });
              await onChange();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}


      <form
        className="space-y-2"
        onSubmit={async (evento) => {
          evento.preventDefault();
          setEnviando(true);
          try {
            const resultado = await vincular({ data: { obraId, cpf, unidade } });
            setCpf("");
            setUnidade("");
            await onChange();
            toast.success(`${resultado.nome || "Cliente"} vinculado à obra.`);
          } catch (erro) {
            toast.error("Não foi possível vincular", {
              description: erro instanceof Error ? erro.message : undefined,
            });
          } finally {
            setEnviando(false);
          }
        }}
      >
        <Label htmlFor="cpf-cliente">CPF do cliente</Label>
        <div className="flex gap-2">
          <Input
            id="cpf-cliente"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            required
            className="rounded-sm"
          />
          <Button type="submit" variant="outline" size="icon" disabled={enviando} aria-label="Vincular cliente">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        <Label htmlFor="unidade-cliente">Casa / unidade do cliente (opcional)</Label>
        <Input
          id="unidade-cliente"
          placeholder="Ex: Casa 1"
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
          maxLength={60}
          className="rounded-sm"
        />
        <p className="text-xs text-muted-foreground">
          Com a casa informada, o cliente vê apenas o resumo e as mídias da casa dele. Em branco, ele
          vê a obra inteira.
        </p>
      </form>
    </div>
  );
}
