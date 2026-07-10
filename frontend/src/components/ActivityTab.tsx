import { useEffect, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { api, type AtividadeResponse } from "@/lib/api"
import { fmt } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ActivityTabProps {
  period: { inicio: string; fim: string }
  onPeriodChange: (period: { inicio: string; fim: string }) => void
}

export function ActivityTab({ period, onPeriodChange }: ActivityTabProps) {
  const [data, setData] = useState<AtividadeResponse | null>(null)

  useEffect(() => {
    if (!period.inicio || !period.fim) return
    api
      .atividade(period.inicio, period.fim)
      .then(setData)
      .catch(console.error)
  }, [period.inicio, period.fim])

  const chartData = (data?.dias ?? []).map((item) => ({
    ...item,
    diaLabel: new Date(item.dia).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="atividade-inicio">Início</Label>
          <Input
            id="atividade-inicio"
            type="date"
            value={period.inicio}
            onChange={(e) =>
              onPeriodChange({ ...period, inicio: e.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="atividade-fim">Fim</Label>
          <Input
            id="atividade-fim"
            type="date"
            value={period.fim}
            onChange={(e) => onPeriodChange({ ...period, fim: e.target.value })}
          />
        </div>
        <Button onClick={() => onPeriodChange({ ...period })}>Aplicar</Button>
        <p className="text-sm text-muted-foreground">
          Período: {period.inicio} até {period.fim}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/50 bg-card/60 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium tracking-wide text-sky-400">
              Média de usuários &gt; 10 msgs/dia
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
              {fmt(data?.media_usuarios_acima_10 ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium tracking-wide text-amber-400">
              Mensagens no período
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
              {fmt(data?.total_mensagens ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium tracking-wide text-rose-400">
              Usuários únicos acima do limite
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
              {fmt(data?.total_usuarios_acima_10 ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/60 p-4 shadow-none">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">
            Mensagens por dia e usuários acima de 10
          </h3>
          <span className="text-xs text-muted-foreground">
            {data?.dias_com_usuarios_acima_10 ?? 0} dias com pico acima do limite
          </span>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis
                dataKey="diaLabel"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#151921",
                  border: "1px solid rgba(34, 211, 238, 0.18)",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                }}
              />
              <Line
                type="monotone"
                dataKey="mensagens"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="usuarios_acima_10"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="border-border/50 bg-card/60 shadow-none">
        <CardContent className="p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">
              Usuários com mais de 10 mensagens em um dia
            </h3>
            <span className="text-xs text-muted-foreground">
              Lista consolidada do período
            </span>
          </div>
          <div className="max-h-[320px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Dias acima de 10</TableHead>
                  <TableHead>Máx. em um dia</TableHead>
                  <TableHead>Total no período</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.usuarios_acima_10 ?? []).map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>
                      <div className="font-medium">{u.nome || u.username || u.email || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.username || u.email || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{u.dias_acima}</TableCell>
                    <TableCell>{u.max_mensagens_dia}</TableCell>
                    <TableCell>{u.total_mensagens}</TableCell>
                  </TableRow>
                ))}
                {!data?.usuarios_acima_10?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Nenhum usuário atingiu o limite no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
