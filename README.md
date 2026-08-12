# App Obra Travus

PROMPT

Quero que você desenvolva uma aplicação web (responsiva, funcionando bem também em celular) para acompanhamento de obras de construção civil, conectando engenheiros e clientes.

Contexto do problema

Um engenheiro responsável por uma obra precisa, duas vezes por semana, publicar uma atualização contendo:

Um relatório em formato Excel (.xlsx)

Fotos da obra

Vídeos da obra (opcional)

O cliente dono da obra precisa acessar essas atualizações de forma simples, junto com uma visão clara de quais etapas da obra já foram concluídas, quais estão em andamento e quais ainda não começaram.

Perfis de usuário

1. Engenheiro (administrador da obra)

Login próprio (email + senha)

Pode criar e gerenciar uma ou mais obras

Pode vincular clientes a cada obra

Publica atualizações periódicas: upload de arquivo Excel + fotos + vídeos + um texto/resumo da visita

Define e atualiza o status das etapas da obra (ex.: fundação, estrutura, alvenaria, elétrica, hidráulica, acabamento, entrega)

Vê histórico de tudo que já publicou

2. Cliente

Login próprio (email + senha), vinculado a uma ou mais obras específicas

Acesso somente leitura

Visualiza linha do tempo das atualizações (mais recente primeiro)

Visualiza o relatório Excel de cada atualização (idealmente com preview dos dados na tela, além do download do arquivo original)

Visualiza fotos em galeria e vídeos incorporados

Visualiza o progresso das etapas da obra de forma visual (ex.: barra de progresso ou linha do tempo com etapas concluídas, em andamento e pendentes)

Recebe notificação (e-mail ou notificação no app) quando uma nova atualização é publicada

Funcionalidades principais

Autenticação e autorização

Dois tipos de login (engenheiro / cliente), com permissões diferentes

Um engenheiro pode gerenciar várias obras e vários clientes

Um cliente só enxerga a(s) obra(s) à qual está vinculado

Gestão de obras

Cadastro de obra (nome, endereço, data de início, previsão de término, cliente(s) vinculado(s))

Lista de etapas da obra, cada uma com status (não iniciada / em andamento / concluída) e data de conclusão

Publicação de atualização (feita pelo engenheiro)

Upload de arquivo Excel

Upload de múltiplas fotos

Upload de vídeo (ou link de vídeo, para não sobrecarregar o servidor)

Campo de texto para observações da visita

Data da visita/atualização

Opção de marcar quais etapas foram atualizadas nesta publicação

Leitura de dados do Excel

O sistema deve ler o Excel enviado e exibir os dados em tabela na própria tela (não só oferecer o download), permitindo que o cliente veja as informações sem precisar abrir o arquivo

Definir com o engenheiro um padrão de colunas do Excel (ex.: item, descrição, status, % concluído, observações) para que a leitura automática funcione bem

Linha do tempo / feed de atualizações

Lista cronológica das publicações de cada obra

Cada item mostra: data, resumo, miniaturas das fotos, link do vídeo, e acesso ao relatório

Progresso da obra

Visualização das etapas com status (barra de progresso, checklist ou timeline visual)

Percentual geral de conclusão da obra

Notificações

Aviso ao cliente quando uma nova atualização é publicada (e-mail é suficiente na v1)

Painel do engenheiro

Visão geral de todas as obras que ele gerencia

Atalho para publicar nova atualização

Histórico de publicações por obra

Requisitos técnicos sugeridos

Frontend: React (ou Next.js)

Backend: Node.js com API REST (ou Next.js API routes)

Banco de dados: PostgreSQL (relacional, por causa de usuários, obras, etapas e atualizações relacionadas)

Armazenamento de arquivos: serviço de storage de arquivos (ex.: S3 ou equivalente) para os Excel, fotos e vídeos

Autenticação: JWT ou solução pronta (ex.: NextAuth/Auth.js), com dois papéis (roles): engenheiro e cliente

Biblioteca para leitura de Excel no backend (ex.: SheetJS/xlsx) para extrair os dados e exibir em tabela

Estrutura de dados sugerida (entidades principais)

User: id, nome, email, senha (hash), papel (engenheiro/cliente)

Obra: id, nome, endereço, data_inicio, previsao_termino, engenheiro_id

ObraCliente: obra_id, cliente_id (relação muitos-para-muitos, caso mais de um cliente acompanhe a mesma obra)

Etapa: id, obra_id, nome, ordem, status, data_conclusao

Atualizacao: id, obra_id, data, observacoes, arquivo_excel_url, criado_por

Midia: id, atualizacao_id, tipo (foto/video), url

Requisitos não funcionais

Interface simples e objetiva, pensada para uso em campo pelo engenheiro (upload rápido pelo celular) e leitura fácil pelo cliente

Upload de fotos/vídeos com compressão ou limite de tamanho, para não pesar o carregamento

Dados de cada obra visíveis apenas para o engenheiro responsável e os clientes vinculados (isolamento entre obras diferentes)

O que eu quero que você entregue primeiro (MVP)

Login com dois papéis (engenheiro e cliente)

Cadastro de obra e vínculo com cliente

Upload de atualização (Excel + fotos + observações) pelo engenheiro

Tela do cliente com a linha do tempo de atualizações e visualização do progresso das etapas

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://appobraviva.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/339c4503-daa2-4a31-a9ea-e92facdcdfc0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
