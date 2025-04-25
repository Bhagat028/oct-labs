import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
// import { ChatHeader } from "@/components/chat-header"
import { ChatContainer } from "@/components/chat/chat-container"
import { useParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
export const iframeHeight = "800px"
export const description = "Chat interface with sidebar, header and message area."

export default function Chat() {
  const params = useParams()
  const chatId = (params?.id as string) || ""

  return (
    <SidebarProvider>
      
      <div className="flex h-screen overflow-hidden">
        <AppSidebar variant="inset" className="h-screen" />
        <SidebarInset className="flex flex-col h-screen w-full">
          <SiteHeader />
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* <ChatHeader chatId={chatId} /> */}
              <div className="px-4 lg:px-6">
                <ChatContainer chatId={chatId} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}