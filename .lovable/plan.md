# ObraViva — Acompanhamento de obras (MVP)

Aplicação web responsiva conectando engenheiros e clientes: o engenheiro publica atualizações (Excel + fotos + vídeos + observações) e atualiza etapas; o cliente acompanha tudo em leitura.

## Identidade visual
Direção "Industrial técnico": grafite (#1C1F22), concreto (#2E3338), amarelo de obra (#F2B01E) e fundo claro (#F5F3EF). Tipografia condensada em títulos, corpo neutro; cards com bordas firmes, chips de status e barras de progresso. Layout mobile-first (upload rápido em campo) com tabelas que viram cards no celular.

## Backend (Lovable Cloud)
Ativação do Lovable Cloud para login, banco e armazenamento de arquivos.

Tabelas:
- `profiles` — id (= usuário), nome, email
- `user_roles` — papel (`engenheiro` / `cliente`) em tabela separada, com função `has_role`
- `obras` — nome, endereço, data_inicio, previsao_termino, engenheiro_id
- `obra_clientes` — vínculo obra ↔ cliente
- `etapas` — obra_id, nome, ordem, status (nao_iniciada / em_andamento / concluida), data_conclusao
- `atualizacoes` — obra_id, data_visita, observacoes, excel_url, criado_por, criado_em
- `midias` — atualizacao_id, tipo (foto / video), url
- `leituras` — marca qual cliente já viu qual atualização (badge "nova")

Isolamento por RLS: engenheiro acessa apenas suas obras; cliente apenas leitura das obras vinculadas. Buckets privados (`relatorios`, `fotos`, `videos`) com URLs assinadas e políticas por obra.

## Cadastro e vínculo
Qualquer pessoa cria conta escolhendo o papel na tela de cadastro. O engenheiro vincula um cliente à obra digitando o e-mail de uma conta já existente (busca segura no servidor; se não existir, mensagem para pedir que o cliente se cadastre).

## Telas do engenheiro
1. Painel — lista das obras com % de conclusão, data da última atualização e botão "Nova atualização".
2. Obra — dados, clientes vinculados (adicionar/remover), etapas editáveis (status + data de conclusão), histórico de publicações.
3. Nova atualização — data da visita, observações, upload do Excel, múltiplas fotos, vídeos, e seleção das etapas atualizadas nesta publicação.

## Telas do cliente
1. Minhas obras — cards com progresso geral e indicador de atualização não lida.
2. Obra — barra de progresso geral + timeline de etapas (concluída / em andamento / pendente) e linha do tempo de atualizações (mais recente primeiro).
3. Atualização — observações, galeria de fotos com lightbox, vídeos em player, tabela do relatório Excel na tela + botão de download do arquivo original.

## Leitura do Excel
Padrão de colunas: `Item | Descrição | Status | % Concluído | Observações`. O arquivo é lido no servidor com SheetJS logo após o upload e os dados são guardados junto da atualização, então o cliente vê a tabela instantaneamente (com barra de % por linha), sem reprocessar. Se o arquivo não seguir o padrão, o engenheiro recebe aviso na publicação e a tabela é exibida com as colunas encontradas. Um link "modelo de planilha" fica disponível no formulário.

## Notificações
Notificação dentro do app (v1): badge de "nova atualização" no painel do cliente e marcação como lida ao abrir. Sem e-mail nesta versão.

## Limites de upload
Fotos comprimidas no navegador antes do envio (máx. ~1600px, ~1MB cada), vídeo até 50MB por arquivo com validação de tipo e barra de progresso.

## Detalhes técnicos
- Rotas TanStack Start: `/` (entrada + login), `/auth`, `/_authenticated/painel`, `/_authenticated/obras/$id`, `/_authenticated/obras/$id/nova-atualizacao`, `/_authenticated/cliente/obras/$id`, `/_authenticated/cliente/atualizacoes/$id`.
- Server functions (`createServerFn` + `requireSupabaseAuth`) para criar obra, vincular cliente, publicar atualização, parsear Excel (SheetJS), atualizar etapas e gerar URLs assinadas.
- Validação com Zod no cliente e no servidor; papel do usuário sempre verificado no servidor.
- Progresso da obra calculado das etapas: concluída = 100%, em andamento = 50%.
