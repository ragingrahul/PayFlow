import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';
import { Loading } from '@/components/ui';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000'),
  title: 'PayFlow — Payroll that thinks before you pay',
  description:
    'An AI-native payroll workspace where HR can ask, preview, and approve while deterministic code calculates every rupee.',
  applicationName: 'PayFlow',
  openGraph: {
    title: 'PayFlow — Payroll that thinks before you pay',
    description:
      'Ask what a raise or bonus would cost, preview the impact, and keep a human checkpoint before payroll changes.',
    type: 'website',
    siteName: 'PayFlow',
    images: [
      {
        url: '/marketing/social-card.png',
        width: 1200,
        height: 630,
        alt: 'PayFlow AI-native payroll workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PayFlow — Payroll that thinks before you pay',
    description: 'AI interprets intent. Application code calculates money. Humans approve changes.',
    images: ['/marketing/social-card.png'],
  },
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
