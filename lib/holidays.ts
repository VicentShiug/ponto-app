import { format } from 'date-fns'

export interface Holiday {
  date: string  // 'YYYY-MM-DD'
  name: string
  type: string
}

export async function getHolidays(year: number): Promise<Holiday[]> {
  try {
    const res = await fetch(
      `https://brasilapi.com.br/api/feriados/v1/${year}`,
      { next: { revalidate: 60 * 60 * 24 * 30 } } // cache 30 dias
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export function isHoliday(date: Date, holidays: Holiday[]): Holiday | undefined {
  const dateStr = format(date, 'yyyy-MM-dd')
  return holidays.find(h => h.date === dateStr)
}
