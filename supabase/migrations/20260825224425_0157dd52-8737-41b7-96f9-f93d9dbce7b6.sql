CREATE SEQUENCE IF NOT EXISTS public.materiais_codigo_seq;

ALTER TABLE public.materiais
  ADD COLUMN IF NOT EXISTS codigo_interno TEXT,
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

UPDATE public.materiais
SET codigo_interno = 'ALM-' || lpad(nextval('public.materiais_codigo_seq')::text, 4, '0')
WHERE codigo_interno IS NULL;

ALTER TABLE public.materiais
  ALTER COLUMN codigo_interno SET DEFAULT 'ALM-' || lpad(nextval('public.materiais_codigo_seq')::text, 4, '0');

ALTER TABLE public.materiais
  ALTER COLUMN codigo_interno SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS materiais_codigo_interno_key
  ON public.materiais (codigo_interno);

CREATE UNIQUE INDEX IF NOT EXISTS materiais_codigo_barras_key
  ON public.materiais (codigo_barras)
  WHERE codigo_barras IS NOT NULL AND codigo_barras <> '';