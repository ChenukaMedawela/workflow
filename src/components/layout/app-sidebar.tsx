

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarTrigger,
    SidebarSearch,
  } from "@/components/ui/sidebar";
  import { Logo } from "@/components/icons";
  import {
    LayoutDashboard,
    Table,
    Users,
    Settings,
    KanbanSquare,
    ChevronsRightLeft,
    Lightbulb,
    Palette,
    History,
    Building,
    ChevronLeft,
    ChevronRight,
  } from "lucide-react";
  import { UserNav } from "./user-nav";
  import { useAuth } from "@/hooks/use-auth";
  import { usePathname } from "next/navigation";
  import Link from "next/link";
  import { useSidebar } from "@/components/ui/sidebar";
  import { Button } from "@/components/ui/button";
  import { useEffect, useState } from "react";
  import { doc, onSnapshot } from "firebase/firestore";
  import { db } from "@/lib/firebase";
  import Image from "next/image";
  
  export function AppSidebar() {
    const { hasRole } = useAuth();
    const pathname = usePathname();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
    const isAdminVisible = hasRole(["Super User", "Admin", "Super Admin"]);
  
    useEffect(() => {
        const themeRef = doc(db, 'settings', 'theme');
        const unsubscribe = onSnapshot(themeRef, (doc) => {
            if (doc.exists()) {
                setLogoUrl(doc.data().logoUrl || null);
            }
        });
        return () => unsubscribe();
    }, []);

    const menuItems = [
      {
        href: "/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
      },
      {
        href: "/leads",
        icon: Table,
        label: "Leads",
      },
      {
        href: "/pipeline",
        icon: KanbanSquare,
        label: "Pipeline",
      },
      {
        href: "/next-best-action",
        icon: Lightbulb,
        label: "Next Best Action",
      },
      {
        href: "/audit-trail",
        icon: History,
        label: "Audit Trail",
      },
    ];
  
    const adminMenuItems = [
        { href: "/admin/entities", icon: Building, label: "Entities" },
        { href: "/admin/pipeline-stages", icon: ChevronsRightLeft, label: "Pipeline Stages" },
        { href: "/admin/pipeline-automation", icon: Lightbulb, label: "Automation" },
        { href: "/admin/appearance", icon: Palette, label: "Appearance" },
    ]
  
    return (
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="flex items-center gap-2">
            {logoUrl ? (
                <Image src={logoUrl} alt="Company Logo" width={28} height={28} className="size-7 object-contain" />
            ) : (
                <Logo className="size-7 text-primary" />
            )}
          <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Workflow CRM
          </span>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarSearch />
            </SidebarMenuItem>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {isAdminVisible && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin')}
                  tooltip="Admin"
                >
                  <Link href="/admin/users">
                    <Settings />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="hidden md:flex p-2 items-center gap-2">
            
        </SidebarFooter>
      </Sidebar>
    );
  }
