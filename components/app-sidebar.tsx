"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import {
  ClipboardTextIcon,
  ListDashesIcon,
  PackageIcon,
  SignOutIcon,
  SquaresFourIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "@phosphor-icons/react"
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
          icon: SquaresFourIcon,
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
          icon: WarehouseIcon,
        },
        {
          title: "Products",
          url: "/products",
          icon: PackageIcon,
        },
        {
          title: "Suppliers",
          url: "/suppliers",
          icon: TruckIcon,
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
          icon: ClipboardTextIcon,
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
          icon: UsersIcon,
        },
        {
          title: "Audit Logs",
          url: "/audit-logs",
          icon: ListDashesIcon,
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
    <Sidebar
      {...props}
      variant="floating"
      style={{ viewTransitionName: "app-sidebar" }}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="bg-accent rounded-2xl flex aspect-square size-8 items-center justify-center text-sidebar-primary-foreground" />
              <div className="grid flex-1 text-sm leading-tight text-left">
                <span className="font-semibold truncate type-base">
                  Sacks and Twines
                </span>
                <span className="truncate type-xs text-blue-100">
                  Inventory Management
                </span>
              </div>
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
                    <SidebarMenuButton
                      render={
                        <Link
                          href={item.url}
                          transitionTypes={["nav-forward"]}
                          className="flex items-center gap-2"
                        />
                      }
                      isActive={isActive(item.url)}
                    >
                      {item.icon ? <item.icon weight="fill" /> : null}
                      <span>{item.title}</span>
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
              <SignOutIcon weight="fill" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
