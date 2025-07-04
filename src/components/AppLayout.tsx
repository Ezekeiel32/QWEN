
"use client"
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { LayoutGrid, Github, TerminalSquare, ListChecks, Settings, CodeXml } from 'lucide-react';
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/repositories", label: "Repositories", icon: Github },
    { href: "/debugger", label: "Debugger", icon: TerminalSquare },
    { href: "/tasks", label: "Tasks", icon: ListChecks },
  ];

  const getPageTitle = () => {
    const currentPath = pathname.split('/')[1];
    if (!currentPath || currentPath === 'dashboard') return "Dashboard";
    const menuItem = menuItems.find(item => item.href.includes(currentPath));
    if (menuItem) return menuItem.label;
    if (currentPath === 'settings') return 'Settings';
    return "QwenCode Weaver";
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <CodeXml className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold font-headline">QwenCode Weaver</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={{children: item.label, side:"right", align:"center"}}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/settings" className="w-full">
                <SidebarMenuButton isActive={pathname.startsWith('/settings')} tooltip={{children: "Settings", side:"right", align:"center"}}>
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
            <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-lg font-semibold md:text-xl font-headline">
                {getPageTitle()}
            </h1>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
