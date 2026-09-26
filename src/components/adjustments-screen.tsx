'use client';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Plus, Check, X, ShieldCheck } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { parseInr, type AdjustmentType } from '@/lib/payroll';
import { inr, periodLabel, humanize } from '@/lib/format';
import { useWorkspace, PeriodPicker } from './shell';
import { PageHeader, Loading, Empty, Badge, Modal, ErrorMessage, messageOf } from './ui';
export function AdjustmentsScreen() {
  const { company, month, year } = useWorkspace();
  const entries = useQuery(api.adjustments.list, { companyId: company._id, month, year });
  const employees = useQuery(api.employees.list, { companyId: company._id });
  const runs = useQuery(api.payroll.list, { companyId: company._id });
  const create = useMutation(api.adjustments.create);
  const approve = useMutation(api.adjustments.approve);
  const reject = useMutation(api.adjustments.reject);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [review, setReview] = useState<{
    id: Id<'adjustments'>;
    decision: 'approve' | 'reject';
  } | null>(null);
  if (!entries || !employees || !runs) return <Loading />;
  const locked = runs.some((r) => r.month === month && r.year === year && r.status !== 'draft');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await create({
        companyId: company._id,
        month,
        year,
        employeeId: String(data.get('employee')) as Id<'employees'>,
        type: String(data.get('type')) as AdjustmentType,
        amount: parseInr(String(data.get('amount'))),
        title: String(data.get('title')),
      });
      setOpen(false);
      setSuccess('Adjustment submitted for review. Payroll will change only after approval.');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!review) return;
    setBusy(true);
    setError(null);
    const note = String(new FormData(e.currentTarget).get('note') ?? '');
    try {
      const mutation = review.decision === 'approve' ? approve : reject;
      await mutation({ companyId: company._id, adjustmentId: review.id, note: note || undefined });
      setSuccess(
        review.decision === 'approve'
          ? 'Adjustment approved and included in the payroll projection.'
          : 'Adjustment rejected and excluded from payroll.',
      );
      setReview(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  const selectedReview = review ? entries.find((entry) => entry._id === review.id) : null;
  return (
    <>
      <PageHeader
        eyebrow="EVERY DETAIL ACCOUNTED FOR"
        title="The extras. And the exceptions."
        description="Manage the bonuses, reimbursements, and deductions behind each payday."
        actions={
          <>
            <PeriodPicker />
            <button
              className="button primary"
              disabled={locked}
              onClick={() => {
                setError(null);
                setSuccess('');
                setOpen(true);
              }}
            >
              <Plus size={17} />
              Add adjustment
            </button>
          </>
        }
      />
      {locked && (
        <div className="notice">
          <Check size={19} />
          <p>
            This period’s payroll is calculated. Its adjustments are locked to preserve the saved
            results. Select a draft or future period to add an adjustment.
          </p>
        </div>
      )}
      {success && (
        <p role="status" className="success-message">
          {success}
        </p>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{periodLabel(month, year)}</h2>
            <p className="muted">
              Pending entries wait for review; only approved entries affect payroll.
            </p>
          </div>
          <span className="count-pill">{entries.length} entries</span>
        </div>
        {entries.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Adjustment</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th className="numeric">Amount</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Review</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((a) => (
                  <tr key={a._id}>
                    <td className="bold">{a.title}</td>
                    <td>{a.employeeName}</td>
                    <td>{humanize(a.type)}</td>
                    <td className="numeric">
                      {a.type === 'deduction' ? '−' : '+'}
                      {inr(a.amount)}
                    </td>
                    <td>
                      <Badge value={a.status} />
                    </td>
                    <td>
                      {a.status === 'pending' && (
                        <div className="row-actions">
                          <button
                            className="button small"
                            disabled={locked}
                            onClick={() => {
                              setError(null);
                              setReview({ id: a._id, decision: 'approve' });
                            }}
                          >
                            <Check size={15} /> Approve
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Reject ${a.title}`}
                            onClick={() => {
                              setError(null);
                              setReview({ id: a._id, decision: 'reject' });
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="A clean slate this month"
            description="Add approved adjustments before calculating payroll."
          />
        )}
      </section>
      {open && (
        <Modal
          title="Submit an adjustment"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={submit}>
            <p className="muted">
              This creates a pending entry for {periodLabel(month, year)}. A separate approval step
              is required before it changes payroll.
            </p>
            <div className="form-grid">
              <label>
                Employee
                <select name="employee" required defaultValue="">
                  <option disabled value="">
                    Choose a person
                  </option>
                  {employees
                    .filter((e) => e.status === 'active')
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.firstName} {e.lastName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Adjustment type
                <select name="type">
                  <option value="bonus">Bonus</option>
                  <option value="reimbursement">Reimbursement</option>
                  <option value="deduction">Deduction</option>
                </select>
              </label>
              <label>
                Amount (INR)
                <input
                  name="amount"
                  inputMode="decimal"
                  placeholder="20000.00"
                  required
                  pattern="[0-9]+(\.[0-9]{1,2})?"
                  aria-describedby="amount-help"
                />
                <small id="amount-help">Positive amount, up to two decimal places.</small>
              </label>
              <label>
                Description
                <input name="title" required maxLength={120} placeholder="Performance bonus" />
              </label>
            </div>
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {review && selectedReview && (
        <Modal
          title={`${review.decision === 'approve' ? 'Approve' : 'Reject'} adjustment`}
          onClose={() => {
            if (!busy) setReview(null);
          }}
        >
          <form onSubmit={submitReview}>
            <p className="muted">
              <strong>{selectedReview.title}</strong> · {selectedReview.employeeName} ·{' '}
              {inr(selectedReview.amount)}
            </p>
            <div className="notice">
              <ShieldCheck size={20} />
              <p>
                {review.decision === 'approve'
                  ? 'Approval includes this amount in the payroll projection. The system revalidates the full payroll before saving.'
                  : 'Rejection keeps this amount out of payroll and records the decision.'}
              </p>
            </div>
            <label>
              Review note (optional)
              <textarea
                name="note"
                maxLength={240}
                rows={3}
                placeholder="Add context for the activity record"
              />
            </label>
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setReview(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`button ${review.decision === 'approve' ? 'primary' : 'danger'}`}
                disabled={busy}
              >
                {busy
                  ? 'Saving decision…'
                  : review.decision === 'approve'
                    ? 'Approve adjustment'
                    : 'Reject adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
