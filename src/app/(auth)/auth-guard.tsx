 'use client';
 
 import { useAuth } from '@/hooks/use-auth';
 import { useRouter } from 'next/navigation';
 import { useEffect } from 'react';
 
 export default function AuthGuard({ children }: { children: React.ReactNode }) {
   const { user, loading } = useAuth();
   const router = useRouter();
 
   useEffect(() => {
     if (!loading && user) {
       router.push('/dashboard');
     }
   }, [user, loading, router]);
 
   if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
   }
 
   return <>{children}</>;
 }
