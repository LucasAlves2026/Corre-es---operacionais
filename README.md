# Controle de Correções Operacionais — PROSECURITY

Sistema web (HTML5 + CSS3 + JavaScript puro, sem dependências e sem bibliotecas externas).

## Estrutura de pastas
```
prosecurity-correcoes/
├── index.html      Estrutura da página (menu lateral, cabeçalho, áreas de conteúdo)
├── style.css       Padrão visual PROSECURITY (vermelho #DE262E + cinzas, Arial), responsivo
├── script.js       Toda a lógica (config, repositório, regras, telas, gráficos, exportação)
├── README.md       Este arquivo
└── assets/
    └── logo.jpg    Logo da Pro Security (cabeçalho lateral e ícone da aba)
```

## Como executar localmente
1. Mantenha a pasta inteira junta (o `index.html` usa `style.css`, `script.js` e `assets/logo.jpg`).
2. Dê dois cliques em `index.html` (Chrome, Edge ou Firefox atuais).
   - Opcional: `python -m http.server 8080` dentro da pasta e abra `http://localhost:8080`.
3. A tela de **login** abre primeiro. As contas iniciais (MESTRE, SUPERVISOR e CCO) foram entregues à parte; as senhas **não** ficam neste arquivo nem no código (só sal + hash). O sistema carrega 26 registros de DEMONSTRAÇÃO.

