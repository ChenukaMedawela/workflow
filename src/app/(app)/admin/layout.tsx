
"use client"

import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/hooks/use-auth"
import { AdminTabs } from "./_components/admin-tabs"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { hasRole } = useAuth()

    if (!hasRole(['Admin', 'Super User', 'Super Admin'])) {
        return (
            <div>
                <PageHeader title="Access Denied" description="You do not have permission to view this page."/>
            </div>
        )
    }

    return (
        <div>
            <PageHeader
                title="Admin Panel"
                description="Manage users, entities, pipeline, and system settings."
            />
            <AdminTabs />
            <div className="admin-tabs-content-panel">
                {children}
            </div>
        </div>
    )
}
