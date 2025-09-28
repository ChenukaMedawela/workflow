
"use client";

import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { UserNav } from '@/components/layout/user-nav';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
        <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 bg-background overflow-auto">
                <MobileHeader />
                <div className="hidden md:flex justify-end p-4">
                  <UserNav />
                </div>
                <div className="p-4 sm:p-6 lg:p-8 pt-0 md:pt-8">
                  {children}
                </div>
            </main>
        </div>
    </SidebarProvider>
  );
}
