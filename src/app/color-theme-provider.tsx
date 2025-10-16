
"use client";

import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const themeRef = doc(db, 'settings', 'theme');

    // Use onSnapshot to listen for real-time theme changes
    const unsubscribe = onSnapshot(themeRef, (doc) => {
      if (doc.exists()) {
        const theme = doc.data();
        const root = document.documentElement;

        if (theme.primary) {
          root.style.setProperty('--primary', theme.primary);
        }
        if (theme.accent) {
          root.style.setProperty('--accent', theme.accent);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}
