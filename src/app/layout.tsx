
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from './(app)/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CRM',
  description: 'A CRM created by the dev team'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider> 
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
