import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-surface text-slate-900">
      <SidebarProvider className="flex flex-col items-stretch">
        {/* Full-width sticky top header over the sidebar */}
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-white px-4 w-full">
          <SidebarTrigger className="-ml-1" />
          <div className="font-display font-bold text-xl tracking-tight text-slate-900 ml-2">
            MeetO
          </div>
        </header>
        
        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          <AppSidebar className="top-14! h-[calc(100svh-3.5rem)]! border-r" />
          <main className="flex-1 overflow-auto w-full bg-slate-50/50">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}

