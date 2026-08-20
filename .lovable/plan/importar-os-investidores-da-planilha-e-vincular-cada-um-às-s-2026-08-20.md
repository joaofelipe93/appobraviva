# Importar os investidores da planilha e vincular cada um às suas casas

Resolve a issue #3 ("Cadastrar Banco de Dados dos Investidores"): carregar as 14 linhas da planilha `Relação_Casas_Investidores.xlsx` no sistema e permitir que o administrador mantenha esses vínculos (obra + casa) para que cada morador receba somente o resumo da sua casa.

## O que a planilha traz

Colunas: Nome, CPF, Email, Telefone, Incorporadora, Cidade, Quadra, Lote, Casa, Percentual da Cota, Contrato.

Pontos que o sistema hoje não suporta:

- O mesmo CPF aparece em várias casas (ex.: ARTENIO — Casa 4 da Quadra H/Lote 26 e Casas 3 e 4 da Quadra G/Lote 16). Hoje o pré-cadastro aceita um CPF só uma vez e o vínculo permite uma casa por obra.
- Uma casa pode ter dois investidores dividindo a cota (Quadra F/Lote 41 Casa 3: 37,71% + 62,29%).
- Telefone, percentual da cota e status do contrato não existem no banco.

## Obras criadas automaticamente

Cada Incorporadora + Cidade + Quadra/Lote vira uma obra, reaproveitando a obra existente "Rua dos Camarões":

```text
JJMV - Touros - Quadra H Lote 26        -> Casa 3, Casa 4
JJMV - Touros - Quadra G Lote 16        -> Casa 1 (2 cotistas), Casa 2, Casa 3, Casa 4
CARVALHO - Touros - Quadra F Lote 41    -> Casa 3 (2 cotistas), Casa 4
Rua dos Camarões (existente)            -> Casa 1, Casa 2, Casa 3, Casa 4
```

As obras ficam sob o engenheiro responsável — o administrador confirma esse dono na importação (por padrão, o engenheiro já cadastrado).

## Como o administrador usa

1. Tela de administração ganha a aba "Investidores": lista das pessoas importadas com nome, CPF, e-mail, telefone e as casas vinculadas.
2. Cada pessoa pode ter várias casas; o admin adiciona/remove casas (obra + casa + percentual + contrato) sem apagar o pré-cadastro.
3. Quando a pessoa se cadastra com aquele CPF e e-mail, todos os vínculos de casa são criados de uma vez e ela passa a ver e receber apenas o conteúdo das suas casas.

## Notificação por e-mail

O envio passa a agrupar por cliente: um e-mail por atualização contendo o destaque de cada casa que a pessoa possui naquela obra (hoje é um por vínculo, o que geraria e-mails duplicados para quem tem duas casas).

## Detalhes técnicos

Migração:

- Nova tabela `pre_cadastro_unidades` (`pre_cadastro_id`, `obra_id`, `unidade`, `percentual numeric(5,2)`, `contrato_ok boolean`), única por (pre_cadastro_id, obra_id, unidade), RLS só para admin + `service_role`. As colunas `obra_id`/`unidade` de `pre_cadastros` deixam de ser usadas para novos registros (mantidas por compatibilidade e migradas para a nova tabela).
- `pre_cadastros`: adicionar `telefone text`.
- `obra_clientes`: trocar a PK `(obra_id, cliente_id)` por `(obra_id, cliente_id, unidade)` com `unidade` NOT NULL DEFAULT `''` (vazio = obra inteira), adicionar `percentual` e `contrato_ok`. As policies e as funções `private.is_obra_cliente` / filtros de mídia continuam válidos porque passam a existir várias linhas por cliente.
- `profiles`: adicionar `telefone text`.
- GRANTs explícitos nas tabelas novas/alteradas.

Dados (via ferramenta de insert, não migração): criar as 3 obras novas, os 10 pré-cadastros distintos (CPF normalizado, papel `cliente`, telefone) e as 14 linhas de casa correspondentes.

Código:

- `src/lib/obras.schemas.ts`: schema de pré-cadastro com lista de casas + telefone; `filtrarExcelPorUnidade` e a seleção de resumo passam a aceitar várias unidades.
- `src/lib/obras.functions.ts`: `registrarPerfil` cria uma linha de `obra_clientes` por casa do pré-cadastro; leitura de atualização/mídias filtra pelo conjunto de casas do cliente.
- `src/routes/_authenticated/admin.tsx`: formulário e listagem com múltiplas casas, telefone, percentual e contrato.
- `src/lib/notificacoes.server.ts`: agrupar vínculos por cliente e enviar um e-mail com o destaque de cada casa.
- `src/routes/_authenticated/atualizacoes.$id.tsx` e `obras.$id.tsx`: exibir os resumos/mídias de todas as casas do cliente.

Observação de segurança: o token do GitHub foi colado no chat. Recomendo revogá-lo e reconectar o GitHub pelo conector.
