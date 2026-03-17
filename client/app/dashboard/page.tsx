import { Card, CardContent } from "@/components/ui/card"
import { Home } from "lucide-react"

export default function DashboardRootPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">Welcome to your MeetO command center.</p>
      </div>

      <Card className="border-dashed shadow-none bg-slate-50">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Home className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">Coming Soon</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Your high-level metrics and active meeting bot statuses will appear here. Navigate to Presenter or Notetaker mode to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