Os dados ficam no `localStorage` do navegador: valem só para aquele navegador/computador.
Use **Backup dos dados** (menu lateral) para exportar/restaurar em JSON.
Trocar de navegador, de endereço (file:// x localhost) ou limpar dados do navegador exibe outra base.

## Controle de acesso (versão 2.0)
| Perfil | O que pode |
|---|---|
| **MESTRE** | Tudo: Dashboard, Indicadores, todas as correções (criar, editar, mudar status, excluir), Histórico, exportação, Backup e **Usuários e acessos** (criar, editar nível, ativar/desativar, redefinir senha). |
| **CCO** | Dashboard, Indicadores, ver todas as solicitações e detalhes, mudar status, registrar **o que foi corrigido** e **quem corrigiu**, consultar histórico das tratativas, exportar. Não cria solicitações, não exclui, não administra contas. |
| **SUPERVISOR** | Somente: Nova correção e Minhas solicitações (consulta e acompanhamento do status; pode complementar a solicitação enquanto PENDENTE / AGUARDANDO INFORMAÇÃO). Sem Dashboard, indicadores, histórico geral, exportação ou administração. |

- **Contas compartilhadas:** o login identifica só o *nível*. Cada solicitação pede **Responsável pela solicitação**; cada alteração/tratativa pede **Responsável pela correção / pela alteração**. O histórico grava pessoa, conta (login), perfil, data e hora. O nome da pessoa não pode ser o próprio login/perfil.
- **Permissões na lógica:** a matriz fica em `PERMISSOES` (seção 1). Além de esconder menus, cada rota (`guardar`) e cada operação de `Servico`/`Contas` chamam `Auth.exigir(...)`; digitar o endereço (`#/dashboard`) ou chamar a função pelo console é recusado e registrado como `ACESSO_NEGADO` no registro de acessos (tela Usuários e acessos).
- Segurança de sessão: bloqueio de 5 min após 5 tentativas erradas, encerramento após 30 min sem uso, conta desativada perde o acesso na hora, não é possível desativar/rebaixar a última conta MESTRE nem a conta em uso.
- Contas iniciais têm a marca **SENHA INICIAL**; o MESTRE deve redefinir as senhas em *Usuários e acessos*.

## Funcionalidades
- **Dashboard**: cards TOTAL, PENDENTES, EM TRATATIVA, AGUARDANDO INFORMAÇÃO, CORRIGIDOS, CANCELADOS (clicáveis), total do período, tempo médio de tratativa, pendências atrasadas, evolução (dia/semana/mês), status, por tipo, supervisor e cliente, pendências mais antigas e pontos de atenção. Filtro de período (7/30/90 dias, mês atual, tudo ou datas livres).
- **Nova correção**: formulário com campos obrigatórios marcados (*), mensagens claras por campo, rascunho automático (não perde dados ao trocar de tela), preenchimento do nome pelo RE e da gestão pelo supervisor.
- **Validações**: obrigatórios, formato do RE (3 a 8 dígitos), datas válidas/não futuras, ocorrência não posterior à solicitação, informação lançada igual à correta (bloqueia), possível duplicidade (RE ou nome + cliente + data da ocorrência), RE x nome divergente e ocorrência antiga (avisam sem bloquear). Se o usuário confirmar uma duplicidade, o registro entra como DUPLICIDADE / VALIDAR.
- **Correções / Pendentes / Em tratativa / Aguardando informação / Corrigidos**: tabela operacional com as 13 colunas pedidas, ordenação, paginação, pesquisa rápida e filtros combináveis (período, supervisor, gestão, cliente, RE, colaborador, tipo, status, responsável). Filtros ficam salvos. Pendências abertas há mais de 3 dias recebem a marca ATRASADO.
- **Ações**: visualizar, editar (mantém o ID, exige motivo e grava o valor anterior), alterar status/responsável (comentário obrigatório para CANCELADO, AGUARDANDO INFORMAÇÃO e reabertura), histórico, excluir (somente PENDENTE ou DUPLICIDADE / VALIDAR, com confirmação e motivo; a exclusão e uma cópia dos dados ficam no histórico).
- **Status** sempre com texto + ícone + cor.
- **Indicadores**: evolução, status, tipo, supervisor, cliente, gestão, tempo médio por tipo e listas de inconsistências/duplicidades.
- **Histórico**: log geral somente leitura (nunca sobrescrito), com filtros e exportação CSV.
- **Exportação**: CSV (separador `;`, UTF-8 com BOM, abre no Excel) e Excel `.xlsx` real, gerado no navegador. Exporta exatamente o que está filtrado na tela.
- Responsivo: desktop, notebook, tablet e celular (a tabela vira cartões no celular).

## Pontos preparados para integração futura (nada externo foi simulado)
| Onde | O que fazer |
|---|---|
| `script.js` seção **3. REPOSITÓRIO** (`Repo`) | Única camada que usa o localStorage. Reescreva `carregar`, `salvarCorrecao`, `removerCorrecao`, `adicionarHistorico`, `proximoId`, `substituirTudo`, `removerDemo` para chamar API, banco de dados, Microsoft Excel/SharePoint (Graph API), Google Sheets ou sistema interno. Os métodos já são assíncronos. |
| `CONFIG.supervisoresLista` (34 sub áreas), `clientesLista` (721 clientes), `gestoes`; `supervisoresSugeridos`/`clientesSugeridos` são só da demonstração; `responsaveisSugeridos`, `gestoes`, `tipos` | Trocar pelas listas oficiais (cadastro/API). Hoje são exemplos; o usuário também pode digitar outros valores. |
| `Auth`, `Contas`, `Hash` | Troque por autenticação no servidor (login/SSO, bcrypt/argon2, cookie/token). A matriz `PERMISSOES` e as chamadas `Auth.exigir` continuam valendo como regra; no servidor a mesma verificação deve ser refeita em cada endpoint. |
| Campo **Evidência** | É texto (link, protocolo, descrição). Anexar arquivos exige servidor/armazenamento; não foi simulado. |
| `proximoId()` | Em produção a numeração COR-000001 deve vir do servidor para evitar conflito entre usuários. |

## Limitações desta versão
- **O login é organizacional, não segurança real.** Como tudo roda no navegador, quem abrir o DevTools ou o localStorage do computador consegue ler/alterar os dados diretamente. Para proteção real (dados diferentes por usuário, senhas fora do navegador) é necessário um servidor. O código já está separado (`Repo`, `Auth`, `Contas`, `Servico`) para essa troca.
- Contas, senhas e permissões ficam no navegador de cada computador (não sincronizam entre máquinas). O backup não inclui contas/senhas.
- Sem sincronização entre computadores (cada navegador tem sua base).
- Capacidade do localStorage: cerca de 5 MB (milhares de registros).
- Dados de demonstração têm ID `DEMO-0001...` e a marca DEMO; podem ser removidos pelo botão da faixa amarela, sem afetar registros reais.


## Modo servidor (versão 3.0) — dados compartilhados entre todas as máquinas
Veja `LEIAME_SERVIDOR.md`. Rode `iniciar.bat` (Windows) em UM computador e todos acessam `http://IP-DO-COMPUTADOR:3000`.
Login, senhas e permissões passam a ser conferidos no servidor; tudo o que é preenchido aparece nas outras máquinas em poucos segundos;
sem rede, as alterações ficam em fila e são enviadas quando a conexão volta. Abrindo o `index.html` direto do computador, continua o modo local.
