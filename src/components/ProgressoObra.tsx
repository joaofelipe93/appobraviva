import { STATUS_LABEL, type EtapaStatus } from "@/lib/obras.schemas";
import { CheckCircle2, CircleDashed, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export function BarraProgresso({ valor }: { valor: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-sm border border-border bg-muted">
      <div
        className="h-full bg-accent transition-all"
        style={{ width: `${Math.min(100, Math.max(0, valor))}%` }}
      />
    </div>
  );
}

export function ChipStatus({ status }: { status: EtapaStatus }) {
  const estilos: Record<EtapaStatus, string> = {
    concluida: "bg-success/15 text-success border-success/40",
    em_andamento: "bg-accent/20 text-accent-foreground border-accent",
    nao_iniciada: "bg-muted text-muted-foreground border-border",
  };
  const Icone =
    status === "concluida" ? CheckCircle2 : status === "em_andamento" ? Loader : CircleDashed;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        estilos[status],
      )}
    >
      <Icone className="h-3.5 w-3.5" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TimelineEtapas({
  etapas,
}: {
  etapas: { id: string; nome: string; status: EtapaStatus; data_conclusao: string | null }[];
}) {
  return (
    <ol className="space-y-0">
      {etapas.map((etapa, indice) => (
        <li key={etapa.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                etapa.status === "concluida"
                  ? "border-success bg-success text-success-foreground"
                  : etapa.status === "em_andamento"
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground",
              )}
            >
              {indice + 1}
            </span>
            {indice < etapas.length - 1 && <span className="my-1 w-0.5 flex-1 bg-border" />}
          </div>
          <div className="flex-1 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{etapa.nome}</span>
              <ChipStatus status={etapa.status} />
            </div>
            {etapa.data_conclusao && (
              <p className="text-xs text-muted-foreground">
                Concluída em {new Date(`${etapa.data_conclusao}T12:00:00`).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
