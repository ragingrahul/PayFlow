'use client';
import Link from 'next/link';
import { FlaskConical, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useWorkspace } from './shell';
import { PageHeader } from './ui';
export function FutureScreen({ kind }: { kind: 'scenarios' | 'copilot' }) {
  const scenario = kind === 'scenarios';
  const Icon = scenario ? FlaskConical : Sparkles;
  return (
    <>
      <PageHeader
        eyebrow="A LOOK AT WHAT’S NEXT"
        title={scenario ? 'Explore the what-ifs.' : 'Meet your payroll copilot.'}
        description={
          scenario
            ? 'Model a change. Understand the impact. Decide with confidence.'
            : 'Less clicking through forms. More getting things done.'
        }
      />
      <section className="future-card">
        <span className="future-icon">
          <Icon size={32} />
        </span>
        <span className="count-pill">PLANNED · MILESTONE {scenario ? '3' : '4'}</span>
        <h2>
          {scenario
            ? 'A safe space for your next big decision.'
            : 'Payroll that thinks before you pay.'}
        </h2>
        <p>
          {scenario
            ? '“What would an 8% raise for Engineering cost annually?”'
            : '“Give Ananya a ₹20,000 performance bonus this month.”'}
        </p>
        <div className="future-steps">
          <span>Understand the request</span>
          <ArrowRight size={16} />
          <span>Preview the impact</span>
          <ArrowRight size={16} />
          <span>You confirm</span>
        </div>
        <div className="notice">
          <ShieldCheck size={21} />
          <p>
            {scenario
              ? 'Scenarios will calculate hypothetical changes without touching your actual payroll.'
              : 'Your copilot will propose changes, with deterministic calculations and your explicit approval before anything changes.'}
          </p>
        </div>
        <p className="muted">
          This feature is planned and is not active yet. Your payroll foundation is ready to
          explore.
        </p>
        <Link href="/payroll" className="button primary">
          Go to payroll
          <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
export function SettingsScreen() {
  const { company } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE DETAILS"
        title="A home for your team."
        description="The essentials behind your payroll workspace."
      />
      <section className="panel settings-panel">
        <div className="panel-heading">
          <h2>Company information</h2>
          <span className="count-pill">Read only</span>
        </div>
        <dl className="details-list">
          <div>
            <dt>Company</dt>
            <dd>{company.name}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>India</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>INR · Indian rupee</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>Development demo</dd>
          </div>
          <div>
            <dt>Payroll schedule</dt>
            <dd>Monthly · Last calendar day</dd>
          </div>
        </dl>
        <div className="notice inline-notice">
          <ShieldCheck size={20} />
          <p>
            This foundation uses demo data without authentication, statutory calculations, or bank
            transfers. Company editing and workspace management will arrive in a later milestone.
          </p>
        </div>
      </section>
    </>
  );
}
