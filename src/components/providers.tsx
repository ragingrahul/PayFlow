'use client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useState } from 'react';
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() =>
    process.env.NEXT_PUBLIC_CONVEX_URL
      ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
      : null,
  );
  if (!client)
    return (
      <main className="setup">
        <div className="brand-mark">P</div>
        <h1>Connect your workspace</h1>
        <p>PayFlow needs a running Convex deployment. Start the backend, then restart Next.js.</p>
        <pre>
          npx convex dev
          <br />
          npm run seed
          <br />
          npm run dev
        </pre>
        <p>Set NEXT_PUBLIC_CONVEX_URL in .env.local to your deployment URL.</p>
      </main>
    );
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
