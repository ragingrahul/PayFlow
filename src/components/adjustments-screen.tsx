'use client';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Plus, Check } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
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
      setSuccess('Adjustment saved. Your projected payroll has updated.');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
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
            <p className="muted">Only approved adjustments are included in payroll</p>
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
          title="Add an approved adjustment"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={submit}>
            <p className="muted">
              This direct HR entry changes the projection for {periodLabel(month, year)}. Confirm
              the person and amount before saving.
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
                {busy ? 'Saving…' : 'Confirm & add adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
