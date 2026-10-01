# Servidor central — Controle de Correções Operacionais

Com o servidor, **todas as máquinas usam a mesma base de dados**. O que um supervisor preenche aparece para o CCO e o MESTRE
em poucos segundos (atualização automática a cada ~10 s), independente do computador. Sem Wi-Fi/rede, a pessoa continua
trabalhando: as alterações ficam em **fila** (indicador "Sem conexão · N na fila" no topo) e são enviadas sozinhas quando a conexão volta.

## 1. Instalar (uma vez, no computador que ficará ligado)
1. Instale o **Node.js LTS** (https://nodejs.org). Não há mais nada para instalar.
2. Copie esta pasta inteira para o computador (ex.: `C:\Correcoes`).
3. Dê dois cliques em **`iniciar.bat`**. A janela mostra os endereços, por exemplo `http://192.168.0.25:3000`.
4. Na primeira vez o Windows pergunta sobre o Firewall: clique em **Permitir acesso** (rede privada).

## 2. Usar
- Todos abrem o endereço mostrado (Chrome/Edge) e entram com login e senha. Dica: crie um atalho/favorito.
- **A janela do servidor precisa ficar aberta** e o computador ligado. Se cair, ninguém perde nada: cada máquina guarda a fila e envia quando o servidor voltar.
- Para não depender de uma pessoa, use um computador/servidor da empresa e configure para iniciar com o Windows (Agendador de Tarefas > "Ao iniciar o computador" > `iniciar.bat`). Peça um IP fixo/reserva no roteador para o endereço não mudar.

## 3. Onde ficam os dados
- `dados/dados.json` (todas as solicitações, histórico, contas e registro de acessos).
- Cópias automáticas a cada hora em `dados/backups/` (mantém as últimas 60). **Copie essa pasta para outro lugar/nuvem periodicamente.**
- Para restaurar: feche o servidor, substitua `dados/dados.json` por uma cópia e inicie de novo.

## 4. Como funciona (resumo)
- Login e senha são conferidos **no servidor** (senha com sal + 20.000 rodadas de SHA-256; nunca guardada em texto). Bloqueio de 5 min após 5 erros.
- O servidor aplica as permissões de cada perfil em cada operação. Um SUPERVISOR só recebe as solicitações do seu escopo, e o servidor recusa exclusão, tratativa ou administração vindas dele, mesmo que alguém tente chamar a API direto.
- Se duas pessoas alterarem o mesmo registro ao mesmo tempo, a segunda recebe um aviso e refaz a alteração (nada é sobrescrito em silêncio).
- Os números das solicitações no modo servidor têm o formato `COR-AAMMDD-HHMMSS-XXXX` (únicos mesmo com várias máquinas offline).

## 5. Limites (leia)
- **O tráfego é HTTP, sem criptografia**, dentro da rede da empresa: a senha viaja em texto na rede local. Use só em rede confiável (Wi-Fi corporativo protegido). Para criptografar (HTTPS), coloque o servidor atrás de um proxy com certificado (Nginx/IIS) com apoio de quem administra a rede.
- Para acessar de fora da empresa é preciso VPN; não exponha a porta 3000 na internet.
- Contas e senhas criadas pelo MESTRE ficam no servidor e valem em todas as máquinas. Alterar a matriz de permissões exige editar **`script.js` e `server.js`** (mesma matriz nos dois).
- Login só funciona com a rede/servidor disponível. Quem já está logado continua trabalhando offline; quem sair com itens na fila é avisado.
- Atualização entre máquinas não é instantânea: é a cada ~10 s (ajuste em `CONFIG.sincronizacaoSegundos`).
- Este servidor é simples (um arquivo, sem banco de dados). Serve bem para dezenas de usuários; para volumes maiores, migre para um banco (a camada `Repo`/`server.js` foi separada para isso).
