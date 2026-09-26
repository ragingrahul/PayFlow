'use client';
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
          <h1>Workspace connection interrupted</h1>
          <p>Check your Convex deployment and try again.</p>
          <button onClick={reset}>Reconnect</button>
        </main>
      </body>
    </html>
  );
}
