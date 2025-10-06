
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Building, ChevronsRightLeft, Lightbulb, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const adminTabsList = [
    { name: "Entities", href: "/admin/entities", icon: Building, role: ['Admin', 'Super User', 'Super Admin'] },
    { name: "Pipeline Stages", href: "/admin/pipeline-stages", icon: ChevronsRightLeft, role: ['Super User', 'Super Admin'] },
    { name: "Automation", href: "/admin/pipeline-automation", icon: Lightbulb, role: ['Super User', 'Super Admin'] },
    { name: "Appearance", href: "/admin/appearance", icon: Palette, role: ['Super User', 'Super Admin'] },
];

export function AdminTabs() {
    const pathname = usePathname();
    const { hasRole } = useAuth();

    return (
        <div className="mb-6 border-b border-border">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {adminTabsList.map((tab) => {
                    if (!hasRole(tab.role)) return null;
                    const isActive = pathname.startsWith(tab.href);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={cn(
                                'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            )}
                        >
                            <Icon className={cn(
                                '-ml-0.5 mr-2 h-5 w-5',
                                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                            )} />
                            <span>{tab.name}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
