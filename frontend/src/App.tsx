import { useCallback, useState } from "react"
import { Activity, BarChart3, MessageSquare, Settings, Wallet } from "lucide-react"
import { type RankingItem } from "@/lib/api"
import { defaultPeriod } from "@/lib/format"
import { ConversationsTab } from "@/components/ConversationsTab"
import { OverviewTab } from "@/components/OverviewTab"
import { SpendingTab } from "@/components/SpendingTab"
import { UsersTab } from "@/components/UsersTab"
import { ActivityTab } from "@/components/ActivityTab"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function App() {
  const [period, setPeriod] = useState(defaultPeriod)
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [activeTab, setActiveTab] = useState("visao")
  const [convUsername, setConvUsername] = useState("")

  const handleRankingLoaded = useCallback((data: RankingItem[]) => {
    setRanking(data)
  }, [])

  const handleViewConversations = (username: string) => {
    setConvUsername(username)
    setActiveTab("conversas")
  }

  const refreshRanking = useCallback(() => {
    setPeriod((p) => ({ ...p }))
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-[24px] border border-white/10 bg-card/80 px-5 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Painel administrativo
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              LibreChat Admin
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-400" />
            Atualizado em tempo real
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-[20px] border border-white/10 bg-card/70 p-1.5 shadow-sm backdrop-blur-sm sm:w-fit">
          <TabsTrigger value="visao" className="gap-1.5 rounded-[14px] px-3 py-2 text-sm data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm">
            <BarChart3 className="size-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5 rounded-[14px] px-3 py-2 text-sm data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm">
            <Settings className="size-4" />
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="gastos" className="gap-1.5 rounded-[14px] px-3 py-2 text-sm data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm">
            <Wallet className="size-4" />
            Gastos
          </TabsTrigger>
          <TabsTrigger value="atividade" className="gap-1.5 rounded-[14px] px-3 py-2 text-sm data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm">
            <Activity className="size-4" />
            Atividade IA
          </TabsTrigger>
          <TabsTrigger value="conversas" className="gap-1.5 rounded-[14px] px-3 py-2 text-sm data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm">
            <MessageSquare className="size-4" />
            Conversas
          </TabsTrigger>
        </TabsList>

        <Card className="overflow-hidden border border-white/10 bg-card/70 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <TabsContent value="visao">
              <OverviewTab
                period={period}
                onPeriodChange={setPeriod}
                onRankingLoaded={handleRankingLoaded}
              />
            </TabsContent>
            <TabsContent value="usuarios">
              <UsersTab onViewConversations={handleViewConversations} />
            </TabsContent>
            <TabsContent value="gastos">
              <SpendingTab
                period={period}
                onPeriodChange={setPeriod}
                ranking={ranking}
                onRefresh={refreshRanking}
              />
            </TabsContent>
            <TabsContent value="atividade">
              <ActivityTab period={period} onPeriodChange={setPeriod} />
            </TabsContent>
            <TabsContent value="conversas">
              <ConversationsTab initialUsername={convUsername} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}
