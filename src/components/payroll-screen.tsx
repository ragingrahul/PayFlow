'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import {
  Plus,
  Calculator,
  Check,
  ShieldCheck,
  ArrowRight,
  Wallet,
  LockKeyhole,
  FileText,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useWorkspace, PeriodPicker } from './shell';
import { Badge, PageHeader, Loading, Empty, Modal, ErrorMessage, Avatar, messageOf } from './ui';
import { inr, periodLabel } from '@/lib/format';
export function PayrollScreen() {
  const { company, month, year, setPeriod } = useWorkspace();
  const runs = useQuery(api.payroll.list, { companyId: company._id });
  const create = useMutation(api.payroll.create);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!runs) return <Loading />;
  const selected = runs.find((r) => r.month === month && r.year === year);
  async function createRun() {
    setBusy(true);
    setError(null);
    try {
      await create({ companyId: company._id, month, year });
      setShowCreate(false);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="CONFIDENT PAYROLL STARTS HERE"
        title="Payday, without the guesswork."
        description="Prepare, calculate, and review every detail before approval."
        actions={
          <>
            <PeriodPicker />
            {!selected && (
              <button
                className="button primary"
                onClick={() => {
                  setError(null);
                  setShowCreate(true);
                }}
              >
                <Plus size={17} />
                Create payroll
              </button>
            )}
          </>
        }
      />
      <div className="payroll-layout">
        <aside className="panel run-list">
          <div className="panel-heading">
            <h2>Payroll runs</h2>
            <span className="count-pill">{runs.length}</span>
          </div>
          {runs.length ? (
            runs.map((r) => (
              <button
                key={r._id}
                className={`run-option ${r._id === selected?._id ? 'selected' : ''}`}
                onClick={() => setPeriod(r.month, r.year)}
              >
                <span>
                  <strong>{periodLabel(r.month, r.year)}</strong>
                  <small>
                    {r.status === 'draft' ? 'Awaiting calculation' : inr(r.totalNetPay)}
                  </small>
                </span>
                <Badge value={r.status} />
              </button>
            ))
          ) : (
            <p className="panel-note">Your first run will appear here.</p>
          )}
        </aside>
        <div className="payroll-main">
          {selected ? (
            <RunDetail key={selected._id} runId={selected._id} />
          ) : (
            <section className="panel">
              <Empty
                title={`Let’s prepare ${periodLabel(month, year)}.`}
                description="Create a draft, then calculate salaries and approved adjustments for everyone eligible this month."
              >
                <button
                  className="button primary"
                  onClick={() => {
                    setError(null);
                    setShowCreate(true);
                  }}
                >
                  <Plus size={17} />
                  Create payroll
                </button>
              </Empty>
            </section>
          )}
        </div>
      </div>
      {showCreate && (
        <Modal
          title="Create a payroll draft"
          onClose={() => {
            if (!busy) setShowCreate(false);
          }}
        >
          <p className="muted">
            Start payroll for <strong>{periodLabel(month, year)}</strong>. This creates an empty
            draft; you’ll calculate salaries and adjustments in the next step.
          </p>
          <div className="notice">
            <ShieldCheck size={20} />
            <p>No payments are initiated. You stay in control of every step.</p>
          </div>
          <ErrorMessage message={error} />
          <div className="modal-actions">
            <button className="button" disabled={busy} onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy} onClick={createRun}>
              {busy ? 'Creating…' : 'Create draft'}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function RunDetail({ runId }: { runId: Id<'payrollRuns'> }) {
  const { company } = useWorkspace();
  const data = useQuery(api.payroll.detail, { companyId: company._id, runId });
  const generate = useMutation(api.payroll.generate);
  const approve = useMutation(api.payroll.approve);
  const finalize = useMutation(api.payroll.finalize);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approve' | 'finalize' | null>(null);
  if (!data) return <Loading />;
  const { run, items } = data;
  async function calculate() {
    setBusy(true);
    setError(null);
    try {
      await generate({ companyId: company._id, runId });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirmDecision() {
    if (!decision) return;
    setBusy(true);
    setError(null);
    try {
      if (decision === 'approve') await approve({ companyId: company._id, runId });
      else await finalize({ companyId: company._id, runId });
      setDecision(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  const draft = run.status === 'draft';
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">MONTHLY PAYROLL</p>
            <h2>{periodLabel(run.month, run.year)}</h2>
          </div>
          <Badge value={run.status} />
        </div>
        <div className="run-progress">
          <span className="complete">
            <Check size={14} />
            Draft created
          </span>
          <i />
          <span className={draft ? '' : 'complete'}>
            {draft ? <span className="step-number">2</span> : <Check size={14} />}Calculate & review
          </span>
          <i />
          <span
            className={run.status === 'approved' || run.status === 'processed' ? 'complete' : ''}
          >
            {run.status === 'approved' || run.status === 'processed' ? (
              <Check size={14} />
            ) : (
              <span className="step-number">3</span>
            )}
            Approval
          </span>
          <i />
          <span className={run.status === 'processed' ? 'complete' : ''}>
            {run.status === 'processed' ? (
              <Check size={14} />
            ) : (
              <span className="step-number">4</span>
            )}
            Finalize
          </span>
        </div>
        {draft ? (
          <div className="draft-intro">
            <div className="draft-icon">
              <Calculator size={30} />
            </div>
            <h2>Ready when you are.</h2>
            <p className="muted">
              Calculate base salaries, approved bonuses, reimbursements, and deductions. Results are
              saved together for a complete, consistent payroll.
            </p>
            <button className="button primary" disabled={busy} onClick={calculate}>
              <Calculator size={17} />
              {busy ? 'Calculating payroll…' : 'Calculate payroll'}
            </button>
            <ErrorMessage message={error} />
            <p className="fine-print">
              Active people who joined by month-end · Full monthly compensation · INR
            </p>
          </div>
        ) : (
          <>
            <div className="run-total">
              <span className="muted">Total net payroll</span>
              <strong data-testid="run-total">{inr(run.totalNetPay)}</strong>
              <span>
                {run.employeeCount} people · {items.length} calculated payroll items
              </span>
            </div>
            <div className="run-breakdown">
              {[
                ['Base pay', run.totalBasePay],
                ['Bonuses', run.totalBonuses],
                ['Reimbursements', run.totalReimbursements],
                ['Deductions', run.totalDeductions],
              ].map(([label, amount]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>
                    {label === 'Deductions' ? '−' : ''}
                    {inr(Number(amount))}
                  </strong>
                </div>
              ))}
            </div>
            <div className="notice inline-notice">
              <ShieldCheck size={19} />
              <p>
                {run.status === 'processed'
                  ? 'This payroll record is final and locked. No bank transfer was made.'
                  : run.status === 'approved'
                    ? 'The figures are approved. Finalize to lock this payroll as the completed record.'
                    : 'Review every employee and total below, then explicitly approve the figures.'}
              </p>
            </div>
            {run.status === 'ready_for_review' && (
              <div className="decision-bar">
                <div>
                  <strong>Ready for your approval</strong>
                  <span>Confirm that the people, salaries, and adjustments below are correct.</span>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setError(null);
                    setDecision('approve');
                  }}
                >
                  <ShieldCheck size={17} /> Approve payroll
                </button>
              </div>
            )}
            {run.status === 'approved' && (
              <div className="decision-bar">
                <div>
                  <strong>Approved and awaiting finalization</strong>
                  <span>Finalization locks the record. It does not send money.</span>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setError(null);
                    setDecision('finalize');
                  }}
                >
                  <LockKeyhole size={17} /> Finalize record
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {!draft && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Employee breakdown</h2>
            <span className="count-pill">{items.length} people</span>
          </div>
          <div className="table-scroll">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="numeric">Base</th>
                  <th className="numeric">Bonus</th>
                  <th className="numeric">Reimb.</th>
                  <th className="numeric">Deduction</th>
                  <th className="numeric">Net pay</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Payslip</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={item.employeeName} />
                        <span>
                          <strong>{item.employeeName}</strong>
                          <small>{item.department}</small>
                        </span>
                      </div>
                    </td>
                    <td className="numeric">{inr(item.basePay)}</td>
                    <td className="numeric">{item.bonusTotal ? inr(item.bonusTotal) : '—'}</td>
                    <td className="numeric">
                      {item.reimbursementTotal ? inr(item.reimbursementTotal) : '—'}
                    </td>
                    <td className="numeric">
                      {item.deductionTotal ? inr(item.deductionTotal) : '—'}
                    </td>
                    <td className="numeric bold">{inr(item.netPay)}</td>
                    <td>
                      <Badge value={item.status} />
                    </td>
                    <td>
                      {run.status === 'processed' ? (
                        <Link
                          className="icon-button"
                          href={`/portal/${item.employeeId}/payslips/${item._id}`}
                          aria-label={`Open ${item.employeeName} payslip`}
                        >
                          <FileText size={16} />
                        </Link>
                      ) : (
                        <span className="muted" title="Available after finalization">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            <span>
              <Wallet size={14} />
              Amounts stored in paise, displayed in INR
            </span>
            <span>Snapshot saved in Convex</span>
          </div>
        </section>
      )}
      {decision && (
        <Modal
          title={decision === 'approve' ? 'Approve this payroll?' : 'Finalize this payroll record?'}
          onClose={() => {
            if (!busy) setDecision(null);
          }}
        >
          <p className="muted">
            {periodLabel(run.month, run.year)} · {run.employeeCount} people
          </p>
          <div className="confirmation-total">
            <span>Total net payroll</span>
            <strong>{inr(run.totalNetPay)}</strong>
          </div>
          <div className="notice">
            {decision === 'approve' ? <ShieldCheck size={20} /> : <LockKeyhole size={20} />}
            <p>
              {decision === 'approve'
                ? 'This confirms that you reviewed the calculated figures. You can then finalize the record.'
                : 'This permanently marks the saved payroll record as processed. PayFlow does not contact a bank or move money.'}
            </p>
          </div>
          <ErrorMessage message={error} />
          <div className="modal-actions">
            <button className="button" disabled={busy} onClick={() => setDecision(null)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy} onClick={confirmDecision}>
              {busy ? 'Saving…' : decision === 'approve' ? 'Confirm approval' : 'Finalize record'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
