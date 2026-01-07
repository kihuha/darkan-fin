import { redirect } from "next/navigation";

import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="relative min-h-svh w-full bg-dashboard">
        <div className="pointer-events-none absolute inset-0 page-grid opacity-20" />
        <div className="relative flex min-h-svh flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
            <SidebarTrigger className="h-9 w-9 border border-border/60 bg-background/80 shadow-sm" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Darkan Fin</span>
              <span className="text-xs text-muted-foreground">
                Track, budget, and review with ease
              </span>
            </div>
          </header>
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
