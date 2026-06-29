import { useEffect, useRef, useState } from "react"
import { api, type Conversa, type Mensagem } from "@/lib/api"
import { fmtDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface ConversationsTabProps {
  initialUsername?: string
}

function MessageBlock({
  block,
}: {
  block: Mensagem["blocos"][number]
}) {
  const [open, setOpen] = useState(false)

  if (block.tipo === "texto") {
    return (
      <div className="mt-1 whitespace-pre-wrap">
        {String(block.conteudo)}
      </div>
    )
  }

  const label = block.tipo === "thinking" ? "Ver raciocínio" : "Ver tool"
  const text =
    typeof block.conteudo === "string"
      ? block.conteudo
      : JSON.stringify(block.conteudo, null, 2)

  return (
    <div className="mt-2">
      <button
        type="button"
        className={cn(
          "text-sm hover:underline",
          block.tipo === "thinking" ? "text-amber-400" : "text-sky-400"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <pre className="mt-1 overflow-x-auto rounded-md bg-black/40 p-2 text-xs">
          {text}
        </pre>
      )}
    </div>
  )
}

export function ConversationsTab({ initialUsername = "" }: ConversationsTabProps) {
  const [username, setUsername] = useState(initialUsername)
  const [inicio, setInicio] = useState("")
  const [fim, setFim] = useState("")
  const [texto, setTexto] = useState("")
  const [info, setInfo] = useState("")
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [loading, setLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialUsername) setUsername(initialUsername)
  }, [initialUsername])

  const buildParams = (extra: Record<string, string> = {}) => {
    const params: Record<string, string> = { ...extra }
    if (username.trim()) params.username = username.trim()
    if (inicio) params.inicio = inicio
    if (fim) params.fim = fim + "T23:59:59"
    if (texto.trim()) params.texto = texto.trim()
    return params
  }

  const loadConversas = async () => {
    if (!username.trim() && !texto.trim()) {
      alert("Digite a matrícula ou texto para buscar.")
      return
    }
    setLoading(true)
    setSelectedId(null)
    setMensagens([])
    try {
      const params = buildParams()
      const d = await api.conversas(params)
      if (d.erro) {
        setInfo("")
        setConversas([])
        alert(d.erro)
        return
      }
      const us = d.usuario
      setInfo(
        `${us?.nome || "-"} · ${us?.email || ""} · ${us?.username} — ${d.conversas.length} conversa(s)`
      )
      setConversas(d.conversas)
    } finally {
      setLoading(false)
    }
  }

  const openConversa = async (convId: string) => {
    setSelectedId(convId)
    const params = buildParams({ conv: convId })
    const msgs = await api.mensagens(params)
    setMensagens(msgs)
    chatRef.current?.scrollTo({ top: 0 })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Matrícula LDAP (ex: br811501)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadConversas()}
        />
        <Input
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          title="Mensagens a partir de"
        />
        <Input
          type="date"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          title="Mensagens até"
        />
        <Input
          placeholder="contém texto..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button onClick={loadConversas} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {info && <p className="text-sm text-muted-foreground">{info}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <ScrollArea className="h-[70vh] rounded-xl border">
          <div className="p-1">
            {conversas.map((c) => (
              <button
                key={c.conversationId}
                type="button"
                onClick={() => openConversa(c.conversationId)}
                className={cn(
                  "mb-1 w-full rounded-lg p-3 text-left text-sm transition-colors hover:bg-muted/60",
                  selectedId === c.conversationId &&
                    "bg-primary/15 ring-1 ring-primary/30"
                )}
              >
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.model}</div>
                <div className="text-xs text-muted-foreground">
                  {c.qtd} msgs · {fmtDate(c.ultima)}
                </div>
              </button>
            ))}
            {!conversas.length && !loading && (
              <p className="p-3 text-sm text-muted-foreground">
                Busque uma matrícula e selecione uma conversa.
              </p>
            )}
          </div>
        </ScrollArea>

        <Card className="lg:col-span-2">
          <CardContent
            ref={chatRef}
            className="max-h-[70vh] min-h-[300px] overflow-y-auto p-4"
          >
            {!mensagens.length ? (
              <p className="text-muted-foreground">
                Selecione uma conversa para ver as mensagens.
              </p>
            ) : (
              mensagens.map((m, mi) => (
                <div
                  key={mi}
                  className={cn(
                    "mb-2 rounded-lg border p-3",
                    m.isUser
                      ? "border-l-4 border-l-blue-500"
                      : "border-l-4 border-l-purple-500",
                    m.contem_termo && "bg-amber-500/10 border-l-amber-400"
                  )}
                >
                  <p className="mb-1 text-xs text-muted-foreground">
                    {m.isUser
                      ? `Usuário${m.username ? ` (${m.username})` : ""}`
                      : m.model || m.sender || "Assistente"}{" "}
                    · {fmtDate(m.createdAt)}
                  </p>
                  {m.blocos.map((b, bi) => (
                    <MessageBlock key={bi} block={b} />
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
