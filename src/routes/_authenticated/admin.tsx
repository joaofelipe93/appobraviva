import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  adicionarUnidadePreCadastro,
  criarPreCadastro,
  importarInvestidoresExcel,
  listarObrasAdmin,
  listarPreCadastros,
  meuPerfil,
  removerPreCadastro,
  removerUnidadePreCadastro,
} from "@/lib/obras.functions";
import { formatarCpf, normalizarUnidade, preCadastroSchema } from "@/lib/obras.schemas";
import type { RelatorioImportacao } from "@/lib/obras.schemas";
import type { z } from "zod";

type PreCadastroEntrada = z.infer<typeof preCadastroSchema>;


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — ObraViva" },
      {
        name: "description",
        content:
          "Libere o acesso de engenheiros e clientes fazendo o pré-cadastro por CPF antes da criação da conta.",
      },
      { property: "og:title", content: "Administração — ObraViva" },
      {
        property: "og:description",
        content: "Pré-cadastro de engenheiros e clientes autorizados a acessar o ObraViva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type ObraOpcao = { id: string; nome: string };

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type CasaForm = {
  obraId: string;
  unidade: string;
  percentual: string;
  contrato_ok: boolean;
};

function Admin() {
  const perfilFn = useServerFn(meuPerfil);
  const perfil = useQuery({ queryKey: ["meu-perfil"], queryFn: () => perfilFn({}) });

  if (perfil.isLoading) {
    return (
      <AppShell titulo="Administração">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (perfil.data?.papel !== "admin") {
    return (
      <AppShell
        titulo="Acesso restrito"
        descricao="Esta área é exclusiva do administrador do ObraViva."
      >
        <Button asChild variant="outline">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </AppShell>
    );
  }

  return <AdminPainel />;
}

function AdminPainel() {
  const listarFn = useServerFn(listarPreCadastros);
  const criarFn = useServerFn(criarPreCadastro);
  const removerFn = useServerFn(removerPreCadastro);
  const obrasFn = useServerFn(listarObrasAdmin);
  const queryClient = useQueryClient();
  const [papel, setPapel] = useState<"engenheiro" | "cliente">("cliente");
  const [cpf, setCpf] = useState("");
  const [casas, setCasas] = useState<CasaForm[]>([]);
  const [novaCasa, setNovaCasa] = useState<CasaForm>({
    obraId: "",
    unidade: "",
    percentual: "",
    contrato_ok: false,
  });

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<
    "todos" | "cliente" | "engenheiro" | "ativos" | "pendentes"
  >("todos");

  const lista = useQuery({ queryKey: ["pre-cadastros"], queryFn: () => listarFn({}) });
  const obras = useQuery({ queryKey: ["obras-admin"], queryFn: () => obrasFn({}) });
  const opcoes: ObraOpcao[] = obras.data ?? [];
  const nomeDaObra = (id: string) => opcoes.find((o) => o.id === id)?.nome ?? "Obra";

  const resultados = useMemo(() => {
    const termos = semAcento(busca)
      .split(/\s+/)
      .map((t) => t.replace(/[.\-()\s]/g, ""))
      .filter(Boolean);

    return (lista.data ?? []).filter((item) => {
      if (filtro === "cliente" || filtro === "engenheiro") {
        if (item.papel !== filtro) return false;
      }
      if (filtro === "ativos" && !item.usado_em) return false;
      if (filtro === "pendentes" && item.usado_em) return false;
      if (termos.length === 0) return true;

      const alvo = semAcento(
        [
          item.nome,
          item.cpf,
          formatarCpf(item.cpf),
          item.email,
          item.telefone ?? "",
          item.papel,
          ...item.unidades.flatMap((u) => [u.unidade, u.obraNome]),
        ].join(" "),
      ).replace(/[.\-()\s]/g, "");

      return termos.every((termo) => alvo.includes(termo));
    });
  }, [lista.data, busca, filtro]);


  const criar = useMutation({
    mutationFn: (valores: PreCadastroEntrada) => criarFn({ data: valores }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
      setCpf("");
      setCasas([]);
      toast.success("Pré-cadastro liberado.");
    },
    onError: (erro) => toast.error("Não foi possível liberar", { description: erro.message }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
      toast.success("Pré-cadastro removido.");
    },
    onError: (erro) => toast.error("Erro ao remover", { description: erro.message }),
  });

  function adicionarCasaNaLista() {
    if (!novaCasa.obraId) {
      toast.error("Escolha a obra da casa.");
      return;
    }
    const unidade = normalizarUnidade(novaCasa.unidade) ?? "";
    const repetida = casas.some((c) => c.obraId === novaCasa.obraId && c.unidade === unidade);
    if (repetida) {
      toast.error("Esta casa já está na lista.");
      return;
    }
    setCasas((atual) => [...atual, { ...novaCasa, unidade }]);
    setNovaCasa({ obraId: novaCasa.obraId, unidade: "", percentual: "", contrato_ok: false });
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const parsed = preCadastroSchema.safeParse({
      nome: dados.get("nome"),
      cpf: String(dados.get("cpf") ?? ""),
      email: dados.get("email"),
      telefone: String(dados.get("telefone") ?? ""),
      papel,
      unidades:
        papel === "cliente"
          ? casas.map((casa) => ({
              obraId: casa.obraId,
              unidade: casa.unidade,
              percentual: casa.percentual === "" ? null : Number(casa.percentual),
              contrato_ok: casa.contrato_ok,
            }))
          : [],
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    criar.mutate(parsed.data);
    form.reset();
  }

  if (lista.isError) {
    return (
      <AppShell titulo="Administração">
        <Card className="rounded-sm border-destructive">
          <CardContent className="py-10 text-center text-muted-foreground">
            {lista.error instanceof Error ? lista.error.message : "Acesso não permitido."}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo="Administração"
      descricao="Somente CPFs liberados aqui conseguem criar conta no ObraViva."
      acao={
        <Button asChild variant="outline">
          <Link to="/almoxarifado">Almoxarifado</Link>
        </Button>
      }
    >
        <ImportarPlanilha
          onChange={async () => {
            await queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
            await queryClient.invalidateQueries({ queryKey: ["obras-admin"] });
          }}
        />

      <Card className="mt-6 rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-display uppercase">Obras cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {opcoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {opcoes.map((obra) => (
                <Button key={obra.id} asChild variant="outline" size="sm">
                  <Link to="/obras/$id" params={{ id: obra.id }}>
                    {obra.nome}
                  </Link>
                </Button>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Abra a obra para editar os dados cadastrais ou excluí-la.
          </p>
        </CardContent>
      </Card>



      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Card className="rounded-sm border-t-4 border-t-accent">
          <CardHeader>
            <CardTitle className="font-display uppercase">Novo pré-cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviar} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(["engenheiro", "cliente"] as const).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setPapel(opcao)}
                    className={`rounded-sm border-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      papel === opcao
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {opcao === "engenheiro" ? "Engenheiro" : "Cliente"}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <Label htmlFor="pc-nome">Nome completo</Label>
                <Input id="pc-nome" name="nome" required maxLength={120} className="rounded-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pc-cpf">CPF</Label>
                <Input
                  id="pc-cpf"
                  name="cpf"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pc-email">E-mail</Label>
                <Input
                  id="pc-email"
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pc-telefone">Telefone (opcional)</Label>
                <Input
                  id="pc-telefone"
                  name="telefone"
                  maxLength={30}
                  placeholder="(84) 90000-0000"
                  className="rounded-sm"
                />
              </div>

              {papel === "cliente" && (
                <div className="space-y-3 rounded-sm border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Casas do investidor
                  </p>

                  {casas.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma casa adicionada. O cliente pode ser vinculado depois.
                    </p>
                  )}
                  {casas.map((casa, indice) => (
                    <div
                      key={`${casa.obraId}-${casa.unidade}`}
                      className="flex items-start justify-between gap-2 rounded-sm bg-muted/40 p-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{casa.unidade || "Obra inteira"}</p>
                        <p className="text-muted-foreground">{nomeDaObra(casa.obraId)}</p>
                        <p className="text-muted-foreground">
                          {casa.percentual ? `${casa.percentual}% da cota · ` : ""}
                          {casa.contrato_ok ? "Contrato assinado" : "Contrato pendente"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label="Remover casa da lista"
                        onClick={() => setCasas((atual) => atual.filter((_, i) => i !== indice))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  <div className="space-y-2 border-t border-border pt-2">
                    <div className="space-y-1">
                      <Label htmlFor="pc-obra">Obra</Label>
                      <select
                        id="pc-obra"
                        value={novaCasa.obraId}
                        onChange={(e) =>
                          setNovaCasa((atual) => ({ ...atual, obraId: e.target.value }))
                        }
                        className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Selecione a obra</option>
                        {opcoes.map((obra) => (
                          <option key={obra.id} value={obra.id}>
                            {obra.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="pc-unidade">Casa / unidade</Label>
                        <Input
                          id="pc-unidade"
                          value={novaCasa.unidade}
                          onChange={(e) =>
                            setNovaCasa((atual) => ({ ...atual, unidade: e.target.value }))
                          }
                          maxLength={60}
                          placeholder="Ex.: Casa 1"
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pc-percentual">% da cota</Label>
                        <Input
                          id="pc-percentual"
                          value={novaCasa.percentual}
                          onChange={(e) =>
                            setNovaCasa((atual) => ({ ...atual, percentual: e.target.value }))
                          }
                          inputMode="decimal"
                          placeholder="100"
                          className="rounded-sm"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={novaCasa.contrato_ok}
                        onChange={(e) =>
                          setNovaCasa((atual) => ({ ...atual, contrato_ok: e.target.checked }))
                        }
                        className="h-4 w-4 rounded-sm border-input"
                      />
                      Contrato assinado
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={adicionarCasaNaLista}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar casa
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={criar.isPending}>
                <UserPlus className="mr-1 h-4 w-4" />
                {criar.isPending ? "Liberando..." : "Liberar acesso"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-display uppercase">Pessoas liberadas</CardTitle>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {resultados.length} de {(lista.data ?? []).length}
              </span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, CPF, e-mail, telefone, casa ou obra"
                aria-label="Buscar pessoa liberada"
                className="rounded-sm pl-9 pr-9"
              />
              {busca !== "" && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setBusca("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["todos", "Todos"],
                  ["cliente", "Clientes"],
                  ["engenheiro", "Engenheiros"],
                  ["ativos", "Conta ativa"],
                  ["pendentes", "Aguardando"],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFiltro(valor)}
                  className={`rounded-sm border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    filtro === valor
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lista.isLoading && <Skeleton className="h-24 w-full" />}
            {lista.data && lista.data.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum pré-cadastro ainda. Libere o primeiro engenheiro ao lado.
              </p>
            )}
            {lista.data && lista.data.length > 0 && resultados.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma pessoa encontrada para esta busca.
              </p>
            )}
            {resultados.map((item) => (

              <div key={item.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatarCpf(item.cpf)} · {item.email}
                      {item.telefone ? ` · ${item.telefone}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase">
                      {item.papel === "engenheiro" ? "Engenheiro" : "Cliente"}
                    </Badge>
                    <Badge
                      className={
                        item.usado_em
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground"
                      }
                    >
                      {item.usado_em ? "Conta ativa" : "Aguardando cadastro"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remover.mutate(item.id)}
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {item.papel === "cliente" && (
                  <CasasDoCliente
                    preCadastroId={item.id}
                    casas={item.unidades}
                    obras={opcoes}
                    onChange={() =>
                      queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] })
                    }
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function CasasDoCliente({
  preCadastroId,
  casas,
  obras,
  onChange,
}: {
  preCadastroId: string;
  casas: {
    id: string;
    obraId: string;
    obraNome: string;
    unidade: string;
    percentual: number | null;
    contrato_ok: boolean;
  }[];
  obras: ObraOpcao[];
  onChange: () => Promise<void> | void;
}) {
  const adicionarFn = useServerFn(adicionarUnidadePreCadastro);
  const removerFn = useServerFn(removerUnidadePreCadastro);
  const [aberto, setAberto] = useState(false);
  const [obraId, setObraId] = useState("");
  const [unidade, setUnidade] = useState("");
  const [percentual, setPercentual] = useState("");
  const [contratoOk, setContratoOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {casas.length === 0 && (
          <span className="text-xs text-muted-foreground">Nenhuma casa vinculada.</span>
        )}
        {casas.map((casa) => (
          <span
            key={casa.id}
            className="flex items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs"
          >
            <span className="font-semibold">{casa.unidade || "Obra inteira"}</span>
            <span className="text-muted-foreground">· {casa.obraNome}</span>
            {casa.percentual !== null && (
              <span className="text-muted-foreground">· {casa.percentual}%</span>
            )}
            <span className={casa.contrato_ok ? "text-accent" : "text-muted-foreground"}>
              · {casa.contrato_ok ? "contrato ok" : "contrato pendente"}
            </span>
            {!casa.id.startsWith("legado-") && (
              <button
                type="button"
                aria-label={`Remover ${casa.unidade || "vínculo"}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  try {
                    await removerFn({ data: { id: casa.id } });
                    await onChange();
                  } catch (erro) {
                    toast.error("Não foi possível remover", {
                      description: erro instanceof Error ? erro.message : undefined,
                    });
                  }
                }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setAberto((valor) => !valor)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Casa
        </Button>
      </div>

      {aberto && (
        <div className="grid gap-2 rounded-sm border border-dashed border-border p-2 sm:grid-cols-[1fr_140px_100px_auto]">
          <select
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
            aria-label="Obra"
            className="h-9 rounded-sm border border-input bg-background px-2 text-sm"
          >
            <option value="">Obra...</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.nome}
              </option>
            ))}
          </select>
          <Input
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            placeholder="Casa 1"
            aria-label="Casa / unidade"
            className="h-9 rounded-sm"
          />
          <Input
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            placeholder="% cota"
            aria-label="Percentual da cota"
            className="h-9 rounded-sm"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={contratoOk}
                onChange={(e) => setContratoOk(e.target.checked)}
                className="h-4 w-4"
              />
              Contrato
            </label>
            <Button
              type="button"
              size="sm"
              disabled={enviando}
              onClick={async () => {
                if (!obraId) {
                  toast.error("Escolha a obra.");
                  return;
                }
                setEnviando(true);
                try {
                  await adicionarFn({
                    data: {
                      preCadastroId,
                      obraId,
                      unidade,
                      percentual: percentual === "" ? null : Number(percentual),
                      contrato_ok: contratoOk,
                    },
                  });
                  setUnidade("");
                  setPercentual("");
                  setContratoOk(false);
                  await onChange();
                  toast.success("Casa vinculada.");
                } catch (erro) {
                  toast.error("Não foi possível vincular", {
                    description: erro instanceof Error ? erro.message : undefined,
                  });
                } finally {
                  setEnviando(false);
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="text-lg font-semibold">{valor}</p>
    </div>
  );
}

function ImportarPlanilha({ onChange }: { onChange: () => Promise<void> | void }) {
  const importarFn = useServerFn(importarInvestidoresExcel);
  const [relatorio, setRelatorio] = useState<RelatorioImportacao | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const importar = useMutation({
    mutationFn: async (arquivo: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result ?? ""));
        leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
        leitor.readAsDataURL(arquivo);
      });
      return importarFn({ data: { arquivo: dataUrl, nome: arquivo.name } });
    },
    onSuccess: async (r) => {
      setRelatorio(r);
      await onChange();
      if (r.erros.length === 0 && r.obrasNaoEncontradas.length === 0) {
        toast.success(`Importação concluída: ${r.importados} novos, ${r.unidadesVinculadas} casas.`);
      } else {
        toast.success("Importação concluída com ressalvas. Veja o resumo abaixo.");
      }
    },
    onError: (erro) =>
      toast.error("Falha na importação", {
        description: erro instanceof Error ? erro.message : undefined,
      }),
  });

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="font-display uppercase">Importar planilha de investidores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Envie um Excel (.xlsx) com as colunas Nome, CPF, E-mail, Telefone, Incorporadora, Cidade,
          Quadra, Lote, Casa, Percentual da Cota e Contrato. As casas são vinculadas às obras já
          cadastradas; obras não encontradas aparecem no resumo para você criar antes de reimportar.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            aria-label="Selecionar planilha de investidores"
            className="text-sm file:mr-2 file:rounded-sm file:border-0 file:bg-accent file:px-3 file:py-1 file:text-accent-foreground"
          />
          <Button
            type="button"
            disabled={importar.isPending}
            onClick={() => {
              const arquivo = inputRef.current?.files?.[0];
              if (!arquivo) {
                toast.error("Selecione um arquivo .xlsx.");
                return;
              }
              importar.mutate(arquivo);
            }}
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            {importar.isPending ? "Importando..." : "Importar"}
          </Button>
        </div>

        {relatorio && (
          <div className="space-y-2 rounded-sm border border-border p-3 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Resumo rotulo="Linhas" valor={relatorio.totalLinhas} />
              <Resumo rotulo="Novos" valor={relatorio.importados} />
              <Resumo rotulo="Atualizados" valor={relatorio.atualizados} />
              <Resumo rotulo="Casas" valor={relatorio.unidadesVinculadas} />
            </div>
            {relatorio.ativosVinculados > 0 && (
              <p className="text-xs text-muted-foreground">
                {relatorio.ativosVinculados} vínculo(s) aplicado(s) a contas já ativas.
              </p>
            )}
            {relatorio.erros.length > 0 && (
              <div>
                <p className="font-semibold text-destructive">Linhas com erro:</p>
                <ul className="ml-4 list-disc text-xs text-muted-foreground">
                  {relatorio.erros.map((e) => (
                    <li key={e.linha}>
                      Linha {e.linha} — {e.nome || "(sem nome)"}: {e.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {relatorio.obrasNaoEncontradas.length > 0 && (
              <div>
                <p className="font-semibold text-accent">
                  Obras não encontradas (criar antes de reimportar):
                </p>
                <ul className="ml-4 list-disc text-xs text-muted-foreground">
                  {relatorio.obrasNaoEncontradas.map((o) => (
                    <li key={o.chave}>
                      {o.chave} — {o.quantidade} linha(s)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {relatorio.erros.length === 0 && relatorio.obrasNaoEncontradas.length === 0 && (
              <p className="text-xs text-muted-foreground">Tudo certo, sem ressalvas.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
