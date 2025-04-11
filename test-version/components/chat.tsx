import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ChatHeader } from "@/components/chat-header"
import { ChatContainer } from "@/components/chat-container"
import { useParams } from "next/navigation"

export const iframeHeight = "800px"

export const description = "Chat interface with sidebar, header and message area."

export default function Chat() {
  const params = useParams();
  const chatId = params?.id as string || "";

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))]">
              {chatId ? (
                <>
                  <ChatHeader chatId={chatId} />
                  <ChatContainer chatId={chatId} />
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="max-w-md space-y-4 text-center">
                    <h3 className="text-lg font-medium">No chat selected</h3>
                    <p className="text-muted-foreground">
                      Select a chat from the sidebar or start a new conversation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
