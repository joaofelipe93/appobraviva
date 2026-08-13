import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type SenhaInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Classe aplicada ao container externo (útil para espaço/labels). */
  containerClassName?: string;
};

/**
 * Campo de senha com botão para alternar entre mostrar e ocultar o texto.
 * Mantém a mesma API do Input (id, name, autoComplete, minLength, etc.).
 */
const SenhaInput = React.forwardRef<HTMLInputElement, SenhaInputProps>(
  ({ className, containerClassName, ...props }, ref) => {
    const [visivel, setVisivel] = React.useState(false);
    return (
      <div className={cn("relative", containerClassName)}>
        <Input
          ref={ref}
          type={visivel ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          tabIndex={-1}
          onClick={() => setVisivel((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
SenhaInput.displayName = "SenhaInput";

export { SenhaInput };
