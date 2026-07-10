import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { api, type RankingItem, type Resumo } from "@/lib/api"
import { defaultPeriod, fmt, fmtShortMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CHART_COLORS = {
  stroke: "#d4af37",
  fill: "rgba(212, 175, 55, 0.16)",
} as const

interface KpiCardProps {
  label: string
  value: string
  accent: "sky" | "amber" | "rose"
  onClick?: () => void
}

function KpiCard({ label, value, accent, onClick }: KpiCardProps) {
  const styles = {
    sky: {
      bg: "from-sky-500/10 to-sky-500/5",
      border: "border-sky-400/20",
      dot: "bg-sky-400",
      label: "text-sky-300",
      value: "text-sky-50",
    },
    amber: {
      bg: "from-amber-500/10 to-amber-500/5",
      border: "border-amber-400/20",
      dot: "bg-amber-400",
      label: "text-amber-300",
      value: "text-amber-50",
    },
    rose: {
      bg: "from-rose-500/10 to-rose-500/5",
      border: "border-rose-400/20",
      dot: "bg-rose-400",
      label: "text-rose-300",
      value: "text-rose-50",
    },
  } as const

  const s = styles[accent]

  return (
    <Card
      className={cn(
        "relative overflow-hidden border bg-gradient-to-br shadow-sm transition-all duration-300",
        s.bg,
        s.border,
        onClick && "cursor-pointer hover:shadow-lg hover:scale-105 hover:border-opacity-100"
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-2 h-2 rounded-full", s.dot)} />
              <p className={cn("text-xs font-medium tracking-wider uppercase", s.label)}>
                {label}
              </p>
            </div>
            <p className={cn("text-3xl font-bold tabular-nums tracking-tight", s.value)}>
              {value}
            </p>
          </div>
          <div className={cn("w-12 h-12 rounded-lg opacity-10", s.dot)} />
        </div>
      </CardContent>
    </Card>
  )
}

interface OverviewTabProps {
  period: { inicio: string; fim: string }
  onPeriodChange: (period: { inicio: string; fim: string }) => void
  onRankingLoaded: (data: RankingItem[]) => void
}

export function OverviewTab({
  period,
  onPeriodChange,
  onRankingLoaded,
}: OverviewTabProps) {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [showBaixo, setShowBaixo] = useState(false)
  const [showZero, setShowZero] = useState(false)

  useEffect(() => {
    api.resumo().then(setResumo).catch(console.error)
  }, [])

  useEffect(() => {
    if (!period.inicio || !period.fim) return
    api
      .ranking(period.inicio, period.fim)
      .then((data) => {
        setRanking(data)
        onRankingLoaded(data)
      })
      .catch(console.error)
  }, [period.inicio, period.fim, onRankingLoaded])

  const chartData = ranking.slice(0, 10).map((d, index) => ({
    name: d.nome || d.email || d.username || "-",
    gasto: d.total_gasto,
    rank: index + 1,
  }))

  const chartTick = { fill: "#94a3b8", fontSize: 12 }
  const splitLabelIntoLines = (value: string, maxChars = 18) => {
    if (!value) return ["-"]

    const words = value.split(/\s+/).filter(Boolean)
    if (!words.length) return ["-"]

    if (words.length === 1) {
      return value.length > maxChars ? [`${value.slice(0, maxChars - 1)}…`] : [value]
    }

    const lines: string[] = []
    let current = ""

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word
      if (next.length <= maxChars) {
        current = next
      } else {
        if (current) lines.push(current)
        current = word
      }
    })

    if (current) lines.push(current)
    return lines.slice(0, 2)
  }

  const CustomAxisTick = ({ x, y, payload }: any) => {
    const lines = splitLabelIntoLines(String(payload?.value ?? "-"))

    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor="middle" fill="#94a3b8" fontSize={12}>
          {lines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 16 : 14}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    )
  }

  const chartTooltipStyle = {
    background: "transparent",
    border: "none",
    padding: 0,
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    const item = payload[0]
    const value = Number(item?.value ?? 0)

    return (
      <div className="rounded-2xl border border-white/10 bg-[#111827]/95 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Usuário
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm text-amber-300">
          {fmtShortMoney(value)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Usuários ativos"
          value={fmt(resumo?.total_usuarios ?? 0)}
          accent="sky"
        />
        <KpiCard
          label="Saldo baixo · clique para detalhes"
          value={fmt(resumo?.saldo_baixo ?? 0)}
          accent="amber"
          onClick={() => setShowBaixo((v) => !v)}
        />
        <KpiCard
          label="Saldo zerado · clique para detalhes"
          value={fmt(resumo?.saldo_zerado ?? 0)}
          accent="rose"
          onClick={() => setShowZero((v) => !v)}
        />
      </div>

      {showBaixo && (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="font-medium">Usuários com saldo baixo</p>
            {(resumo?.saldo_baixo_list ?? []).map((u, i) => (
              <p key={i}>
                <span className="font-medium">{u.nome || "-"}</span>{" "}
                <span className="text-muted-foreground">{u.username}</span> —{" "}
                {fmt(u.tokenCredits ?? 0)} créditos
              </p>
            ))}
            {!resumo?.saldo_baixo_list?.length && (
              <p className="text-muted-foreground">Nenhum</p>
            )}
          </CardContent>
        </Card>
      )}

      {showZero && (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="font-medium">Usuários com saldo zerado</p>
            {(resumo?.saldo_zerado_list ?? []).map((u, i) => (
              <p key={i}>
                <span className="font-medium">{u.nome || "-"}</span>{" "}
                <span className="text-muted-foreground">{u.username}</span>
              </p>
            ))}
            {!resumo?.saldo_zerado_list?.length && (
              <p className="text-muted-foreground">Nenhum</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="top-inicio">Início</Label>
          <Input
            id="top-inicio"
            type="date"
            value={period.inicio}
            onChange={(e) =>
              onPeriodChange({ ...period, inicio: e.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="top-fim">Fim</Label>
          <Input
            id="top-fim"
            type="date"
            value={period.fim}
            onChange={(e) =>
              onPeriodChange({ ...period, fim: e.target.value })
            }
          />
        </div>
        <Button onClick={() => onPeriodChange({ ...period })}>Aplicar</Button>
        <p className="text-sm text-muted-foreground">
          Período: {period.inicio} até {period.fim}
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Top 10 gastos</h3>
          <span className="text-xs text-muted-foreground">USD no período</span>
        </div>
        <Card className="border-border/50 bg-card/60 p-4 shadow-none">
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart
              data={chartData}
              margin={{ left: 20, right: 28, top: 10, bottom: 14 }}
            >
              <defs>
                <linearGradient id="gastoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.stroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.12)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={<CustomAxisTick />}
                interval={0}
                height={110}
                minTickGap={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={chartTick}
                tickFormatter={(v) => fmtShortMoney(Number(v))}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                content={<CustomTooltip />}
                contentStyle={chartTooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="gasto"
                stroke={CHART_COLORS.stroke}
                fill="url(#gastoGradient)"
                strokeWidth={2.4}
                activeDot={{ r: 5, strokeWidth: 0, fill: CHART_COLORS.stroke }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
