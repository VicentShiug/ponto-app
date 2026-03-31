import { describe, it, expect } from "vitest";
import { 
  parseDate, 
  formatDate, 
  formatDateISO, 
  getDay, 
  getDate, 
  getMonth, 
  getYear,
  addDays, 
  subDays, 
  startOfDay, 
  endOfDay,
  isSameDay,
  isAfter,
  isBefore,
  parseTime
} from "../lib/dates";

describe("lib/dates.ts - parseDate", () => {
  it("deve fazer parse de data no formato DD/MM/YYYY", () => {
    const date = parseDate("30/03/2026");
    expect(date.getDate()).toBe(30);
    expect(date.getMonth()).toBe(2); // 0-indexed
    expect(date.getFullYear()).toBe(2026);
  });

  it("deve lançar erro para data inválida", () => {
    expect(() => parseDate("30-03-2026")).toThrow();
    expect(() => parseDate("invalid")).toThrow();
  });
});

describe("lib/dates.ts - formatDate", () => {
  it("deve formatar data para DD/MM/yyyy", () => {
    const date = new Date(2026, 2, 30); // March 30, 2026
    expect(formatDate(date)).toBe("30/03/2026");
  });
});

describe("lib/dates.ts - formatDateISO", () => {
  it("deve formatar data para yyyy-MM-dd", () => {
    const date = new Date(2026, 2, 30);
    expect(formatDateISO(date)).toBe("2026-03-30");
  });
});

describe("lib/dates.ts - getDay", () => {
  it("deve retornar o dia da semana (0 = domingo)", () => {
    const sunday = new Date(2026, 2, 29); // Should be Sunday
    const monday = new Date(2026, 2, 30); // Should be Monday
    
    expect(getDay(sunday)).toBe(0);
    expect(getDay(monday)).toBe(1);
  });
});

describe("lib/dates.ts - getDate", () => {
  it("deve retornar o dia do mês", () => {
    const date = new Date(2026, 2, 30);
    expect(getDate(date)).toBe(30);
  });
});

describe("lib/dates.ts - getMonth", () => {
  it("deve retornar o mês (0-indexed)", () => {
    const date = new Date(2026, 2, 30);
    expect(getMonth(date)).toBe(2); // March
  });
});

describe("lib/dates.ts - getYear", () => {
  it("deve retornar o ano", () => {
    const date = new Date(2026, 2, 30);
    expect(getYear(date)).toBe(2026);
  });
});

describe("lib/dates.ts - addDays", () => {
  it("deve adicionar dias a uma data", () => {
    const date = new Date(2026, 2, 30);
    const result = addDays(date, 1);
    expect(getDate(result)).toBe(31);
  });

  it("deve adicionar dias negativos", () => {
    const date = new Date(2026, 2, 30);
    const result = addDays(date, -1);
    expect(getDate(result)).toBe(29);
  });
});

describe("lib/dates.ts - subDays", () => {
  it("deve subtrair dias de uma data", () => {
    const date = new Date(2026, 2, 30);
    const result = subDays(date, 1);
    expect(getDate(result)).toBe(29);
  });
});

describe("lib/dates.ts - startOfDay", () => {
  it("deve retornar meia-noite do dia", () => {
    const date = new Date(2026, 2, 30, 14, 30, 45);
    const result = startOfDay(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("lib/dates.ts - endOfDay", () => {
  it("deve retornar 23:59:59 do dia", () => {
    const date = new Date(2026, 2, 30, 14, 30, 45);
    const result = endOfDay(date);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});

describe("lib/dates.ts - isSameDay", () => {
  it("deve verificar se duas datas são do mesmo dia", () => {
    const date1 = new Date(2026, 2, 30, 10, 0, 0);
    const date2 = new Date(2026, 2, 30, 22, 30, 0);
    const date3 = new Date(2026, 2, 31, 10, 0, 0);
    
    expect(isSameDay(date1, date2)).toBe(true);
    expect(isSameDay(date1, date3)).toBe(false);
  });
});

describe("lib/dates.ts - isAfter", () => {
  it("deve verificar se uma data é posterior", () => {
    const date1 = new Date(2026, 2, 29);
    const date2 = new Date(2026, 2, 30);
    
    expect(isAfter(date2, date1)).toBe(true);
    expect(isAfter(date1, date2)).toBe(false);
  });
});

describe("lib/dates.ts - isBefore", () => {
  it("deve verificar se uma data é anterior", () => {
    const date1 = new Date(2026, 2, 29);
    const date2 = new Date(2026, 2, 30);
    
    expect(isBefore(date1, date2)).toBe(true);
    expect(isBefore(date2, date1)).toBe(false);
  });
});

describe("lib/dates.ts - parseTime", () => {
  it("deve fazer parse de hora no formato HH:mm", () => {
    const baseDate = new Date(2026, 2, 30);
    const result = parseTime("14:30", baseDate);
    
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});
