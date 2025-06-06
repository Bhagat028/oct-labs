"use client";

import * as React from "react";
import { Command, LifeBuoy, Send } from "lucide-react";

import { useUserDetails } from "@/components/avatars";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { ChatList } from "@/components/chat-list";

// Memoized components
const MemoizedNavSecondary = React.memo(NavSecondary);
const MemoizedChatList = React.memo(ChatList);

const SECONDARY_NAV_ITEMS = [
  { title: "Support", url: "#", icon: LifeBuoy },
  { title: "Feedback", url: "#", icon: Send },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { userDetails } = useUserDetails();

  const userData = React.useMemo(() => ({
    name: userDetails?.name ?? "User",
    email: userDetails?.email ?? "user@example.com",
    avatar: userDetails?.avatar ?? "NA",
  }), [userDetails]);

  return (
    <Sidebar collapsible="icon" className="h-screen fixed left-0 top-0 z-40" {...props}>
      <SidebarHeader className="overflow-hidden">
        <div className="flex items-center p-2 space-x-2">
          <Command className="h-5 w-5 flex-shrink-0" />
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-medium truncate">Oct</div>
            <div className="text-xs truncate">Enterprise</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col overflow-hidden relative">
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
  );
}
