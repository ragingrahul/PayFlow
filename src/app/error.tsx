'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel empty" role="alert">
      <h1>We couldn’t load this view.</h1>
      <p className="muted">
        Check that Convex is running, then try again. Your saved payroll remains in the database.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
