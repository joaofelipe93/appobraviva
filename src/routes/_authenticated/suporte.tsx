import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
import { LifeBuoy, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { criarChamado, listarChamados, minhasCasas } from "@/lib/suporte.functions";
import {
  PRIORIDADES,
  STATUS,
  rotuloPrioridade,
  rotuloStatus,
  criarChamadoSchema,
} from "@/lib/suporte.schemas";
import type { SuportePrioridade, SuporteStatus } from "@/lib/suporte.schemas";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte ao cliente — ObraViva" },
      {
        name: "description",
        content:
          "Abra um chamado de suporte da sua casa e acompanhe as respostas da equipe do ObraViva.",
      },
      { property: "og:title", content: "Suporte ao cliente — ObraViva" },
      { property: "og:description", content: "Chamados de suporte e respostas da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Suporte,
});

export function corDoStatus(status: SuporteStatus): string {
  if (status === "aberto") return "bg-accent text-accent-foreground";
  if (status === "em_atendimento") return "bg-primary text-primary-foreground";
  if (status === "resolvido") return "bg-emerald-600 text-white";
  return "bg-muted text-muted-foreground";
}

export function corDaPrioridade(prioridade: SuportePrioridade): string {
  if (prioridade === "alta") return "border-red-600 text-red-700";
  if (prioridade === "media") return "border-amber-500 text-amber-700";
  return "border-border text-muted-foreground";
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Suporte() {
  const listarFn = useServerFn(listarChamados);
  const casasFn = useServerFn(minhasCasas);
  const criarFn = useServerFn(criarChamado);
  const queryClient = useQueryClient();

  const lista = useQuery({ queryKey: ["suporte", "chamados"], queryFn: () => listarFn({}) });
  const casas = useQuery({ queryKey: ["suporte", "casas"], queryFn: () => casasFn({}) });

  const [aberto, setAberto] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<SuportePrioridade>("media");
  const [casaSelecionada, setCasaSelecionada] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | SuporteStatus>("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<"todas" | SuportePrioridade>("todas");

  const opcoesCasas = useMemo(
    () =>
      (casas.data ?? []).flatMap((obra) =>
        obra.unidades.length > 0
          ? obra.unidades.map((unidade) => ({
              valor: `${obra.id}|${unidade}`,
              rotulo: `${obra.nome} — ${unidade}`,
            }))
          : [{ valor: `${obra.id}|`, rotulo: obra.nome }],
      ),
    [casas.data],
  );

  const criarMutation = useMutation({
    mutationFn: async () => {
      const [obraId, unidade] = casaSelecionada ? casaSelecionada.split("|") : ["", ""];
      const validado = criarChamadoSchema.parse({
        assunto,
        descricao,
        prioridade,
        ...(obraId ? { obraId } : {}),
        ...(unidade ? { unidade } : {}),
        anexos: [],
      });

      const { data: sessao } = await supabase.auth.getUser();
      const userId = sessao.user?.id;
      const anexos: string[] = [];
      for (const [indice, foto] of fotos.entries()) {
        setEnviando(true);
        const comprimida = await imageCompression(foto, {
          maxSizeMB: 1.2,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
        const path = `${userId}/${crypto.randomUUID()}-${indice}.jpg`;
        const { error } = await supabase.storage
          .from("suporte")
          .upload(path, comprimida, { contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        anexos.push(path);
      }

      return criarFn({ data: { ...validado, anexos } });
    },
    onSuccess: async () => {
      toast.success("Chamado aberto! A equipe vai responder por aqui.");
      setAberto(false);
      setAssunto("");
      setDescricao("");
      setPrioridade("media");
      setCasaSelecionada("");
      setFotos([]);
      await queryClient.invalidateQueries({ queryKey: ["suporte"] });
    },
    onError: (erro: unknown) =>
      toast.error(erro instanceof Error ? erro.message : "Não foi possível abrir o chamado."),
    onSettled: () => setEnviando(false),
  });

  const admin = lista.data?.admin ?? false;
  const papel = lista.data?.papel ?? null;

  const chamados = (lista.data?.chamados ?? []).filter((chamado) => {
    if (filtroStatus !== "todos" && chamado.status !== filtroStatus) return false;
    if (filtroPrioridade !== "todas" && chamado.prioridade !== filtroPrioridade) return false;
    if (!busca.trim()) return true;
    const termo = busca.trim().toLowerCase();
    return [chamado.assunto, chamado.unidade, chamado.obraNome, chamado.clienteNome]
      .filter(Boolean)
      .some((valor) => String(valor).toLowerCase().includes(termo));
  });

  if (lista.isLoading) {
    return (
      <AppShell titulo="Suporte">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!admin && papel === "engenheiro") {
    return (
      <AppShell
        titulo="Suporte"
        descricao="Esta área é do atendimento entre clientes e administração."
      >
        <Button asChild variant="outline">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo="Suporte"
      descricao={
        admin
          ? "Chamados abertos pelos clientes — responda e encerre quando concluído."
          : "Abra um chamado e acompanhe as respostas da equipe."
      }
      acao={
        !admin ? (
          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Novo chamado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo chamado</DialogTitle>
                <DialogDescription>
                  Conte o que está acontecendo. Você pode anexar fotos.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input
                    id="assunto"
                    value={assunto}
                    maxLength={120}
                    onChange={(e) => setAssunto(e.target.value)}
                    placeholder="Ex.: Infiltração na parede da sala"
                  />
                </div>

                {opcoesCasas.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Obra / casa</Label>
                    <Select value={casaSelecionada} onValueChange={setCasaSelecionada}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a casa" />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesCasas.map((opcao) => (
                          <SelectItem key={opcao.valor} value={opcao.valor}>
                            {opcao.rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select
                    value={prioridade}
                    onValueChange={(valor) => setPrioridade(valor as SuportePrioridade)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map((valor) => (
                        <SelectItem key={valor} value={valor}>
                          {rotuloPrioridade[valor]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    rows={5}
                    maxLength={4000}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Detalhe o problema, quando começou e onde acontece."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="anexos">Fotos (opcional)</Label>
                  <Input
                    id="anexos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFotos([...(e.target.files ?? [])].slice(0, 8))}
                  />
                  {fotos.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {fotos.length} foto(s) selecionada(s) — serão comprimidas no envio.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => criarMutation.mutate()}
                  disabled={criarMutation.isPending || enviando}
                >
                  {criarMutation.isPending ? "Enviando..." : "Abrir chamado"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={admin ? "Buscar por assunto, cliente, casa ou obra" : "Buscar chamado"}
          />
        </div>
        <Select
          value={filtroStatus}
          onValueChange={(valor) => setFiltroStatus(valor as "todos" | SuporteStatus)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            {STATUS.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {rotuloStatus[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filtroPrioridade}
          onValueChange={(valor) => setFiltroPrioridade(valor as "todas" | SuportePrioridade)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda prioridade</SelectItem>
            {PRIORIDADES.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {rotuloPrioridade[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chamados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {admin
                ? "Nenhum chamado por aqui."
                : "Você ainda não abriu chamados. Use o botão “Novo chamado”."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {chamados.map((chamado) => (
            <Link key={chamado.id} to="/suporte/$id" params={{ id: chamado.id }}>
              <Card className="transition-colors hover:border-accent">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{chamado.assunto}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={corDaPrioridade(chamado.prioridade)}>
                        {rotuloPrioridade[chamado.prioridade]}
                      </Badge>
                      <Badge className={corDoStatus(chamado.status)}>
                        {rotuloStatus[chamado.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {chamado.clienteNome && <span>Cliente: {chamado.clienteNome}</span>}
                    {chamado.obraNome && <span>{chamado.obraNome}</span>}
                    {chamado.unidade && <span>{chamado.unidade}</span>}
                    <span>Última movimentação: {dataHora(chamado.ultima_mensagem_em)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
