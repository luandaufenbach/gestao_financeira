# Gestão Financeira

Aplicação web de controle financeiro pessoal: lançamentos de receitas e despesas,
compras parceladas no cartão, categorias, metas de economia e um dashboard mensal.

Multi-usuário, com autenticação por JWT — cada conta enxerga apenas os próprios dados.

**[Acessar a aplicação](https://gestao-financeira-web-pmey.onrender.com)**

> Hospedada no plano gratuito do Render, onde a API hiberna sem tráfego. A
> primeira visita depois de um período parado espera cerca de 50 segundos
> enquanto o processo sobe — a tela de login parece travada nesse intervalo.
> Da segunda requisição em diante, normal.

---

## Stack

| Camada   | Tecnologias                                                          |
| -------- | -------------------------------------------------------------------- |
| Backend  | Node.js 20+, Express 5, Mongoose 9, MongoDB, Zod, JWT, bcrypt         |
| Frontend | Vue 3 (`<script setup>`), Vite 7, Vue Router 4, Tailwind 4, Chart.js  |
| Testes   | Vitest, Supertest, mongodb-memory-server                             |
| Qualidade| ESLint 9 (flat config), Prettier                                      |

---

## Como rodar

Pré-requisitos: **Node.js 20+** e uma instância de **MongoDB** (local ou Atlas).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `.env` e preencha `MONGO_URI` e `JWT_SECRET`. Para gerar o segredo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Suba o servidor:

```bash
npm run dev
```

A API fica em `http://localhost:3000`. O endpoint `GET /health` responde sem autenticação.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

A aplicação abre em `http://localhost:5173`. Crie uma conta na tela inicial — o
registro já cadastra um conjunto de categorias padrão.

> Se mudar a porta do frontend, inclua a nova origem em `CORS_ORIGINS` no `.env`
> do backend, senão o navegador bloqueia as requisições.

---

## Scripts

Disponíveis em `backend/` e `frontend/`:

| Comando                | O que faz                                      |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Sobe em modo desenvolvimento com hot reload    |
| `npm run lint`         | Roda o ESLint corrigindo o que for automático  |
| `npm run lint:check`   | Roda o ESLint sem alterar arquivos (para CI)   |
| `npm run format`       | Formata tudo com o Prettier                    |
| `npm run format:check` | Verifica a formatação sem alterar (para CI)    |

Só no `backend/`:

| Comando              | O que faz                                              |
| -------------------- | ------------------------------------------------------ |
| `npm test`           | Roda a suíte completa (MongoDB em memória, sem mocks)   |
| `npm run test:watch` | Testes em modo observação                              |
| `npm start`          | Sobe em modo produção                                  |

Só no `frontend/`:

| Comando           | O que faz                              |
| ----------------- | -------------------------------------- |
| `npm run build`   | Gera o build de produção em `dist/`    |
| `npm run preview` | Serve o build gerado, para conferência |

---

## Arquitetura

```
backend/src/
├── config/env.js         Validação das variáveis de ambiente no boot
├── database/             Conexão com o MongoDB e sincronização de índices
├── models/               Schemas do Mongoose
├── validators/           Schemas Zod (validação e sanitização das entradas)
├── middlewares/          auth (JWT), validate, errorHandler
├── controllers/          Regras de negócio
├── routes/               Definição dos endpoints
├── utils/                date (UTC), money (centavos), AppError, asyncHandler
├── app.js                Montagem do Express e middlewares
└── server.js             Inicialização e encerramento controlado

frontend/src/
├── services/
│   ├── http.js           Cliente HTTP: token, checagem de status, ApiError
│   ├── api.js            Um método por endpoint
│   └── use*.js           Composables (estado por componente)
├── stores/               Estado compartilhado (auth, categorias) — singletons
├── components/           Componentes reutilizáveis
├── views/                Telas ligadas às rotas
└── router/               Rotas e guard de autenticação
```

### Decisões que valem conhecer

**Dinheiro é sempre inteiro, em centavos.** Todo campo monetário no banco e na API
usa o sufixo `InCents` e guarda um inteiro. Ponto flutuante não representa
decimais exatamente (`0.1 + 0.2 !== 0.3`), e o erro se acumulava nas somas do
dashboard. A conversão para reais acontece só na exibição, em
`frontend/src/services/useFormatters.js`.

**Datas são sempre UTC.** As datas são gravadas ancoradas em `00:00:00.000Z` e os
intervalos de mês são calculados com `Date.UTC` (`backend/src/utils/date.js`).
Calcular o intervalo no fuso local do servidor fazia toda transação do dia 1º cair
no mês anterior, e a exibição adiantava a data em um dia.

**Parcelas fecham exatamente.** `splitIntoInstallments` distribui o resto da divisão
entre as primeiras parcelas, então a soma é sempre igual ao total
(R$100 em 3x = 33,34 + 33,33 + 33,33). Cada parcela também guarda
`installment.totalValueInCents`, o valor total da compra — a edição lê esse campo
em vez de tentar deduzir o total a partir de uma parcela.

**Rotas são protegidas por padrão.** No backend, `authenticate` é aplicado no nível
do `app.js`, não rota a rota. No frontend, o guard exige sessão em tudo que não
declare `meta.public`. Endpoints e telas novas nascem protegidos.

**Erros têm um único caminho.** Os controllers lançam `AppError`; o
`errorHandler` traduz para o status HTTP correto. O frontend recebe erros como
`ApiError`, com `displayMessage` pronta para exibir.

---

## API

Todas as rotas exigem `Authorization: Bearer <token>`, exceto `/health` e
`/auth/register` e `/auth/login`.

| Método   | Rota                            | Descrição                                    |
| -------- | ------------------------------- | -------------------------------------------- |
| `POST`   | `/auth/register`                | Cria conta e devolve token                   |
| `POST`   | `/auth/login`                   | Autentica e devolve token                    |
| `GET`    | `/auth/me`                      | Dados do usuário autenticado                 |
| `GET`    | `/transactions`                 | Lista. Filtros: `year`, `month`, `type`, `category`, `limit` |
| `POST`   | `/transactions`                 | Cria (parcela automaticamente se `installments > 1`) |
| `PATCH`  | `/transactions/:id`             | Atualiza                                     |
| `DELETE` | `/transactions/:id`             | Exclui. `?scope=group` apaga todas as parcelas |
| `GET`    | `/categories`                   | Lista                                        |
| `POST`   | `/categories`                   | Cria                                         |
| `PATCH`  | `/categories/:id`               | Atualiza                                     |
| `DELETE` | `/categories/:id`               | Exclui (409 se estiver em uso)               |
| `GET`    | `/goals`                        | Lista                                        |
| `POST`   | `/goals`                        | Cria                                         |
| `PATCH`  | `/goals/:id`                    | Atualiza                                     |
| `DELETE` | `/goals/:id`                    | Exclui                                       |
| `GET`    | `/bank-cards`                   | Lista                                        |
| `POST`   | `/bank-cards`                   | Cria                                         |
| `PATCH`  | `/bank-cards/:id`               | Atualiza                                     |
| `DELETE` | `/bank-cards/:id`               | Exclui (desvincula as transações)            |
| `GET`    | `/bank-cards/:id/invoices`      | Faturas recentes, com total e status         |
| `GET`    | `/bank-cards/:id/invoices/:cycle` | Detalhe da fatura, agrupado por categoria  |
| `GET`    | `/dashboard/monthly-balance`    | Saldo, receitas e despesas do mês            |
| `GET`    | `/dashboard/saved-money`        | Valor guardado no mês                        |
| `GET`    | `/dashboard/saved-money-total`  | Valor guardado acumulado                     |
| `GET`    | `/dashboard/category-breakdown` | Gastos por categoria no mês                  |

As rotas do dashboard aceitam `?year=&month=` e usam o mês atual quando omitidos.

### Tipos de transação

| Tipo              | Significado         | Categoria   | Caixa   | Competência |
| ----------------- | ------------------- | ----------- | ------- | ----------- |
| `income`          | Receita             | não usa     | soma    | soma        |
| `debit`           | Despesa no débito   | obrigatória | subtrai | subtrai     |
| `credit`          | Despesa no crédito  | obrigatória | **—**   | subtrai     |
| `savings`         | Guardar na reserva  | não usa     | subtrai | —           |
| `withdrawal`      | Resgatar da reserva | não usa     | soma    | —           |
| `invoice_payment` | Pagar fatura        | não usa     | subtrai | —           |

**Compra no crédito não sai do caixa no dia da compra.** O dinheiro continua na
conta; o que você contraiu foi uma dívida. Ele sai quando a fatura é paga.
Contar os dois momentos somaria o mesmo gasto duas vezes.

`savings`/`withdrawal` e `invoice_payment` são **transferências**: movem dinheiro
entre bolsos sem alterar o patrimônio, por isso ficam fora da competência.

Um resgate maior que o saldo da reserva é recusado com 400, informando quanto
está disponível.

### Faturas de cartão de crédito

Um cartão de crédito com `closingDay` e `dueDay` configurados passa a ter
faturas. Elas **não são armazenadas** — são calculadas a partir do ciclo do
cartão, das compras no intervalo e dos pagamentos marcados com aquele ciclo.
Assim é impossível o total ficar dessincronizado quando você edita uma compra.

A fatura é identificada pelo ano-mês do **vencimento** (`"2026-08"`), como os
bancos fazem. Atenção: uma fatura que fecha em 01/08 contém compras de 02/07 a
01/08 — quase tudo de julho, mas se chama "fatura de agosto". A interface sempre
mostra as duas datas junto do nome para não deixar dúvida.

| Status    | Quando                                    |
| --------- | ----------------------------------------- |
| `vazia`   | sem compras e sem pagamentos              |
| `aberta`  | nada pago e o vencimento ainda não chegou |
| `parcial` | pago em parte, ainda dentro do prazo      |
| `paga`    | pagamentos somam o total ou mais          |
| `vencida` | passou do vencimento sem quitar           |

O pagamento parcial e o antecipado funcionam sem nenhuma peça extra: vários
`invoice_payment` podem apontar para o mesmo ciclo, e o status sai da soma.

Toda compra `credit` **exige `bankCard`**: é o vínculo que a coloca numa fatura.
Se o seu banco tem lançamentos antigos sem cartão (de antes de o formulário ter
o campo), eles não aparecem em fatura nenhuma — vincule-os com:

```bash
node scripts/backfillCreditCard.js          # simula
node scripts/backfillCreditCard.js --apply  # grava
```

O script só age quando o usuário tem exatamente um cartão de crédito; com mais
de um ele apenas relata, porque não há como adivinhar onde a compra foi feita.

**Saldo do mês significa dinheiro disponível**, não resultado contábil: recebeu
R$ 500 e guardou R$ 200 → saldo R$ 300, porque os R$ 200 saíram da conta corrente.

Contabilmente, guardar é uma transferência entre contas e não reduziria o
patrimônio. Como o saldo sozinho passa a não distinguir "guardei 200" de
"gastei 200", `/dashboard/monthly-balance` devolve as parcelas separadas —
`incomeInCents`, `expenseInCents`, `savedInCents`, `withdrawnInCents` — mais
`netResultInCents` (receitas − despesas, ignorando as transferências para a
reserva). O card do dashboard mostra a composição inteira.

### Exemplo

```bash
# Criar conta
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Fulano","email":"fulano@exemplo.com","password":"senha1234"}'

# Lançar uma compra de R$ 100,00 em 3x (valores em CENTAVOS)
curl -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "credit",
    "description": "Notebook",
    "totalValueInCents": 10000,
    "date": "2026-03-15",
    "category": "<id-da-categoria>",
    "installments": 3
  }'
```

---

## Testes

```bash
cd backend
npm test
```

A suíte sobe um MongoDB real em memória, sem mocks — as regressões cobertas
(intervalos de mês em UTC, índice único com collation, agregações) dependem do
comportamento real do banco.

Cobertura: autenticação e isolamento entre usuários, aritmética de parcelamento,
intervalos de data, validação de entrada e as regras de exclusão.

---

## Deploy

A aplicação está descrita em [`render.yaml`](render.yaml): um serviço Node para
a API e um site estático para o frontend. O banco continua no MongoDB Atlas, que
já é gerenciado e não entra no blueprint.

### 1. Liberar o acesso do Atlas

No painel do Atlas, em **Network Access**, adicione `0.0.0.0/0`.

O plano gratuito do Render não oferece IP fixo de saída, então não há faixa
específica para autorizar. Quem protege o banco continua sendo a senha da
string de conexão — a lista de IPs é uma segunda camada, não a única.

### 2. Criar os serviços

No Render: **New** → **Blueprint** → aponte para este repositório. Ele lê o
`render.yaml` e cria os dois serviços de uma vez.

A única variável que ele vai perguntar é a `MONGO_URI`. O `JWT_SECRET` é
gerado pelo próprio Render e nunca passa pelo git.

### 3. Conferir os endereços

O subdomínio `.onrender.com` é único entre todas as contas do Render. Quando o
nome já pertence a alguém, o Render **não avisa**: ele acrescenta um sufixo
aleatório e segue. Foi o que aconteceu com a API deste projeto, que ficou em
`gestao-financeira-api-jpdi.onrender.com` porque `gestao-financeira-api` é de
outra conta.

Isso importa mais do que parece. Um `VITE_API_URL` apontando para o nome sem
sufixo mandaria as credenciais de login para o servidor de um terceiro. Copie
os endereços do painel; não deduza pelo nome do serviço.

Depois do primeiro deploy, confira:

- na API, `CORS_ORIGINS` precisa ser a URL exata do frontend;
- no frontend, `VITE_API_URL` precisa ser a URL exata da API.

`VITE_API_URL` é lida em tempo de **build** e embutida no bundle: depois de
corrigi-la, refaça o deploy do frontend. Só reiniciar não adianta.

### O que esperar do plano gratuito

O serviço da API hiberna depois de um período sem tráfego. A primeira visita
seguinte espera o processo subir de novo, o que leva cerca de 50 segundos — a
tela de login parece travada nesse intervalo. O site estático não hiberna.

---

## Segurança

- Senhas com hash bcrypt (12 rounds); o hash nunca sai do banco (`select: false`).
- Todas as rotas de recurso exigem JWT e são filtradas pelo usuário autenticado.
- CORS restrito a uma allowlist explícita.
- Rate limiting: 10 requisições/15min nas rotas de credenciais, 1000/15min no geral.
- Cabeçalhos de segurança via Helmet.
- Entradas validadas com Zod em modo `.strict()`, que rejeita campos não declarados
  (proteção contra mass assignment).
- Login não revela se um e-mail existe, nem pela mensagem nem pelo tempo de resposta.

Nunca versione o arquivo `.env` — ele já está no `.gitignore`.
