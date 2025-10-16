
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { ColorThemeProvider } from './color-theme-provider';

export const metadata: Metadata = {
  title: 'CRM',
  description: 'A CRM created by the dev team'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ColorThemeProvider> 
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </ColorThemeProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
