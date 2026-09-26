'use client';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Plus, Calculator, Check, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          <span className={run.status === 'processed' ? 'complete' : ''}>
            <span className="step-number">3</span>Approval
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
                  ? 'Historical demo payroll. No bank transfer was made.'
                  : 'Payroll is saved and ready for review. Approval and finalization arrive in Milestone 2.'}
              </p>
            </div>
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
    </>
  );
}
