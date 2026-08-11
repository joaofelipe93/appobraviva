import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BarraProgresso } from "@/components/ProgressoObra";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { criarObra, listarMinhasObras, meuPerfil, registrarPerfil } from "@/lib/obras.functions";
import { criarObraSchema, progressoDasEtapas } from "@/lib/obras.schemas";
import type { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel de obras — ObraViva" },
      {
        name: "description",
        content: "Veja suas obras, o progresso das etapas e publique novas atualizações da visita.",
      },
      { property: "og:title", content: "Painel de obras — ObraViva" },
      { property: "og:description", content: "Obras, progresso e atualizações em um só painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const perfilFn = useServerFn(meuPerfil);
  const obrasFn = useServerFn(listarMinhasObras);

  const perfil = useQuery({ queryKey: ["perfil"], queryFn: () => perfilFn({}) });
  const obras = useQuery({
    queryKey: ["obras"],
    queryFn: () => obrasFn({}),
    enabled: !!perfil.data?.papel,
  });

  if (perfil.isLoading) {
    return (
      <AppShell titulo="Painel">
        <Skeleton className="h-32 w-full" />
      </AppShell>
    );
  }

  if (!perfil.data?.papel) return <Onboarding />;

  const engenheiro = perfil.data.papel === "engenheiro";

  return (
    <AppShell
      titulo={engenheiro ? "Minhas obras" : "Obras que acompanho"}
      descricao={
        engenheiro
          ? `Olá, ${perfil.data.nome || "engenheiro"}. Gerencie obras, etapas e publique atualizações.`
          : `Olá, ${perfil.data.nome || "cliente"}. Acompanhe o andamento das suas obras.`
      }
      acao={engenheiro ? <NovaObra /> : undefined}
    >
      {obras.isLoading && <Skeleton className="h-32 w-full" />}

      {obras.data && obras.data.length === 0 && (
        <Card className="rounded-sm border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            {engenheiro
              ? "Nenhuma obra cadastrada ainda. Crie a primeira obra para começar a publicar atualizações."
              : "Você ainda não está vinculado a nenhuma obra. Peça ao engenheiro responsável para vincular o seu e-mail."}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(obras.data ?? []).map((obra) => {
          const progresso = progressoDasEtapas(obra.etapas);
          return (
            <Link
              key={obra.id}
              to="/obras/$id"
              params={{ id: obra.id }}
              className="block rounded-sm border-l-4 border-accent bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold uppercase leading-tight">
                    {obra.nome}
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> {obra.endereco || "Endereço não informado"}
                  </p>
                </div>
                {!obra.souEngenheiro && obra.naoLidas > 0 && (
                  <Badge className="bg-accent text-accent-foreground">
                    {obra.naoLidas} nova{obra.naoLidas > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <BarraProgresso valor={progresso} />
                <span className="font-display text-lg font-bold">{progresso}%</span>
              </div>

              <p className="mt-3 flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {obra.ultimaAtualizacao
                  ? `Última visita: ${new Date(`${obra.ultimaAtualizacao}T12:00:00`).toLocaleDateString("pt-BR")}`
                  : "Sem atualizações publicadas"}
                {" · "}
                {obra.totalAtualizacoes} atualizaç{obra.totalAtualizacoes === 1 ? "ão" : "ões"}
              </p>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

function Onboarding() {
  const registrar = useServerFn(registrarPerfil);
  const queryClient = useQueryClient();
  const [papel, setPapel] = useState<"engenheiro" | "cliente">("engenheiro");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    try {
      const { data } = await supabase.auth.getUser();
      const metadados = data.user?.user_metadata ?? {};
      await registrar({
        data: {
          nome: nome.trim() || String(metadados["nome"] ?? "").trim() || "Usuário",
          papel: (metadados["papel"] as "engenheiro" | "cliente" | undefined) ?? papel,
        },
      });
      await queryClient.invalidateQueries();
      toast.success("Perfil configurado!");
    } catch (erro) {
      toast.error("Não foi possível salvar o perfil", {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell titulo="Complete seu perfil" descricao="Só falta dizer quem você é.">
      <Card className="max-w-md rounded-sm border-t-4 border-t-accent">
        <CardHeader>
          <CardTitle className="font-display uppercase">Seus dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome-perfil">Nome completo</Label>
              <Input
                id="nome-perfil"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Eu sou</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["engenheiro", "cliente"] as const).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setPapel(opcao)}
                    className={`rounded-sm border-2 px-3 py-2 text-sm font-semibold uppercase ${
                      papel === opcao
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {opcao === "engenheiro" ? "Engenheiro" : "Cliente"}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={salvando} className="w-full">
              {salvando ? "Salvando..." : "Salvar e continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function NovaObra() {
  const criar = useServerFn(criarObra);
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);

  const mutation = useMutation({
    mutationFn: (valores: z.infer<typeof criarObraSchema>) => criar({ data: valores }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["obras"] });
      setAberto(false);
      toast.success("Obra criada com as etapas padrão.");
    },
    onError: (erro) => toast.error("Erro ao criar obra", { description: erro.message }),
  });

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const parsed = criarObraSchema.safeParse({
      nome: dados.get("nome"),
      endereco: dados.get("endereco") ?? "",
      data_inicio: String(dados.get("data_inicio") ?? "") || undefined,
      previsao_termino: String(dados.get("previsao_termino") ?? "") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Nova obra
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Cadastrar obra</DialogTitle>
          <DialogDescription>
            As sete etapas padrão são criadas automaticamente e podem ser ajustadas depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="obra-nome">Nome da obra</Label>
            <Input id="obra-nome" name="nome" required maxLength={140} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="obra-endereco">Endereço</Label>
            <Input id="obra-endereco" name="endereco" maxLength={240} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="obra-inicio">Início</Label>
              <Input id="obra-inicio" name="data_inicio" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="obra-fim">Previsão de término</Label>
              <Input id="obra-fim" name="previsao_termino" type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Criando..." : "Criar obra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
