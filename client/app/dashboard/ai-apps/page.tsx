import { Card, CardContent } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export default function AIAppsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Apps</h1>
        <p className="text-slate-500 mt-2">Extend MeetO with custom workflows and app integrations.</p>
      </div>

      <Card className="border-dashed shadow-none bg-slate-50">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Sparkles className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">Coming Soon</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            The AI App marketplace is currently in beta. You will be able to connect Notion, Jira, and Slack workflows here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
