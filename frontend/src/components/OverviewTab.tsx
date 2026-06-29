import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const CHART_BAR_SCALE = [
  "#164e63",
  "#155e75",
  "#0e7490",
  "#0891b2",
  "#06b6d4",
  "#22d3ee",
  "#38bdf8",
  "#7dd3fc",
  "#a5f3fc",
  "#cffafe",
] as const

interface KpiCardProps {
  label: string
  value: string
  accent: "sky" | "amber" | "rose"
  onClick?: () => void
}

function KpiCard({ label, value, accent, onClick }: KpiCardProps) {
  const styles = {
    sky: { card: "border-l-sky-400/90", label: "text-sky-400" },
    amber: { card: "border-l-amber-400/90", label: "text-amber-400" },
    rose: { card: "border-l-rose-400/90", label: "text-rose-400" },
  } as const

  const s = styles[accent]

  return (
    <Card
      className={cn(
        "border-border/50 border-l-[3px] bg-card/60 shadow-none transition-colors",
        s.card,
        onClick && "cursor-pointer hover:bg-card/90"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <p className={cn("text-xs font-medium tracking-wide", s.label)}>
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
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

  const chartData = ranking.slice(0, 10).map((d) => ({
    name: d.nome || d.email || d.username || "-",
    gasto: d.total_gasto,
  }))

  const chartTick = { fill: "#94a3b8", fontSize: 12 }
  const chartTooltipStyle = {
    background: "#151921",
    border: "1px solid rgba(34, 211, 238, 0.18)",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontSize: "12px",
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
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.12)"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={chartTick}
                tickFormatter={(v) => fmtShortMoney(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={128}
                axisLine={false}
                tickLine={false}
                tick={chartTick}
              />
              <Tooltip
                cursor={{ fill: "rgba(34, 211, 238, 0.06)" }}
                formatter={(v) => [fmtShortMoney(Number(v)), "Gasto"]}
                contentStyle={chartTooltipStyle}
                labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
              />
              <Bar dataKey="gasto" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_BAR_SCALE[i] ?? CHART_BAR_SCALE.at(-1)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
