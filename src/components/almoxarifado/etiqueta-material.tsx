import { useEffect, useState } from "react";
import { Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { conteudoQr } from "@/lib/almoxarifado.schemas";
import type { MaterialComSaldo } from "@/lib/almoxarifado.schemas";

type Etiqueta = {
  id: string;
  nome: string;
  codigo_interno: string;
  unidade_medida: string;
  categoria: string;
};

async function gerarQrs(itens: Etiqueta[]): Promise<Record<string, string>> {
  const QR = await import("qrcode");
  const mapa: Record<string, string> = {};
  for (const item of itens) {
    mapa[item.id] = await QR.toDataURL(conteudoQr(item.codigo_interno), {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "M",
    });
  }
  return mapa;
}

function imprimirEtiquetas(itens: Etiqueta[], qrs: Record<string, string>) {
  const janela = window.open("", "_blank", "width=800,height=900");
  if (!janela) return;
  const cartoes = itens
    .map(
      (i) => `
        <div class="etiqueta">
          <img src="${qrs[i.id] ?? ""}" alt="QR ${i.codigo_interno}" />
          <div>
            <strong>${i.nome}</strong>
            <span>${i.codigo_interno}</span>
            <span>${[i.categoria, `un: ${i.unidade_medida}`].filter(Boolean).join(" · ")}</span>
          </div>
        </div>`,
    )
    .join("");
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
    <title>Etiquetas do almoxarifado</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 16px; }
      .grade { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .etiqueta { display: flex; gap: 10px; align-items: center; border: 1px solid #333; padding: 10px; border-radius: 4px; page-break-inside: avoid; }
      .etiqueta img { width: 96px; height: 96px; }
      .etiqueta div { display: flex; flex-direction: column; font-size: 12px; }
      .etiqueta strong { font-size: 13px; text-transform: uppercase; }
      @media print { @page { margin: 10mm; } }
    </style></head><body><div class="grade">${cartoes}</div></body></html>`);
  janela.document.close();
  janela.focus();
  setTimeout(() => janela.print(), 400);
}

/** Etiqueta QR de um material, com opção de imprimir. */
export function EtiquetaMaterial({ item }: { item: MaterialComSaldo }) {
  const [aberto, setAberto] = useState(false);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    void gerarQrs([item]).then((m) => ativo && setQrs(m));
    return () => {
      ativo = false;
    };
  }, [aberto, item]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <QrCode className="mr-1 h-4 w-4" /> Etiqueta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiqueta do material</DialogTitle>
          <DialogDescription>
            {item.nome} · {item.codigo_interno}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {qrs[item.id] ? (
            <img
              src={qrs[item.id]}
              alt={`QR code do material ${item.nome}`}
              className="h-48 w-48 rounded-sm bg-white p-2"
            />
          ) : (
            <div className="h-48 w-48 animate-pulse rounded-sm bg-muted" />
          )}
          <p className="text-center text-sm text-muted-foreground">
            Cole esta etiqueta na prateleira ou embalagem. Ao ler, o material abre direto para
            entrada ou saída.
          </p>
          <Button onClick={() => imprimirEtiquetas([item], qrs)} disabled={!qrs[item.id]}>
            <Printer className="mr-1 h-4 w-4" /> Imprimir etiqueta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Imprime as etiquetas de todos os materiais listados. */
export function ImprimirTodasEtiquetas({ itens }: { itens: MaterialComSaldo[] }) {
  const [gerando, setGerando] = useState(false);

  async function imprimir() {
    setGerando(true);
    try {
      const qrs = await gerarQrs(itens);
      imprimirEtiquetas(itens, qrs);
    } finally {
      setGerando(false);
    }
  }

  return (
    <Button variant="outline" onClick={imprimir} disabled={gerando || itens.length === 0}>
      <Printer className="mr-1 h-4 w-4" />
      {gerando ? "Gerando…" : `Etiquetas (${itens.length})`}
    </Button>
  );
}
