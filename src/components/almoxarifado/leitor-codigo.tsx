import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  onLeitura: (codigo: string) => void;
};

/** Vibra e emite um bipe curto para confirmar a leitura, quando o aparelho permitir. */
function confirmarLeitura() {
  try {
    navigator.vibrate?.(80);
  } catch {
    /* aparelho sem suporte */
  }
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => void ctx.close(), 300);
  } catch {
    /* áudio bloqueado */
  }
}

export function LeitorCodigo({ aberto, onOpenChange, onLeitura }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pararRef = useRef<(() => void) | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;
    setErro(null);
    setIniciando(true);

    async function iniciar() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador não permite acesso à câmera. Digite o código abaixo.");
        }
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const leitor = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 300 });
        const video = videoRef.current;
        if (!video || cancelado) return;

        const controles = await leitor.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video,
          (resultado) => {
            if (!resultado || cancelado) return;
            cancelado = true;
            confirmarLeitura();
            pararRef.current?.();
            onLeitura(resultado.getText());
          },
        );
        pararRef.current = () => {
          try {
            controles.stop();
          } catch {
            /* já encerrado */
          }
        };
      } catch (e) {
        if (cancelado) return;
        const msg = e instanceof Error ? e.message : "";
        setErro(
          /permission|denied|NotAllowed/i.test(msg)
            ? "Permissão da câmera negada. Autorize o acesso no navegador ou digite o código abaixo."
            : msg || "Não foi possível abrir a câmera. Digite o código abaixo.",
        );
      } finally {
        if (!cancelado) setIniciando(false);
      }
    }

    void iniciar();

    return () => {
      cancelado = true;
      pararRef.current?.();
      pararRef.current = null;
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [aberto, onLeitura]);

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> Ler código
          </DialogTitle>
          <DialogDescription>
            Aponte a câmera para a etiqueta QR do armazém ou para o código de barras da embalagem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-sm border border-border bg-black">
            <video
              ref={videoRef}
              className="aspect-[3/4] w-full object-cover sm:aspect-video"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-8 rounded-sm border-2 border-accent/70" />
          </div>

          {iniciando && <p className="text-xs text-muted-foreground">Abrindo a câmera…</p>}
          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="space-y-1.5 border-t border-border pt-3">
            <Label htmlFor="codigo-manual" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" /> Digitar o código
            </Label>
            <div className="flex gap-2">
              <Input
                id="codigo-manual"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manual.trim()) {
                    onLeitura(manual.trim());
                    setManual("");
                  }
                }}
                placeholder="ALM-0007 ou 7891234567895"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!manual.trim()}
                onClick={() => {
                  onLeitura(manual.trim());
                  setManual("");
                }}
              >
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
