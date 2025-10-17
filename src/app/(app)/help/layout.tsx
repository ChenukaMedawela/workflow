
'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const modules = [
    { name: "Sales Module", href: "/help/sales-module" },
    { name: "AI Sales Gen Module", href: "/help/ai-module" },
    { name: "User Management Module", href: "/help/user-management-module" },
    { name: "Admin Module", href: "/help/admin-module" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <aside className="md:col-span-1">
        <h2 className="text-xl font-semibold mb-4">Modules</h2>
        <nav className="space-y-2">
          {modules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className={`block font-medium ${pathname === module.href ? "text-primary" : ""}`}
            >
              {module.name}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="md:col-span-3">
        {children}
      </main>
    </div>
  );
}
