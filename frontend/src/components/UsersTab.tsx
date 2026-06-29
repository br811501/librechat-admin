import { useEffect, useState } from "react"
import { MessageSquare, Settings } from "lucide-react"
import { api, type Usuario } from "@/lib/api"
import { fmt } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { UserActionsDialog } from "@/components/UserActionsDialog"

interface UsersTabProps {
  onViewConversations: (username: string) => void
}

export function UsersTab({ onViewConversations }: UsersTabProps) {
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<Usuario[]>([])
  const [selected, setSelected] = useState<Usuario | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setUsers([])
      return
    }
    const timer = setTimeout(() => {
      api.buscar(query).then(setUsers).catch(console.error)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const openActions = (user: Usuario) => {
    setSelected(user)
    setDialogOpen(true)
  }

  const refresh = () => {
    if (query.length >= 2) api.buscar(query).then(setUsers).catch(console.error)
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome, email ou login (ex: br811501)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u._id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name || "(sem nome)"}</span>
                  <Badge variant="secondary">{u.role || "USER"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {u.email} · {u.username}
                </p>
                <p className="text-sm">
                  Créditos: <span className="font-medium">{fmt(u.tokenCredits ?? 0)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openActions(u)}>
                  <Settings className="size-4" />
                  Ações
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => u.username && onViewConversations(u.username)}
                >
                  <MessageSquare className="size-4" />
                  Conversas
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && (
        <UserActionsDialog
          user={selected}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
