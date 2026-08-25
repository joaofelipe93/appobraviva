# Leitor de QR Code / código de barras no Almoxarifado

Objetivo: o engenheiro aponta a câmera do celular para a etiqueta, o sistema identifica o material e abre a movimentação (entrada ou saída) já preenchida. Tudo gravado direto no banco, com o mesmo controle de saldo e permissões de hoje.

## Como vai funcionar

1. **Códigos no cadastro do material**
   - Cada material passa a ter um **código interno único** gerado pelo sistema (ex. `ALM-0007`), usado na etiqueta QR.
   - Campo opcional de **código de barras do fabricante** (EAN da embalagem).
   - A leitura procura nos dois campos; se achar, é o material.

2. **Etiquetas para imprimir**
   - Botão "Etiqueta" em cada material: mostra o QR (gerado no próprio app) com nome, unidade e código, em formato pronto para imprimir/colar.
   - Opção de imprimir etiquetas de vários materiais de uma vez.

3. **Leitura pela câmera**
   - Botão "Ler código" no topo do Almoxarifado, com destaque em telas de celular.
   - Usa a câmera do aparelho (câmera traseira por padrão), lendo QR e códigos de barras comuns.
   - Campo alternativo para digitar/colar o código, para quando a câmera não estiver disponível ou o celular não autorizar o acesso.
   - Mensagens claras quando a permissão da câmera é negada ou o navegador não suporta.

4. **Depois de ler**
   - Abre a tela de movimentação com: nome do material, categoria, saldo atual, unidade e alerta de estoque mínimo.
   - Botões Entrada / Saída, campo de quantidade (padrão 1), responsável, observação e data.
   - Saída maior que o saldo continua bloqueada, com mensagem do saldo disponível.
   - Ao confirmar, grava no banco e a lista/saldos atualizam na hora.
   - Aviso sonoro/vibração curta de confirmação da leitura, quando o aparelho permitir.

5. **Código não cadastrado**
   - Mensagem "código não encontrado" com botão para cadastrar o material na hora, já com o código lido preenchido.
   - Depois de salvar, segue direto para a movimentação de entrada.

6. **Outras melhorias no Almoxarifado**
   - Busca passa a considerar o código interno e o código de barras.
   - Coluna/etiqueta com o código visível no item.
   - Ao digitar um código completo na busca, atalho para abrir a movimentação daquele material.

## Detalhes técnicos

- **Banco (migração)**: adicionar em `public.materiais` as colunas `codigo_interno text` (único, preenchido para os materiais existentes por sequência) e `codigo_barras text` (opcional, único quando informado, com índice). Geração do código via sequência/`default` no banco para evitar duplicidade em cadastros simultâneos. RLS atual (engenheiro/admin) permanece sem alteração.
- **Schemas** (`src/lib/almoxarifado.schemas.ts`): incluir `codigoBarras` em `materialSchema`/`materialUpdateSchema`, expor `codigo_interno` e `codigo_barras` em `MaterialComSaldo`, e schema de busca por código.
- **Server functions** (`src/lib/almoxarifado.functions.ts`): nova `buscarMaterialPorCodigo` (autenticada, com `exigirEquipe`, busca por `codigo_interno` ou `codigo_barras` normalizados e retorna material + saldo); `listarEstoque`, `criarMaterial` e `atualizarMaterial` passam a ler/gravar os novos campos. `registrarMovimentacao` fica inalterada — o scanner reaproveita a mesma função, mantendo validação de saldo no servidor.
- **Leitor**: componente `src/components/almoxarifado/leitor-codigo.tsx` usando a API `BarcodeDetector` quando disponível e a biblioteca `@zxing/browser` como fallback (funciona em iOS/Safari), carregada dinamicamente para não afetar o SSR. Render dentro de `ClientOnly`, `getUserMedia` com `facingMode: environment`, encerrando as tracks ao fechar o diálogo.
- **QR das etiquetas**: geração local com `qrcode` (data URL), sem serviço externo; componente de impressão em `src/components/almoxarifado/etiqueta-material.tsx`.
- **Tela** (`src/routes/_authenticated/almoxarifado.tsx`): botão "Ler código", diálogo de leitura, diálogo de movimentação pós-leitura reaproveitando o formulário existente, fluxo de cadastro rápido e busca ampliada. Invalidação das queries do estoque após cada gravação.
- Bibliotecas novas: `@zxing/browser` e `qrcode` (+ tipos).
