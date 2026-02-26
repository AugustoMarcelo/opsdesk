# OpsDesk - Plano de Correcoes e Implementacoes Pendentes

## Objetivo

Fechar lacunas entre o backlog do `README.md` (Phases/EPICs) e o estado atual do projeto, priorizando:

1. funcionalidades ausentes de alto impacto;
2. ajustes de implementacao que podem gerar regressao;
3. alinhamento documental para refletir o que ja esta pronto.

## Diagnostico Atual (README x Codigo)

### 1) EPIC 5 (GraphQL) - **Nao implementado**

No estado atual, nao ha configuracao de GraphQL na API:

- sem `@nestjs/graphql` no `AppModule`;
- sem `Resolver/Query/Mutation` para `Ticket`, `Message`, `User`, `AuditEvent`;
- sem DataLoader;
- sem subscriptions.

### 2) EPIC 8 (Observability) - **Parcial**

Ha base inicial de metricas:

- endpoint `/metrics` na API;
- interceptador de latencia/contagem HTTP;
- Prometheus no `docker-compose`.

Mas faltam itens do backlog:

- metricas do `worker` (processados/falhas/retries) expostas de forma scrapeavel;
- metricas de conexoes WebSocket ativas no `realtime`;
- dashboards versionados/provisionados de Grafana (API/Worker/Realtime);
- alertas basicos como codigo/provisionamento.

### 3) EPIC 9 (Nginx Gateway) - **Nao implementado**

Nao foram encontrados:

- servico `nginx` no `docker-compose`;
- `nginx.conf` com rotas `/api`, `/graphql`, `/ws`;
- validacao de upgrade headers para WebSocket.

### 4) Ajuste de implementacao (EPIC 3) - **Autenticacao global**

O README marca "Global auth guard on `/v1/*`" como concluido, mas a protecao atual esta aplicada por controller (`@UseGuards(AuthGuard('jwt'), PermissionsGuard)`), nao como guard global.  
Funciona para os controllers existentes, mas aumenta risco de endpoint novo nascer sem autenticacao.

### 5) Ajuste de documentacao (EPIC 4)

Itens de `US4.1` e `US4.2` aparecem sem `[x]` no README, embora o codigo mostre implementacao base de:

- autenticacao no handshake;
- rooms `ticket:{id}`;
- broadcast de `message:new` e `ticket:statusChanged`.

## Plano de Execucao (Prioridade)

## P0 - Alinhar seguranca e rastreabilidade de status

### Tarefa P0.1 - Tornar auth realmente global para rotas versionadas

- Criar guard global (ex.: `APP_GUARD`) com bypass via `@Public`.
- Garantir que `/health`, `/metrics` e `/auth/login` continuam publicos.
- Manter `PermissionsGuard` para autorizacao fina por permissao.

**Criterios de aceite**

- toda rota `/v1/*` exige token por padrao;
- e2e cobrindo 401 sem token e 200/403 com token conforme papel.

### Tarefa P0.2 - Corrigir status do README (sem mudar escopo tecnico)

- Marcar EPIC 4 (`US4.1`/`US4.2`) como concluido se a equipe considerar DoD atendido.
- Explicitar no README que EPIC 5, 8 e 9 estao pendentes/parciais.

**Criterios de aceite**

- checklist do README reflete o estado real do repositorio.

## P1 - Entregar EPIC 5 (GraphQL)

### Tarefa P1.1 - Subir GraphQL na API

- Adicionar `@nestjs/graphql` e driver Apollo.
- Configurar `GraphQLModule` no `apps/api`.
- Definir schema para `Ticket`, `Message`, `User`, `AuditEvent`.

### Tarefa P1.2 - Queries e Mutations essenciais

- Queries: `ticket(id)` e `tickets(filter, paging, sort)`.
- Mutations: `createTicket`, `changeTicketStatus`, `sendMessage`.
- Reaproveitar regras de negocio atuais dos services REST.

### Tarefa P1.3 - Seguranca e performance

- Aplicar guards/permissoes no contexto GraphQL.
- Introduzir DataLoader para evitar N+1 nas relacoes.

### Tarefa P1.4 - Testes e comparativo

- e2e de queries/mutations (sucesso + negacao de acesso).
- Atualizar README com secao "REST vs GraphQL" (trade-offs).

**Criterios de aceite**

- playground GraphQL funcional;
- cobertura minima de fluxos criticos e autorizacao.

## P2 - Completar EPIC 8 (Observability)

### Tarefa P2.1 - Padronizar metricas entre servicos

- API: manter latencia/contagem e adicionar erro por rota.
- Worker: expor endpoint `/metrics` com `processed`, `failed`, `retried`, `duplicates`.
- Realtime: expor conexoes ativas e eventos emitidos.

### Tarefa P2.2 - Prometheus e Grafana como codigo

- Expandir `prometheus.yml` para `api`, `worker` e `realtime`.
- Versionar dashboards JSON e provisionamento Grafana.

### Tarefa P2.3 - Alertas basicos

- Definir alertas minimos (error-rate alto, consumo com falha, realtime indisponivel).

**Criterios de aceite**

- 3 dashboards operacionais (`API`, `Worker`, `Realtime`);
- alertas disparando em cenarios de teste controlados.

## P3 - Entregar EPIC 9 (Nginx Gateway)

### Tarefa P3.1 - Infra e roteamento

- Adicionar servico `nginx` ao `docker-compose`.
- Criar `nginx.conf` com:
  - `/api` -> `apps/api`
  - `/graphql` -> `apps/api`
  - `/ws` -> `apps/realtime`

### Tarefa P3.2 - Hardening basico

- Headers de seguranca;
- gzip;
- suporte correto a upgrade de WebSocket.

### Tarefa P3.3 - Validacao end-to-end

- smoke tests via `curl`/scripts para REST, GraphQL e WS atraves do gateway.

**Criterios de aceite**

- trafego HTTP/WS funcionando somente via gateway;
- configuracao comentada e reproduzivel localmente.

## Ordem sugerida de entrega

1. P0 (seguranca global + README consistente);
2. P1 (GraphQL funcional);
3. P2 (observabilidade completa);
4. P3 (gateway Nginx).

## Riscos e mitigacoes

- **Risco:** adicionar GraphQL duplicando regras de negocio.  
  **Mitigacao:** reusar services existentes e evitar logica em resolver.
- **Risco:** metricas com alta cardinalidade.  
  **Mitigacao:** normalizar labels de rota/status e revisar naming.
- **Risco:** regressao em auth ao globalizar guard.  
  **Mitigacao:** e2e cobrindo rotas publicas e privadas.

## Definition of Done para este plano

- backlog/documentacao coerentes com implementacao;
- EPIC 5, 8 e 9 com entregaveis minimos operacionais;
- pipeline local (`docker compose up`) sobe stack completa com monitoramento e gateway.
