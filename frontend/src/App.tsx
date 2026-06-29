import { useCallback, useState } from "react"
import { BarChart3, MessageSquare, Settings, Wallet } from "lucide-react"
import { type RankingItem } from "@/lib/api"
import { defaultPeriod } from "@/lib/format"
import { ConversationsTab } from "@/components/ConversationsTab"
import { OverviewTab } from "@/components/OverviewTab"
import { SpendingTab } from "@/components/SpendingTab"
import { UsersTab } from "@/components/UsersTab"
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
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        LibreChat Admin
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 h-auto w-full flex-wrap sm:w-fit">
          <TabsTrigger value="visao" className="gap-1.5">
            <BarChart3 className="size-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Settings className="size-4" />
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="gastos" className="gap-1.5">
            <Wallet className="size-4" />
            Gastos
          </TabsTrigger>
          <TabsTrigger value="conversas" className="gap-1.5">
            <MessageSquare className="size-4" />
            Conversas
          </TabsTrigger>
        </TabsList>

        <Card>
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
            <TabsContent value="conversas">
              <ConversationsTab initialUsername={convUsername} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}
