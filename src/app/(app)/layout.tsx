
"use client";

import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { SidebarProvider } from '@/components/ui/sidebar';
import React from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <AuthGuard>
      <SidebarProvider>
          <div className="flex min-h-screen">
              <AppSidebar />
              <main className="flex-1 bg-background overflow-auto">
                  <MobileHeader />
                  <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                  </div>
              </main>
          </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
