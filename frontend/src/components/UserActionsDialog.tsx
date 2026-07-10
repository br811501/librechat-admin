import { useState } from "react"
import { api, type Usuario } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserActionsDialogProps {
  user: Usuario
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type ActionType = "add_creditos" | "rem_creditos" | "alterar_role" | null

export function UserActionsDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserActionsDialogProps) {
  const [action, setAction] = useState<ActionType>(null)
  const [credits, setCredits] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setAction(null)
    setCredits("")
    setError(null)
  }

  const handleClose = (value: boolean) => {
    if (!value) reset()
    onOpenChange(value)
  }

  const execute = async () => {
    if (!action) return
    setLoading(true)
    setError(null)
    try {
      let payload: { tipo: string; user_id: string; valor: string | number }
      if (action === "alterar_role") {
        const nova = user.role === "ADMIN" ? "USER" : "ADMIN"
        payload = { tipo: "alterar_role", user_id: user._id, valor: nova }
      } else {
        if (!credits) {
          setError("Informe a quantidade de créditos.")
          setLoading(false)
          return
        }
        payload = { tipo: action, user_id: user._id, valor: credits }
      }
      const res = await api.acao(payload as Parameters<typeof api.acao>[0])
      if (res.ok) {
        onSuccess()
        handleClose(false)
      } else {
        setError(res.erro ?? "Erro desconhecido")
      }
    } catch {
      setError("Falha na requisição")
    } finally {
      setLoading(false)
    }
  }

  const displayName = user.name || user.email || user.username

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ações — {displayName}</DialogTitle>
          <DialogDescription>
            Role atual: {user.role || "USER"}
          </DialogDescription>
        </DialogHeader>

        {!action ? (
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setAction("add_creditos")}>
              Adicionar créditos
            </Button>
            <Button variant="outline" onClick={() => setAction("rem_creditos")}>
              Remover créditos
            </Button>
            <Button variant="outline" onClick={() => setAction("alterar_role")}>
              Alternar role ({user.role === "ADMIN" ? "USER" : "ADMIN"})
            </Button>
          </div>
        ) : action === "alterar_role" ? (
          <p className="text-sm">
            Alterar role para{" "}
            <span className="font-medium">
              {user.role === "ADMIN" ? "USER" : "ADMIN"}
            </span>
            ?
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="credits" className="mb-2 block">
                Quantidade de créditos
              </Label>
              <Input
                id="credits"
                type="number"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder="Digite um valor ou selecione abaixo"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Atalhos rápidos:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[1000000, 3000000, 5000000, 10000000].map((value) => (
                  <Button
                    key={value}
                    variant="secondary"
                    size="sm"
                    onClick={() => setCredits(String(value))}
                    className="text-xs"
                  >
                    {(value / 1000000).toFixed(0)}M
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {action && (
          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              Voltar
            </Button>
            <Button onClick={execute} disabled={loading}>
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
