import { useCallback, useEffect, useState } from "react"
import { api, type RankingItem } from "@/lib/api"
import { fmtShortMoney } from "@/lib/format"
import { Button } from "@/components/ui/button"
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

interface SpendingTabProps {
  period: { inicio: string; fim: string }
  onPeriodChange: (period: { inicio: string; fim: string }) => void
  ranking: RankingItem[]
  onRefresh: () => void
}

export function SpendingTab({
  period,
  onPeriodChange,
  ranking,
  onRefresh,
}: SpendingTabProps) {
  const [data, setData] = useState<RankingItem[]>(ranking)

  useEffect(() => {
    setData(ranking)
  }, [ranking])

  const load = useCallback(() => {
    if (!period.inicio || !period.fim) return
    api.ranking(period.inicio, period.fim).then(setData).catch(console.error)
    onRefresh()
  }, [period.inicio, period.fim, onRefresh])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="gastos-inicio">Início</Label>
          <Input
            id="gastos-inicio"
            type="date"
            value={period.inicio}
            onChange={(e) =>
              onPeriodChange({ ...period, inicio: e.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gastos-fim">Fim</Label>
          <Input
            id="gastos-fim"
            type="date"
            value={period.fim}
            onChange={(e) =>
              onPeriodChange({ ...period, fim: e.target.value })
            }
          />
        </div>
        <Button onClick={load}>Aplicar</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Total Gasto</TableHead>
            <TableHead>Modelo Top</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, i) => (
            <TableRow key={i}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>
                <div className="font-medium">{d.nome || "-"}</div>
                <div className="text-xs text-muted-foreground">{d.email}</div>
              </TableCell>
              <TableCell>{fmtShortMoney(d.total_gasto)}</TableCell>
              <TableCell>
                <div>{d.modelo_top}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtShortMoney(d.gasto_modelo_top)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
