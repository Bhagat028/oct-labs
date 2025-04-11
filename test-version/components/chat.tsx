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
    <div className="flex h-screen flex-col">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
          <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))] w-full">
              {chatId ? (
                <>
                  <ChatHeader chatId={chatId} />
                  <div className="flex-1 overflow-hidden px-4">
                    <ChatContainer chatId={chatId} />
                  </div>
                </>
              ) : (
                <div className=" items-center justify-center p-6">
                  <div className="max-w-md space-y-6 text-center">
                    <h3 className="text-xl font-medium">No chat selected</h3>
                    <p className="text-muted-foreground text-base">
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
