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
import Image from "next/image"
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
  useSidebar,
} from "@/components/ui/sidebar"

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
  const { isMobile, setOpenMobile } = useSidebar()

  // Close the sidebar on mobile when a link is clicked.
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  // Check if the current pathname matches the given URL to determine if the link is active.
  const isActive = (url: string) => {
    return url === pathname
  }

  return (
    <Sidebar
      {...props}
      variant="inset"
      collapsible="icon"
      style={{ viewTransitionName: "app-sidebar" }}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={closeMobile}
              render={<Link href="/dashboard" />}
            >
              <Image
                src="/logo.png"
                alt="Sacks and Twines"
                className="rounded-full"
                width={32}
                height={32}
              />
              <div className="grid flex-1 type-body-small text-left">
                <span className="font-semibold truncate type-body-default">
                  Sacks and Twines
                </span>
                <span className="truncate type-caption text-sidebar-primary-foreground">
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
                      onClick={closeMobile}
                      render={
                        <Link
                          href={item.url}
                          transitionTypes={["nav-forward"]}
                          className="flex items-center gap-2"
                        />
                      }
                      isActive={isActive(item.url)}
                      tooltip={item.title}
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
                closeMobile()
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
