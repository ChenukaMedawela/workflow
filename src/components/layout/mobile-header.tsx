
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { Logo } from "../icons";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 md:hidden">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Logo className="size-7 text-primary" />
      </div>
      <div>
        <UserNav />
      </div>
    </header>
  );
}
