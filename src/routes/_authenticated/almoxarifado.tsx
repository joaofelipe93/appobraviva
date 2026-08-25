import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  acessoAlmoxarifado,
  atualizarMaterial,
  criarMaterial,
  excluirMaterial,
  excluirMovimentacao,
  listarEstoque,
  registrarMovimentacao,
} from "@/lib/almoxarifado.functions";
import {
  UNIDADES_MEDIDA,
  formatarData,
  formatarMoeda,
  formatarQuantidade,
} from "@/lib/almoxarifado.schemas";
import type { MaterialComSaldo } from "@/lib/almoxarifado.schemas";

export const Route = createFileRoute("/_authenticated/almoxarifado")({
  head: () => ({
    meta: [
      { title: "Almoxarifado — ObraViva" },
      {
        name: "description",
        content:
          "Armazém geral: materiais, entradas de compra, saídas de consumo, custos e fornecedores em um único estoque.",
      },
      { property: "og:title", content: "Almoxarifado — ObraViva" },
      {
        property: "og:description",
        content: "Materiais, entradas, saídas e saldo do estoque geral.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlmoxarifadoPage,
});

function AlmoxarifadoPage() {
  const acessoFn = useServerFn(acessoAlmoxarifado);
  const estoqueFn = useServerFn(listarEstoque);
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");

  const acesso = useQuery({ queryKey: ["almoxarifado-acesso"], queryFn: () => acessoFn({}) });

  const estoque = useQuery({
    queryKey: ["almoxarifado"],
    queryFn: () => estoqueFn({}),
    enabled: !!acesso.data,
  });

  async function recarregar() {
    await queryClient.invalidateQueries({ queryKey: ["almoxarifado"] });
  }

  const itens = useMemo(() => {
    const lista = estoque.data?.itens ?? [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter((i) =>
      [i.nome, i.categoria, i.fornecedor].join(" ").toLowerCase().includes(termo),
    );
  }, [estoque.data, busca]);

  if (acesso.isLoading) {
    return (
      <AppShell titulo="Almoxarifado">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (acesso.error) {
    return (
      <AppShell
        titulo="Almoxarifado"
        descricao="Área restrita a engenheiros e administradores."
      >
        <Button asChild variant="outline">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo="Almoxarifado"
      descricao="Armazém geral de materiais: entradas de compra e saídas de consumo em um único estoque."
      acao={<NovoMaterial onPronto={recarregar} />}
    >
      <div className="space-y-6">
        <div className="space-y-1.5 sm:max-w-md">
          <Label htmlFor="busca-material">Buscar material</Label>
          <Input
            id="busca-material"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, categoria ou fornecedor"
          />
        </div>

        {estoque.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Indicador
                icone={<Package className="h-4 w-4" />}
                rotulo="Materiais"
                valor={String(estoque.data?.totalMateriais ?? 0)}
              />
              <Indicador
                icone={<Boxes className="h-4 w-4" />}
                rotulo="Valor em estoque"
                valor={formatarMoeda(estoque.data?.valorTotal ?? 0)}
              />
              <Indicador
                icone={<AlertTriangle className="h-4 w-4" />}
                rotulo="Abaixo do mínimo"
                valor={String(estoque.data?.alertas ?? 0)}
                alerta={(estoque.data?.alertas ?? 0) > 0}
              />
            </div>

            {itens.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {busca
                    ? "Nenhum material encontrado para esta busca."
                    : "Nenhum material cadastrado no armazém ainda."}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {itens.map((item) => (
                  <MaterialCard key={item.id} item={item} onPronto={recarregar} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Indicador({
  icone,
  rotulo,
  valor,
  alerta,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <Card className={alerta ? "border-destructive" : undefined}>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground">
          {icone}
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
          <p className="font-display text-xl font-bold">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialCard({ item, onPronto }: { item: MaterialComSaldo; onPronto: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const excluirFn = useServerFn(excluirMaterial);
  const excluirMovFn = useServerFn(excluirMovimentacao);

  async function excluir() {
    if (!confirm(`Excluir "${item.nome}" e todas as suas movimentações?`)) return;
    try {
      await excluirFn({ data: { id: item.id } });
      toast.success("Material excluído.");
      await onPronto();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.");
    }
  }

  async function excluirMovimento(id: string) {
    try {
      await excluirMovFn({ data: { id } });
      toast.success("Movimentação removida.");
      await onPronto();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível remover.");
    }
  }

  return (
    <Card className={item.abaixoDoMinimo ? "border-destructive" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-lg uppercase tracking-wide">
              {item.nome}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {[item.categoria || "Sem categoria", item.fornecedor || "Sem fornecedor"].join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.abaixoDoMinimo ? "destructive" : "secondary"}>
              Saldo {formatarQuantidade(item.saldo)} {item.unidade_medida}
            </Badge>
            {item.custo_unitario !== null && (
              <Badge variant="outline">{formatarMoeda(item.valorEstoque)}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <span>Entradas: {formatarQuantidade(item.entradas)}</span>
          <span>Saídas: {formatarQuantidade(item.saidas)}</span>
          <span>Mínimo: {formatarQuantidade(item.estoque_minimo)}</span>
          <span>
            Custo un.: {item.custo_unitario === null ? "—" : formatarMoeda(item.custo_unitario)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <MovimentacaoDialog
            material={item}
            tipo="entrada"
            onPronto={onPronto}
            gatilho={
              <Button size="sm" variant="outline">
                <ArrowDownCircle className="mr-1 h-4 w-4" /> Entrada
              </Button>
            }
          />
          <MovimentacaoDialog
            material={item}
            tipo="saida"
            onPronto={onPronto}
            gatilho={
              <Button size="sm" variant="outline">
                <ArrowUpCircle className="mr-1 h-4 w-4" /> Saída
              </Button>
            }
          />
          <EditarMaterial item={item} onPronto={onPronto} />
          <Button size="sm" variant="ghost" onClick={() => setAberto((v) => !v)}>
            {aberto ? "Ocultar" : `Movimentações (${item.movimentacoes.length})`}
          </Button>
          <Button size="sm" variant="ghost" onClick={excluir}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {aberto && (
          <div className="overflow-x-auto border-t border-border pt-3">
            {item.movimentacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-3">Data</th>
                    <th className="py-1.5 pr-3">Tipo</th>
                    <th className="py-1.5 pr-3">Qtd.</th>
                    <th className="py-1.5 pr-3">Custo un.</th>
                    <th className="py-1.5 pr-3">Fornecedor / NF</th>
                    <th className="py-1.5 pr-3">Responsável</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {item.movimentacoes.map((mv) => (
                    <tr key={mv.id} className="border-t border-border/60">
                      <td className="py-1.5 pr-3">{formatarData(mv.data_movimento)}</td>
                      <td className="py-1.5 pr-3">
                        <Badge variant={mv.tipo === "entrada" ? "secondary" : "outline"}>
                          {mv.tipo === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-3">
                        {formatarQuantidade(mv.quantidade)} {item.unidade_medida}
                      </td>
                      <td className="py-1.5 pr-3">
                        {mv.custo_unitario === null ? "—" : formatarMoeda(Number(mv.custo_unitario))}
                      </td>
                      <td className="py-1.5 pr-3">
                        {[mv.fornecedor, mv.nota_fiscal].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="py-1.5 pr-3">{mv.responsavel || "—"}</td>
                      <td className="py-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => excluirMovimento(mv.id)}
                          aria-label="Remover movimentação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type FormMaterial = {
  nome: string;
  categoria: string;
  unidadeMedida: string;
  custoUnitario: string;
  fornecedor: string;
  estoqueMinimo: string;
  observacoes: string;
};

const FORM_VAZIO: FormMaterial = {
  nome: "",
  categoria: "",
  unidadeMedida: "un",
  custoUnitario: "",
  fornecedor: "",
  estoqueMinimo: "0",
  observacoes: "",
};

function numeroOuNulo(valor: string): number | null {
  const limpo = valor.replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function CamposMaterial({
  form,
  setForm,
}: {
  form: FormMaterial;
  setForm: (f: FormMaterial) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nome do material</Label>
        <Input
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Cimento CP II 50kg"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Input
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          placeholder="Estrutura, hidráulica…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Unidade de medida</Label>
        <Select
          value={form.unidadeMedida}
          onValueChange={(v) => setForm({ ...form, unidadeMedida: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIDADES_MEDIDA.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Custo unitário (R$)</Label>
        <Input
          value={form.custoUnitario}
          onChange={(e) => setForm({ ...form, custoUnitario: e.target.value })}
          placeholder="42,90"
          inputMode="decimal"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Estoque mínimo</Label>
        <Input
          value={form.estoqueMinimo}
          onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
          inputMode="decimal"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Fornecedor padrão</Label>
        <Input
          value={form.fornecedor}
          onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
          placeholder="Depósito Central"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Observações</Label>
        <Textarea
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}

function NovoMaterial({ onPronto }: { onPronto: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<FormMaterial>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const criarFn = useServerFn(criarMaterial);

  async function salvar() {
    setSalvando(true);
    try {
      await criarFn({
        data: {
          
          nome: form.nome,
          categoria: form.categoria,
          unidadeMedida: form.unidadeMedida,
          custoUnitario: numeroOuNulo(form.custoUnitario),
          fornecedor: form.fornecedor,
          estoqueMinimo: numeroOuNulo(form.estoqueMinimo) ?? 0,
          observacoes: form.observacoes,
        },
      });
      toast.success("Material cadastrado.");
      setForm(FORM_VAZIO);
      setAberto(false);
      await onPronto();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível cadastrar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Novo material
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo material</DialogTitle>
          <DialogDescription>Cadastre o item no almoxarifado desta obra.</DialogDescription>
        </DialogHeader>
        <CamposMaterial form={form} setForm={setForm} />
        <Button onClick={salvar} disabled={salvando || form.nome.trim().length < 2}>
          {salvando ? "Salvando…" : "Cadastrar material"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function EditarMaterial({
  item,
  onPronto,
}: {
  item: MaterialComSaldo;
  onPronto: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<FormMaterial>({
    nome: item.nome,
    categoria: item.categoria,
    unidadeMedida: item.unidade_medida,
    custoUnitario: item.custo_unitario === null ? "" : String(item.custo_unitario),
    fornecedor: item.fornecedor,
    estoqueMinimo: String(item.estoque_minimo),
    observacoes: item.observacoes,
  });
  const atualizarFn = useServerFn(atualizarMaterial);

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarFn({
        data: {
          materialId: item.id,
          nome: form.nome,
          categoria: form.categoria,
          unidadeMedida: form.unidadeMedida,
          custoUnitario: numeroOuNulo(form.custoUnitario),
          fornecedor: form.fornecedor,
          estoqueMinimo: numeroOuNulo(form.estoqueMinimo) ?? 0,
          observacoes: form.observacoes,
        },
      });
      toast.success("Material atualizado.");
      setAberto(false);
      await onPronto();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="mr-1 h-4 w-4" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar material</DialogTitle>
          <DialogDescription>{item.nome}</DialogDescription>
        </DialogHeader>
        <CamposMaterial form={form} setForm={setForm} />
        <Button onClick={salvar} disabled={salvando || form.nome.trim().length < 2}>
          {salvando ? "Salvando…" : "Salvar alterações"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function MovimentacaoDialog({
  material,
  tipo,
  gatilho,
  onPronto,
}: {
  material: MaterialComSaldo;
  tipo: "entrada" | "saida";
  gatilho: React.ReactNode;
  onPronto: () => Promise<void>;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const [custo, setCusto] = useState(
    tipo === "entrada" && material.custo_unitario !== null ? String(material.custo_unitario) : "",
  );
  const [fornecedor, setFornecedor] = useState(tipo === "entrada" ? material.fornecedor : "");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [data, setData] = useState(hoje);
  const registrarFn = useServerFn(registrarMovimentacao);

  async function salvar() {
    const qtd = numeroOuNulo(quantidade);
    if (!qtd || qtd <= 0) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    setSalvando(true);
    try {
      await registrarFn({
        data: {
          materialId: material.id,
          tipo,
          quantidade: qtd,
          custoUnitario: numeroOuNulo(custo),
          fornecedor,
          notaFiscal,
          responsavel,
          observacoes,
          dataMovimento: data,
        },
      });
      toast.success(tipo === "entrada" ? "Entrada registrada." : "Saída registrada.");
      setQuantidade("");
      setNotaFiscal("");
      setObservacoes("");
      setAberto(false);
      await onPronto();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{gatilho}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tipo === "entrada" ? "Entrada de material" : "Saída de material"}
          </DialogTitle>
          <DialogDescription>
            {material.nome} · saldo atual {formatarQuantidade(material.saldo)}{" "}
            {material.unidade_medida}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Quantidade ({material.unidade_medida})</Label>
            <Input
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              inputMode="decimal"
              placeholder="10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          {tipo === "entrada" ? (
            <>
              <div className="space-y-1.5">
                <Label>Custo unitário (R$)</Label>
                <Input
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nota fiscal</Label>
                <Input value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Fornecedor</Label>
                <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Responsável pela retirada</Label>
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Registrando…" : "Registrar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
