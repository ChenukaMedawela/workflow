
'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<{coverImageUrl?: string} | null>(null);

  useEffect(() => {
    const themeRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(themeRef, (doc) => {
      if (doc.exists()) {
        setTheme(doc.data());
      } else {
        setTheme(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const variants = useMemo(() => {
    const isSignup = pathname === '/signup';
    return {
      hidden: { opacity: 0, x: isSignup ? 200 : -200, y: 0 },
      enter: { opacity: 1, x: 0, y: 0 },
      exit: { opacity: 0, x: isSignup ? 200 : -200, y: 0 },
    };
  }, [pathname]);

  const coverImageUrl = theme?.coverImageUrl;

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center bg-muted relative"
        style={{ backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : 'none' }}
      >
        {coverImageUrl && (
          <>
            <div className="absolute inset-0 bg-black opacity-50"></div>
            <div className="relative h-full w-full flex items-center justify-center">
                <div className="text-center z-10">
                    <h1 className="text-4xl font-bold text-white">Workflow CRM</h1>
                    <p className="text-gray-300 mt-2">Streamline your business processes.</p>
                </div>
            </div>
          </>
        )}
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            variants={variants}
            initial="hidden"
            animate="enter"
            exit="exit"
            transition={{ type: 'tween', duration: 0.3 }}
            className={'w-full max-w-sm'}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
