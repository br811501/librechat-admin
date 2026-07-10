export const fmt = (n: number) => Number(n).toLocaleString("pt-BR")

export const fmtCurrency = (n: number) =>
  Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const fmtShortMoney = (n: number) => {
  const x = Number(n)
  if (Number.isNaN(x)) return "-"
  if (Math.abs(x) >= 1_000_000) {
    const scaled = Math.trunc((x / 1_000_000) * 1000) / 1000
    return `$ ${scaled.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
  }
  return `$ ${x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000

const parseDateValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const hasExplicitTimezone = /[zZ]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)
  if (hasExplicitTimezone) {
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/
  )

  if (match) {
    const [, year, month, day, hour = "00", minute = "00", second = "00", millis = "0"] = match
    const utcMs = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(`${millis.padEnd(3, "0")}`)
    )
    return new Date(utcMs + BRASILIA_OFFSET_MS)
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export const fmtDate = (s: string | null | undefined) => {
  if (!s) return ""

  const date = parseDateValue(String(s))
  if (!date) return ""

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export const defaultPeriod = () => {
  const today = new Date()
  const inicio = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const fim = today.toISOString().slice(0, 10)
  return { inicio, fim }
}
