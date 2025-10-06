
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/pending-approval');

            if (user) {
                if (user.status === 'pending' && !isAuthPage) {
                    router.replace('/pending-approval');
                } else if (user.status === 'approved' && isAuthPage) {
                    router.replace('/dashboard');
                }
            } else if (!isAuthPage) {
                router.replace('/login');
            }
        }
    }, [user, loading, router, pathname]);

    return <>{children}</>;
}
