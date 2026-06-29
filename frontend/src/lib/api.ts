export interface ResumoUsuario {
  nome?: string
  username?: string
  tokenCredits?: number
}

export interface Resumo {
  total_usuarios: number
  saldo_baixo: number
  saldo_zerado: number
  saldo_baixo_list: ResumoUsuario[]
  saldo_zerado_list: ResumoUsuario[]
}

export interface RankingItem {
  nome?: string
  email?: string
  username?: string
  total_gasto: number
  modelo_top: string
  gasto_modelo_top: number
}

export interface Usuario {
  _id: string
  name?: string
  email?: string
  username?: string
  role?: string
  tokenCredits?: number
}

export interface Conversa {
  conversationId: string
  title: string
  model?: string
  qtd: number
  ultima: string
}

export interface ConversasResponse {
  erro?: string
  usuario?: {
    nome?: string
    email?: string
    username?: string
  }
  conversas: Conversa[]
}

export interface BlocoMensagem {
  tipo: "texto" | "thinking" | string
  conteudo: string | unknown
}

export interface Mensagem {
  isUser: boolean
  username?: string
  model?: string
  sender?: string
  createdAt: string
  contem_termo?: boolean
  blocos: BlocoMensagem[]
}

export type AcaoTipo = "add_creditos" | "rem_creditos" | "alterar_role"

export interface AcaoPayload {
  tipo: AcaoTipo
  user_id: string
  valor: string | number
}

export interface AcaoResponse {
  ok: boolean
  erro?: string
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json() as Promise<T>
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<T>
}

export const api = {
  resumo: () => getJson<Resumo>("/api/resumo"),
  ranking: (inicio: string, fim: string) =>
    getJson<RankingItem[]>(
      `/api/ranking?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim + "T23:59:59")}`
    ),
  buscar: (q: string) =>
    getJson<Usuario[]>(`/api/buscar?q=${encodeURIComponent(q)}`),
  acao: (payload: AcaoPayload) =>
    postJson<AcaoResponse>("/api/acao", payload),
  conversas: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params)
    return getJson<ConversasResponse>(`/api/conversas?${qs}`)
  },
  mensagens: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params)
    return getJson<Mensagem[]>(`/api/mensagens?${qs}`)
  },
}
