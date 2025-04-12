"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
} from "lucide-react"
import { useUserDetails } from "@/components/avatars"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ChatList } from "@/components/chat-list"

// Memoize the secondary navigation to prevent re-renders
const MemoizedNavSecondary = React.memo(NavSecondary);

// Memoize the chat list component to prevent it from re-rendering when the sidebar re-renders
const MemoizedChatList = React.memo(ChatList);

// Create a static data object outside the component to prevent recreation on each render
const SECONDARY_NAV_ITEMS = [
  {
    title: "Support",
    url: "#",
    icon: LifeBuoy,
  },
  {
    title: "Feedback",
    url: "#",
    icon: Send,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { userDetails } = useUserDetails();
  
  // Memoize the user data to prevent recreation on each render
  const userData = React.useMemo(() => ({
    name: userDetails?.name || "User",
    email: userDetails?.email || "user@example.com",
    avatar: userDetails?.avatar || "NA",
  }), [userDetails?.name, userDetails?.email, userDetails?.avatar]);

  return (
    <Sidebar
      collapsible="icon"
      className="relative overflow-hidden"
      {...props}
    >
      <SidebarHeader className="absolute top-0 left-0 right-0 z-10 overflow-hidden">
        <div className="flex items-center p-2 overflow-hidden">
          <div className="flex items-center space-x-2 overflow-hidden">
            <Command className="h-5 w-5 flex-shrink-0" />
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate">Oct</div>
              <div className="text-xs truncate">Enterprise</div>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col pt-14 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0">
            <MemoizedChatList />
          </div>
        </div>
        <MemoizedNavSecondary items={SECONDARY_NAV_ITEMS} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}