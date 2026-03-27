"use client"

import { Home, Settings, LogOut, Upload, MessageSquare, Video, Film, Tv, MessageCircle, Users, Megaphone, Calendar, History, ShoppingCart } from "lucide-react"
import { useAuth } from "~/utils/auth"
import { FamilySwitcher } from "~/components/branding/FamilySwitcher"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", icon: Home, href: "/dashboard" },
  { title: "Messages", icon: MessageSquare, href: "/dashboard/messages" },
  { title: "Members", icon: Users, href: "/dashboard/members" },
  { title: "1-on-1 Chat", icon: MessageCircle, href: "/dashboard/conversations" },
  { title: "Announcements", icon: Megaphone, href: "/dashboard/announcements" },
  { title: "Shopping Lists", icon: ShoppingCart, href: "/dashboard/shopping-lists" },
  { title: "Calendar", icon: Calendar, href: "/dashboard/events" },
  { title: "Timeline", icon: History, href: "/dashboard/timeline" },
  { title: "Media", icon: Upload, href: "/dashboard/media" },
  { title: "Video Call", icon: Video, href: "/dashboard/video" },
  { title: "Streaming Theater", icon: Tv, href: "/dashboard/theater" },
  { title: "Movies", icon: Film, href: "/dashboard/movies" },
  { title: "Settings", icon: Settings, href: "/dashboard/settings" },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { signOut } = useAuth()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <FamilySwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
