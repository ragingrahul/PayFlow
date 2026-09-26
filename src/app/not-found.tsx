import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Nothing on this page.</h1>
      <p className="muted">Let’s get you back to your workspace.</p>
      <Link className="button primary" href="/">
        Back to dashboard
      </Link>
    </div>
  );
}
