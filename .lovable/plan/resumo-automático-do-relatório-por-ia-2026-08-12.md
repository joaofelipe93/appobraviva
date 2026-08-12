# Resumo automático do relatório por IA

Quando o engenheiro publicar um relatório em Excel, uma IA lê a planilha e escreve um resumo em linguagem simples, que aparece na atualização — pensado para o cliente entender o andamento sem precisar interpretar a tabela técnica.

## Como fica na prática

1. O engenheiro publica a atualização com a planilha, como hoje.
2. Logo após a leitura da planilha, a IA gera o resumo (título curto + parágrafo explicativo + 3 a 5 pontos principais, incluindo pendências/atenções quando existirem).
3. Na tela da atualização, o resumo aparece **acima** da tabela do relatório, em um card destacado ("Resumo da IA"), com a tabela completa logo abaixo (mantida para quem quiser o detalhe).
4. O card indica que o texto foi gerado por IA a partir do relatório enviado.
5. O engenheiro vê o mesmo resumo e tem um botão "Gerar novamente" caso queira refazer.
6. Se a IA falhar ou estiver indisponível, a publicação continua normalmente e o card mostra "Resumo indisponível" com opção de tentar de novo — nunca bloqueia o envio.

## Banco de dados

Duas colunas novas em `atualizacoes`:
- `resumo_ia jsonb` — título, parágrafo e lista de pontos
- `resumo_ia_em timestamptz` — quando foi gerado

Sem mudança de políticas de acesso: quem já vê a atualização vê o resumo.

## Detalhes técnicos

- Nova server function `gerarResumoRelatorio` (`src/lib/obras.functions.ts`), autenticada com `requireSupabaseAuth`, restrita ao engenheiro responsável pela obra; recebe `atualizacaoId`, lê `excel_dados` do banco (não reprocessa o arquivo) e grava `resumo_ia`.
- Chamada via Lovable AI (AI Gateway) com o AI SDK a partir de um helper server-only `src/lib/resumo.server.ts`; `LOVABLE_API_KEY` fica apenas no servidor. Prompt em português, tom claro para leigos, proibido inventar dados fora da planilha; saída estruturada (`titulo`, `resumo`, `pontos[]`) validada com Zod e limites de tamanho aplicados em código.
- `processarExcel` continua igual e passa a disparar a geração do resumo em seguida (no fluxo de `nova-atualizacao.tsx`, após o `processar(...)`, com estado "Gerando resumo..." e sem travar a navegação em caso de erro).
- `obterAtualizacao` passa a retornar `resumo_ia`; a tela `atualizacoes.$id.tsx` ganha o card do resumo e o botão de regerar visível só para o engenheiro.
- Erros do gateway tratados explicitamente: 429 (limite) e 402 (créditos) com mensagem própria ao engenheiro.
