import { Calendar, Home, Inbox, Search, Settings, FileText, MonitorPlay, Sparkles, Clock } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Presenter Mode",
    url: "/dashboard/presenter",
    icon: MonitorPlay,
  },
  {
    title: "Notetaker Mode",
    url: "/dashboard/notetaker",
    icon: FileText,
  },
  {
    title: "AI Apps",
    url: "/dashboard/ai-apps",
    icon: Sparkles,
  },
]

export async function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  let recentMeetings: any[] = []
  
  try {
    const res = await fetch("http://127.0.0.1:8000/api/meetings", { 
      cache: "no-store", 
      next: { revalidate: 0 } 
    })
    if (res.ok) {
      const data = await res.json()
      recentMeetings = data.meetings || []
    }
  } catch (error) {
    console.error("Failed to fetch meetings for sidebar:", error)
  }

  return (
    <Sidebar collapsible="icon" className={className} {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="[&_svg]:size-5!">
                    <a href={item.url}>
                      <item.icon/>
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {recentMeetings.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Recent Meetings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentMeetings.map((meeting) => {
                  const title = meeting.analysis_json?.title || 
                              meeting.metadata?.bot_name || 
                              "Untitled Meeting"
                  const displayId = meeting.meeting_id 
                    ? meeting.meeting_id.split("-").slice(-1)[0] || meeting.meeting_id
                    : "No ID"

                  return (
                    <SidebarMenuItem key={meeting.meeting_id}>
                      <SidebarMenuButton asChild>
                        <a href={`/dashboard/meeting/${meeting.meeting_id}`} title={`${title} (${displayId})`}>
                          <FileText className="h-5 w-5"/>
                          <div className="flex flex-col items-start truncate max-w-[150px]">
                            <span className="truncate w-full font-medium">{title}</span>
                            <span className="text-[10px] text-slate-500 truncate w-full">ID: {meeting.meeting_id}</span>
                          </div>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
