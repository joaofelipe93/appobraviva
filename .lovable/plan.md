# Suporte ao cliente — chamados

Cliente abre chamados; administrador acompanha, responde em conversa e encerra.

## Fluxo

1. Cliente acessa "Suporte" no menu e vê seus chamados (abertos primeiro) com status e indicação de resposta nova.
2. Ao abrir um chamado, informa: assunto, descrição, obra/unidade (dentre as unidades vinculadas a ele), prioridade (baixa / média / alta) e fotos opcionais.
3. Administrador vê a lista completa de chamados com busca e filtros (status, prioridade, obra), abre o chamado e responde em formato de conversa.
4. Administrador altera status: aberto → em atendimento → resolvido/fechado. Fechado bloqueia novas mensagens; o cliente pode reabrir enviando nova mensagem enquanto o admin não fechar definitivamente.
5. Engenheiros não têm acesso a esta área.

## Notificações por e-mail

Usa o mesmo mecanismo de e-mail já existente no app:
- Ao abrir um chamado: aviso para os administradores.
- Ao admin responder ou alterar o status: aviso para o cliente do chamado.
- Falha de envio não impede a gravação do chamado/mensagem.

## Telas

- `/_authenticated/suporte` — cliente: lista dos próprios chamados + botão "Novo chamado".
- `/_authenticated/suporte/$id` — detalhe do chamado: dados, conversa, fotos, envio de mensagem.
- Aba "Suporte" dentro do painel do administrador, reaproveitando o padrão visual atual (cards, chips de status, cores por prioridade).

## Banco de dados

Nova migração com:

- `suporte_chamados` — obra_id (opcional), cliente_id, unidade, assunto, descricao, prioridade (`baixa`/`media`/`alta`), status (`aberto`/`em_atendimento`/`resolvido`/`fechado`), fechado_em, fechado_por, ultima_mensagem_em, created_at, updated_at (com trigger).
- `suporte_mensagens` — chamado_id, autor_id, autor_papel, mensagem, created_at.
- `suporte_anexos` — chamado_id, mensagem_id (opcional), path (arquivo no bucket privado existente, sob `chamados/`), created_at.
- Novos enums `suporte_prioridade` e `suporte_status`.
- GRANTs para `authenticated` e `service_role`; RLS ligada em todas.

Políticas:
- Cliente lê/cria os próprios chamados e mensagens; não altera status nem apaga nada.
- Administrador lê e gerencia tudo.
- Anexos seguem a visibilidade do chamado; leitura por URL assinada.

## Detalhes técnicos

- `src/lib/suporte.schemas.ts` (Zod: assunto ≤ 120, descrição ≤ 4000, mensagem ≤ 4000, prioridade/status enum) e `src/lib/suporte.functions.ts` com server functions `requireSupabaseAuth`: `listarChamados`, `obterChamado`, `criarChamado`, `responderChamado`, `alterarStatusChamado`, `assinarAnexos`.
- Papel sempre verificado no servidor (`garantirAdmin` em `src/lib/admin.server.ts` para ações de admin); `cliente_id` e `autor_id` derivados de `context.userId`, nunca do payload.
- Upload de fotos no bucket privado `obras` com prefixo `chamados/<chamado_id>/`, compressão no navegador (~1600px) e rollback do arquivo se a gravação falhar.
- E-mails via `src/lib/notificacoes.server.ts` + template novo em `src/lib/email-templates/`, seguindo o padrão dos existentes.
- Rotas seguem o padrão plano do TanStack (`suporte.tsx`, `suporte.$id.tsx`) com `head()` próprio.
