'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace('/login');
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full" style={{ '--sidebar-width': '250px' } as React.CSSProperties}>
        <Sidebar>
          <SidebarHeader>
            <div className="px-2 py-1">
              <img src="/Logo backcenter.webp" alt="BackCenter" className="h-10" />
            </div>
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menú principal</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard')}>
                    <Link href="/dashboard">Escritorio</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/empresas')}>
                    <Link href="/dashboard/empresas">Empresas</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/sucursales')}>
                    <Link href="/dashboard/sucursales">Sucursales</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/pqrs')}>
                    <Link href="/dashboard/pqrs">Pqrs</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="px-2 pb-2">
              <Button variant="destructive" className="w-full" onClick={handleLogout}>Cerrar sesión</Button>
            </div>
            <div className="px-2 text-xs text-muted-foreground">© {new Date().getFullYear()}</div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 px-4 border-b">
            <SidebarTrigger />
            <div className="font-medium">Dashboard</div>
            <div className="ml-auto" />
          </header>
          <div className="p-4">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}