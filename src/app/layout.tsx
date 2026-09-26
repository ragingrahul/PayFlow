import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';
import { Loading } from '@/components/ui';
export const metadata: Metadata = {
  title: 'PayFlow — Payroll that thinks before you pay',
  description: 'A clearer view of your people, payroll, and payday.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Suspense fallback={<Loading />}>
            <Shell>{children}</Shell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
