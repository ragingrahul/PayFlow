import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FlaskConical,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

export function LandingScreen() {
  return (
    <>
      <header className="landing-nav">
        <Link href="/welcome" className="brand landing-brand">
          <span className="brand-mark">
            <span /> <span /> <span />
          </span>
          payflow<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <Link className="button primary" href="/?period=2026-09">
            Open demo <ArrowRight size={15} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-glow" />
          <p className="landing-kicker">
            <Sparkles size={15} /> AI-NATIVE PAYROLL, WITH A HUMAN CHECKPOINT
          </p>
          <h1>
            Payroll that thinks
            <br />
            before you pay.
          </h1>
          <p className="landing-subtitle">
            Run payroll, explore scenarios, and turn natural-language requests into reviewable
            actions—while deterministic code keeps every rupee honest.
          </p>
          <div className="landing-actions">
            <Link className="button primary landing-cta" href="/?period=2026-09">
              Explore the live demo <ArrowRight size={17} />
            </Link>
            <Link className="button landing-cta" href="/portal">
              Preview employee portal <ReceiptText size={17} />
            </Link>
          </div>
          <div className="landing-proof">
            <span>
              <CheckCircle2 size={16} /> Deterministic paise calculations
            </span>
            <span>
              <CheckCircle2 size={16} /> Explicit human approval
            </span>
            <span>
              <CheckCircle2 size={16} /> Realtime Convex backend
            </span>
          </div>
          <div className="landing-product-card">
            <div className="landing-product-top">
              <span className="landing-product-logo">
                <Sparkles size={18} /> PayFlow Copilot
              </span>
              <span>
                <ShieldCheck size={15} /> Human approval on
              </span>
            </div>
            <div className="landing-conversation">
              <div className="landing-prompt">
                Give Ananya a ₹20,000 performance bonus this month.
              </div>
              <div className="landing-response">
                <span>
                  <Bot size={18} />
                </span>
                <div>
                  <small>STRUCTURED PROPOSAL</small>
                  <strong>Performance bonus · ₹20,000</strong>
                  <p>
                    Confirmation submits a pending adjustment. Payroll changes only after a separate
                    approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="landing-section">
          <p className="eyebrow">DESIGNED FOR TRUST</p>
          <h2>AI interprets. PayFlow calculates. You decide.</h2>
          <div className="landing-steps">
            {[
              [
                '01',
                'Ask in plain language',
                'Explore payroll or describe the adjustment you need.',
              ],
              [
                '02',
                'Review exact impact',
                'Application code resolves people and calculates money in paise.',
              ],
              [
                '03',
                'Approve deliberately',
                'Every change passes explicit confirmation and the normal approval workflow.',
              ],
            ].map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="features" className="landing-section landing-features">
          <div>
            <Users size={22} />
            <h3>People lifecycle</h3>
            <p>
              Onboard, update compensation, and schedule employment endings without rewriting
              payroll history.
            </p>
          </div>
          <div>
            <FlaskConical size={22} />
            <h3>Scenario planning</h3>
            <p>
              Model employee or department raises in an isolated workspace before making decisions.
            </p>
          </div>
          <div>
            <ReceiptText size={22} />
            <h3>Finalized payslips</h3>
            <p>
              Give employees a clear view generated directly from immutable processed payroll
              snapshots.
            </p>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>PayFlow · Modern Stack Hackathon</span>
        <Link href="/?period=2026-09">
          Open workspace <ArrowRight size={14} />
        </Link>
      </footer>
    </>
  );
}
