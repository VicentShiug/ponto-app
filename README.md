# PontoApp 🕐

Sistema de registro de horas trabalhadas com painel de gestor e funcionário, banco de horas, exportação de relatórios e auditoria.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Estilização:** Tailwind CSS (tema dark customizado)
- **Banco de dados:** PostgreSQL via [Neon](https://neon.tech)
- **ORM:** Prisma
- **Autenticação:** JWT em cookies HttpOnly
- **Gráficos:** Recharts
- **Exportação:** jsPDF + SheetJS (xlsx)

---

## Rodando localmente

### 1. Clone e instale as dependências

```bash
git clone <seu-repo>
cd ponto-app
npm install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@host:5432/ponto_app?sslmode=require"
JWT_SECRET="um-segredo-longo-e-aleatorio"
```

> Para o banco local, você pode usar Docker:
> ```bash
> docker run --name ponto-pg -e POSTGRES_PASSWORD=senha -p 5432:5432 -d postgres
> # DATABASE_URL="postgresql://postgres:senha@localhost:5432/ponto_app"
> ```

### 3. Configure o banco de dados

```bash
# Gera o cliente Prisma
npm run db:generate

# Cria as tabelas
npm run db:push

# Popula com dados iniciais
npm run db:seed
```

### 4. Inicie o servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## Credenciais do seed

| Tipo         | E-mail                  | Senha       |
|--------------|-------------------------|-------------|
| Gestor       | manager@empresa.com     | manager123  |
| Funcionário  | ana@empresa.com         | senha123    |
| Funcionário  | bruno@empresa.com       | senha123    |
| Funcionário  | carla@empresa.com       | senha123    |

---

## Deploy na Vercel

### 1. Crie o banco de dados no Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita
2. Crie um novo projeto
3. Copie a **Connection string** (formato `postgresql://...`)

### 2. Faça o deploy

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Faça login e deploy
vercel
```

Ou conecte o repositório diretamente no [vercel.com](https://vercel.com).

### 3. Configure as variáveis de ambiente na Vercel

No painel da Vercel, vá em **Settings → Environment Variables** e adicione:

| Variável       | Valor                                    |
|----------------|------------------------------------------|
| `DATABASE_URL` | Connection string do Neon                |
| `JWT_SECRET`   | Uma string aleatória longa e segura      |

> Gere um JWT_SECRET seguro com: `openssl rand -base64 32`

### 4. Rode o seed em produção

Após o deploy, execute o seed remotamente:

```bash
# Via Vercel CLI
vercel env pull .env.production.local
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d '=' -f2) npx prisma db push
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d '=' -f2) npm run db:seed
```

Ou configure uma rota de seed protegida por senha para rodar uma única vez.

---

## Estrutura do projeto

```
ponto-app/
├── app/
│   ├── api/
│   │   ├── auth/              # login, logout
│   │   ├── employee/clock/    # registro de ponto
│   │   └── manager/           # employees, entries, reports
│   ├── employee/
│   │   ├── dashboard/         # painel do funcionário
│   │   └── history/           # histórico + gráfico
│   ├── manager/
│   │   ├── dashboard/         # visão geral dos funcionários
│   │   ├── employees/         # gestão + detalhe por funcionário
│   │   ├── reports/           # exportação PDF e Excel
│   │   └── audit/             # log de auditoria
│   └── login/
├── components/
│   ├── AppLayout.tsx          # sidebar + mobile nav
│   ├── ClockButton.tsx        # botão sequencial de ponto
│   └── Toaster.tsx            # notificações
├── lib/
│   ├── auth.ts                # JWT, bcrypt, sessão
│   ├── prisma.ts              # cliente singleton
│   ├── hours.ts               # cálculos de horas
│   └── audit.ts               # helper de auditoria
├── prisma/
│   ├── schema.prisma          # modelo do banco
│   └── seed.ts                # dados iniciais
└── middleware.ts              # proteção de rotas
```

---

## Funcionalidades

### Funcionário
- ✅ Botão sequencial de ponto (Entrada → Almoço → Volta → Saída)
- ✅ Opção de pular intervalo
- ✅ Dashboard com saldo do banco de horas
- ✅ Calendário mensal com status por dia
- ✅ Gráfico de horas por semana
- ✅ Histórico detalhado

### Gestor
- ✅ Dashboard com status de todos os funcionários em tempo real
- ✅ Cadastro, edição e desativação de funcionários
- ✅ Configuração de carga horária e modo (banco de horas / hora extra) por funcionário
- ✅ Edição de qualquer registro de ponto
- ✅ Ajuste manual do banco de horas (adicionar ou descontar) com motivo
- ✅ Exportação de relatórios em PDF e Excel por funcionário e período
- ✅ Log de auditoria com todas as alterações

---

## Licença

MIT
