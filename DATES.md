# Padrão de Datas - PontoApp

Este documento estabelece o padrão de manipulação de datas no projeto PontoApp, utilizando a biblioteca **date-fns** para evitar bugs de timezone e inconsistências.

## Biblioteca

- **date-fns** - Funções puras de data (instalado)
- **date-fns-tz** - Operações com timezone explícito (instalado)

## Arquivo Central: lib/dates.ts

Todas as operações de data devem usar funções deste arquivo. Não use `new Date()` com cálculos manuais diretamente.

### Importação

```typescript
import { 
  parseDate,        // Parse de string DD/MM/YYYY
  formatDate,       // Formata para DD/MM/yyyy
  formatDateISO,   // Formata para yyyy-MM-dd
  formatTime,       // Formata para HH:mm
  getDay,           // Dia da semana (0=domingo)
  getDate,          // Dia do mês
  getMonth,         // Mês (0-indexed)
  getYear,          // Ano
  addDays,          // Adiciona dias
  subDays,          // Subtrai dias
  addMonths,        // Adiciona meses
  subMonths,        // Subtrai meses
  startOfDay,       // 00:00:00 do dia
  endOfDay,         // 23:59:59 do dia
  startOfMonth,     // Primeiro dia do mês
  endOfMonth,       // Último dia do mês
  isSameDay,        // Compara se são do mesmo dia
  isAfter,          // Verifica se é posterior
  isBefore,         // Verifica se é anterior
  isWithinInterval, // Verifica se está dentro do intervalo
  toZonedTime,      // Converte UTC para timezone
  fromZonedTime,    // Converte timezone para UTC
} from "@/lib/dates";
```

## Exemplos de Uso

### Parse de string para Date

```typescript
import { parseDate } from "@/lib/dates";

// De string DD/MM/YYYY
const date = parseDate("30/03/2026");
```

### Formatação

```typescript
import { formatDate, formatDateISO, formatTime } from "@/lib/dates";

formatDate(new Date());        // "30/03/2026"
formatDateISO(new Date());     // "2026-03-30"
formatTime(date);             // "14:30" ou "--:--" se null
```

### Manipulação

```typescript
import { addDays, subDays, startOfDay, endOfDay } from "@/lib/dates";

addDays(date, 7);             // +7 dias
subDays(date, 1);            // -1 dia
startOfDay(date);            // 00:00:00
endOfDay(date);              // 23:59:59
```

### Obter componentes

```typescript
import { getDay, getDate, getMonth, getYear } from "@/lib/dates";

getDay(date);     // 0=domingo, 1=segunda, ..., 6=sábado
getDate(date);   // 30
getMonth(date);   // 2 (março, 0-indexed)
getYear(date);    // 2026
```

### Comparações

```typescript
import { isSameDay, isAfter, isBefore, isWithinInterval } from "@/lib/dates";

isSameDay(date1, date2);                    // true/false
isAfter(date1, date2);                     // true/false
isBefore(date1, date2);                     // true/false
isWithinInterval(date, { start, end });     // true/false
```

### Queries Prisma

```typescript
import { startOfDay, endOfDay } from "@/lib/dates";

// Buscar registros de um dia específico
const entries = await prisma.timeEntry.findMany({
  where: { 
    date: { 
      gte: startOfDay(startDate), 
      lte: endOfDay(endDate) 
    } 
  },
});
```

## Regras Obrigatórias

### ✅ FAÇA

- Use sempre funções de `lib/dates.ts`
- Use `startOfDay()` para buscas por dia no banco
- Use `formatDate()` para exibição em Pt-BR
- Use `formatDateISO()` para serialização

### ❌ NÃO FAÇA

- Não use `new Date(ano, mes, dia)` diretamente
- Não use `date.getDay()`, `date.getDate()`, etc.
- Não use `date.toISOString()` para datas de negócio
- Não use `date.toUTCString()`
- Não use `date.setDate()`, `date.setHours()`, etc.

## Timezone

O projeto usa o timezone `America/Sao_Paulo` para operações que necessitam de timezone explícito:

```typescript
import { TIMEZONE, toZonedTime, fromZonedTime } from "@/lib/dates";

// Converter UTC do banco para horário de Brasília
const local = toZonedTime(dateFromDB, TIMEZONE);

// Converter input local para UTC antes de salvar
const utc = fromZonedTime(localDate, TIMEZONE);
```

## Testes

Execute os testes com:

```bash
npx vitest run
```

## Arquivos Modificados

A migração foi aplicada em todos os seguintes arquivos:

### APIs
- app/api/employee/clock/route.ts
- app/api/employee/entries/[id]/route.ts
- app/api/manager/entries/[id]/route.ts
- app/api/manager/reports/route.ts
- app/api/ponto/importar-csv/route.ts
- app/api/ponto/importar-csv/preview/route.ts

### Pages
- app/employee/dashboard/page.tsx
- app/employee/history/page.tsx
- app/employee/bank/page.tsx
- app/manager/dashboard/page.tsx
- app/manager/employees/[id]/page.tsx

### Components
- app/employee/dashboard/DashboardClient.tsx
- app/employee/history/HistoryClient.tsx
- app/employee/bank/BankClient.tsx
- app/manager/dashboard/DashboardClient.tsx
- app/manager/employees/[id]/DetailClient.tsx

### Outros
- prisma/seed.ts
- app/login/page.tsx
- lib/dates.ts (novo)
- lib/hours.ts (atualizado)
