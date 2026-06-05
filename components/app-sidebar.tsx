"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import {
  BoxIcon,
  ClipboardList,
  Container,
  LayoutDashboard,
  LogOut,
  Logs,
  ShelvingUnit,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Overview",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Operations",
      url: "#",
      items: [
        {
          title: "Inventory",
          url: "/inventory",
          icon: ShelvingUnit,
        },
        {
          title: "Products",
          url: "/products",
          icon: BoxIcon,
        },
        {
          title: "Suppliers",
          url: "/suppliers",
          icon: Container,
        },
      ],
    },
    {
      title: "Insights",
      url: "#",
      items: [
        {
          title: "Reports",
          url: "/reports",
          icon: ClipboardList,
        },
      ],
    },
    {
      title: "Management",
      url: "#",
      items: [
        {
          title: "Users",
          url: "/users",
          icon: Users,
        },
        {
          title: "Audit Logs",
          url: "/audit-logs",
          icon: Logs,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { signOut } = useAuthActions()
  const { push } = useRouter()
  const pathname = usePathname()
  const isActive = (url: string) => {
    return url === pathname
  }

  return (
    <Sidebar {...props} variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard">
                <div className="grid flex-1 text-sm leading-tight text-left">
                  <span className="font-semibold truncate type-base">
                    Sacks and Twines
                  </span>
                  <span className="truncate type-xs text-muted-foreground">
                    Inventory Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url} className="flex items-center gap-2">
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                push("/sign-in")
                signOut()
              }}
            >
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
