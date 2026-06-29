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

export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR") : ""

export const defaultPeriod = () => {
  const today = new Date()
  const inicio = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const fim = today.toISOString().slice(0, 10)
  return { inicio, fim }
}
