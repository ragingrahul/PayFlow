'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import {
  Search,
  ArrowUpRight,
  ArrowLeft,
  Mail,
  Briefcase,
  CalendarDays,
  Wallet,
  PencilLine,
  TrendingUp,
  Plus,
  UserRound,
  UserMinus,
  UserCheck,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { useWorkspace } from './shell';
import { Avatar, Badge, PageHeader, Loading, Empty, Modal, ErrorMessage, messageOf } from './ui';
import { inr, shortDate, humanize, periodLabel } from '@/lib/format';
import { parseInr } from '@/lib/payroll';
export function PeopleScreen() {
  const { company, month, year } = useWorkspace();
  const people = useQuery(api.employees.list, { companyId: company._id, month, year });
  const createEmployee = useMutation(api.employees.create);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!people) return <Loading />;
  const filtered = people.filter(
    (e) =>
      (department === 'all' || e.department === department) &&
      `${e.firstName} ${e.lastName} ${e.email} ${e.employeeCode}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const nextPeriodDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  async function submitEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await createEmployee({
        companyId: company._id,
        employeeCode: String(form.get('employeeCode')),
        firstName: String(form.get('firstName')),
        lastName: String(form.get('lastName')),
        email: String(form.get('email')),
        department: String(form.get('department')),
        jobTitle: String(form.get('jobTitle')),
        employmentType: String(form.get('employmentType')) as
          'full_time' | 'part_time' | 'contractor',
        joiningDate: String(form.get('joiningDate')),
        monthlySalary: parseInr(String(form.get('monthlySalary'))),
      });
      setCreating(false);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="THE PEOPLE BEHIND THE PAYROLL"
        title="Your team."
        description="One place for your people and their compensation."
        actions={
          <>
            <span className="count-pill">{people.length} team members</span>
            <button
              className="button primary"
              onClick={() => {
                setError(null);
                setCreating(true);
              }}
            >
              <Plus size={17} /> Add person
            </button>
          </>
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={18} aria-hidden />
            <span className="sr-only">Search people</span>
            <input
              type="search"
              placeholder="Search by name, email, or employee ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="filter-label">
            <span className="sr-only">Department</span>
            <select
              aria-label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="all">All departments</option>
              {[...new Set(people.map((e) => e.department))].sort().map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Employment</th>
                  <th className="numeric">Monthly salary</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <Link
                        className="person-cell"
                        href={`/people/${e._id}?period=${year}-${String(month).padStart(2, '0')}`}
                      >
                        <Avatar name={`${e.firstName} ${e.lastName}`} />
                        <span>
                          <strong>
                            {e.firstName} {e.lastName}
                          </strong>
                          <small>{e.jobTitle}</small>
                        </span>
                      </Link>
                    </td>
                    <td>{e.department}</td>
                    <td>
                      <span className="type-pill">{humanize(e.employmentType)}</span>
                    </td>
                    <td className="numeric">{inr(e.currentMonthlySalary)}</td>
                    <td>
                      <Badge value={e.leavingDate ? 'scheduled_end' : e.status} />
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        href={`/people/${e._id}?period=${year}-${String(month).padStart(2, '0')}`}
                        aria-label={`View ${e.firstName} ${e.lastName}`}
                      >
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No matching people" description="Try another name or department." />
        )}
        <div className="table-foot">
          Showing {filtered.length} of {people.length} people{' '}
          <span>Monthly compensation · INR</span>
        </div>
      </section>
      {creating && (
        <Modal title="Add a person" onClose={() => !busy && setCreating(false)}>
          <form onSubmit={submitEmployee}>
            <p className="muted modal-intro">
              Add a real employee record and its starting monthly compensation. Existing calculated
              payroll stays locked.
            </p>
            <EmployeeFields defaultJoiningDate={nextPeriodDate} />
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button className="button primary" type="submit" disabled={busy}>
                {busy ? 'Adding…' : 'Add person'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function EmployeeFields({
  defaults,
  defaultJoiningDate,
  includeSalary = true,
}: {
  defaults?: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    jobTitle: string;
    employmentType: 'full_time' | 'part_time' | 'contractor';
    joiningDate: string;
  };
  defaultJoiningDate?: string;
  includeSalary?: boolean;
}) {
  return (
    <div className="form-grid employee-form-grid">
      <label>
        First name
        <input name="firstName" required maxLength={60} defaultValue={defaults?.firstName} />
      </label>
      <label>
        Last name
        <input name="lastName" required maxLength={60} defaultValue={defaults?.lastName} />
      </label>
      <label>
        Employee code
        <input
          name="employeeCode"
          required
          pattern="[A-Za-z0-9-]{2,24}"
          maxLength={24}
          placeholder="EMP-025"
          defaultValue={defaults?.employeeCode}
        />
      </label>
      <label>
        Work email
        <input name="email" type="email" required maxLength={160} defaultValue={defaults?.email} />
      </label>
      <label>
        Department
        <input
          name="department"
          required
          minLength={2}
          maxLength={80}
          defaultValue={defaults?.department}
        />
      </label>
      <label>
        Job title
        <input
          name="jobTitle"
          required
          minLength={2}
          maxLength={100}
          defaultValue={defaults?.jobTitle}
        />
      </label>
      <label>
        Employment type
        <select name="employmentType" defaultValue={defaults?.employmentType ?? 'full_time'}>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contractor">Contractor · monthly</option>
        </select>
      </label>
      <label>
        Joining date
        <input
          name="joiningDate"
          type="date"
          required
          defaultValue={defaults?.joiningDate ?? defaultJoiningDate}
        />
      </label>
      {includeSalary && (
        <label className="form-span">
          Starting monthly compensation (INR)
          <input
            name="monthlySalary"
            required
            inputMode="decimal"
            pattern="[0-9]+(\.[0-9]{1,2})?"
            placeholder="85000.00"
          />
          <small>
            Contractors use an agreed monthly amount in this MVP; hourly timesheets are out of
            scope.
          </small>
        </label>
      )}
    </div>
  );
}
export function EmployeeScreen({ employeeId }: { employeeId: string }) {
  const { company, month, year } = useWorkspace();
  const data = useQuery(api.employees.detail, { companyId: company._id, employeeId, month, year });
  const revise = useMutation(api.employees.reviseCompensation);
  const updateProfile = useMutation(api.employees.updateProfile);
  const deactivate = useMutation(api.employees.deactivate);
  const reactivate = useMutation(api.employees.reactivate);
  const [editing, setEditing] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [lifecycleEditing, setLifecycleEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  if (data === undefined) return <Loading />;
  if (!data)
    return (
      <Empty
        title="Employee not found"
        description="This employee may not exist in your workspace."
      >
        <Link href={`/people?period=${year}-${String(month).padStart(2, '0')}`} className="button">
          Back to people
        </Link>
      </Empty>
    );
  const { employee: e, history, adjustments, compensationRevisions } = data;
  async function submitRevision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const [effectiveYear, effectiveMonth] = String(form.get('effectivePeriod'))
        .split('-')
        .map(Number);
      await revise({
        companyId: company._id,
        employeeId: e._id,
        monthlySalary: parseInr(String(form.get('salary'))),
        effectiveMonth,
        effectiveYear,
        reason: String(form.get('reason')),
      });
      setEditing(false);
      setSuccess('Salary revision saved with its effective month.');
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await updateProfile({
        companyId: company._id,
        employeeId: e._id,
        employeeCode: String(form.get('employeeCode')),
        firstName: String(form.get('firstName')),
        lastName: String(form.get('lastName')),
        email: String(form.get('email')),
        department: String(form.get('department')),
        jobTitle: String(form.get('jobTitle')),
        employmentType: String(form.get('employmentType')) as
          'full_time' | 'part_time' | 'contractor',
        joiningDate: String(form.get('joiningDate')),
      });
      setProfileEditing(false);
      setSuccess('Employee profile updated.');
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  async function submitLifecycle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (e.status === 'active') {
        const form = new FormData(event.currentTarget);
        await deactivate({
          companyId: company._id,
          employeeId: e._id,
          leavingDate: String(form.get('leavingDate')),
        });
        setSuccess('Employment end saved. The employee remains eligible through that month.');
      } else {
        await reactivate({ companyId: company._id, employeeId: e._id });
        setSuccess('Employee reactivated.');
      }
      setLifecycleEditing(false);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" href={`/people?period=${year}-${String(month).padStart(2, '0')}`}>
        <ArrowLeft size={16} />
        All people
      </Link>
      <section className="panel employee-hero">
        <Avatar large name={`${e.firstName} ${e.lastName}`} />
        <div>
          <p className="eyebrow">
            {e.employeeCode} · {e.department}
          </p>
          <h1>
            {e.firstName} {e.lastName}
          </h1>
          <p className="muted">{e.jobTitle}</p>
        </div>
        <div className="employee-hero-actions">
          <Badge value={e.leavingDate ? 'scheduled_end' : e.status} />
          <Link className="button" href={`/portal/${e._id}`}>
            <UserRound size={16} /> Portal preview
          </Link>
        </div>
      </section>
      {success && (
        <p role="status" className="success-message">
          {success}
        </p>
      )}
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Employee details</h2>
            <button
              className="button compact"
              onClick={() => {
                setError(null);
                setProfileEditing(true);
              }}
            >
              <PencilLine size={15} /> Edit profile
            </button>
          </div>
          <dl className="details-list">
            <div>
              <dt>
                <Mail size={16} />
                Email
              </dt>
              <dd>{e.email}</dd>
            </div>
            <div>
              <dt>
                <Briefcase size={16} />
                Employment
              </dt>
              <dd>{humanize(e.employmentType)}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={16} />
                Joined
              </dt>
              <dd>{shortDate(e.joiningDate)}</dd>
            </div>
            {e.leavingDate && (
              <div>
                <dt>
                  <CalendarDays size={16} />
                  Employment ends
                </dt>
                <dd>{shortDate(e.leavingDate)}</dd>
              </div>
            )}
            <div>
              <dt>
                <Wallet size={16} />
                Monthly base
              </dt>
              <dd className="large-money">{inr(e.currentMonthlySalary)}</dd>
            </div>
          </dl>
          <p className="panel-note">
            Salary shown for {periodLabel(month, year)}. Tax and proration are outside this demo’s
            scope.
          </p>
          <button
            className="button"
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
          >
            <PencilLine size={16} /> Schedule salary change
          </button>
          <button
            className="button"
            onClick={() => {
              setError(null);
              setLifecycleEditing(true);
            }}
          >
            {e.status === 'active' ? <UserMinus size={16} /> : <UserCheck size={16} />}
            {e.status === 'active' ? 'Schedule employment end' : 'Reactivate employee'}
          </button>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Payroll history</h2>
            <span className="count-pill">{history.length} runs</span>
          </div>
          {history.length ? (
            <div className="history-list">
              {history.map(({ item, run }) => (
                <div key={item._id}>
                  <div>
                    <strong>{run ? periodLabel(run.month, run.year) : 'Payroll run'}</strong>
                    <small>
                      Base {inr(item.basePay)} · Bonus {inr(item.bonusTotal)}
                    </small>
                  </div>
                  <div>
                    <strong>{inr(item.netPay)}</strong>
                    {run && <Badge value={run.status} />}
                    {run?.status === 'processed' && (
                      <Link className="text-link" href={`/portal/${e._id}/payslips/${item._id}`}>
                        Payslip <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="First payday ahead" description="Calculated payroll will appear here." />
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Compensation timeline</h2>
            <p className="muted">Each salary applies from its effective month onward.</p>
          </div>
          <span className="count-pill">{compensationRevisions.length} revisions</span>
        </div>
        {compensationRevisions.length ? (
          <div className="history-list">
            {compensationRevisions.map((revision) => (
              <div key={revision._id}>
                <div>
                  <strong>{periodLabel(revision.effectiveMonth, revision.effectiveYear)}</strong>
                  <small>{revision.reason}</small>
                </div>
                <strong>{inr(revision.monthlySalary)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No salary timeline"
            description="Run the Milestone 2 migration to backfill compensation history."
          />
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Adjustments</h2>
        </div>
        {adjustments.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Period</th>
                  <th>Type</th>
                  <th className="numeric">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a._id}>
                    <td>{a.title}</td>
                    <td>{periodLabel(a.effectiveMonth, a.effectiveYear)}</td>
                    <td>{humanize(a.type)}</td>
                    <td className="numeric">{inr(a.amount)}</td>
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
            title="No adjustments"
            description="Bonuses, reimbursements, and deductions will appear here."
          />
        )}
      </section>
      {editing && (
        <Modal
          title="Schedule a salary change"
          onClose={() => {
            if (!busy) setEditing(false);
          }}
        >
          <form onSubmit={submitRevision}>
            <div className="notice">
              <TrendingUp size={20} />
              <p>
                The new amount is used from its effective month. Saved payroll results never change.
              </p>
            </div>
            <div className="form-grid">
              <label>
                New monthly salary (INR)
                <input
                  name="salary"
                  inputMode="decimal"
                  required
                  pattern="[0-9]+(\.[0-9]{1,2})?"
                  placeholder="125000.00"
                />
              </label>
              <label>
                Effective month
                <input
                  name="effectivePeriod"
                  type="month"
                  min="2000-01"
                  max="2100-12"
                  defaultValue={`${year}-${String(month).padStart(2, '0')}`}
                  required
                />
              </label>
              <label className="form-span">
                Reason
                <input
                  name="reason"
                  minLength={3}
                  maxLength={160}
                  required
                  placeholder="Annual compensation review"
                />
              </label>
            </div>
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save salary revision'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {profileEditing && (
        <Modal title="Edit employee profile" onClose={() => !busy && setProfileEditing(false)}>
          <form onSubmit={submitProfile}>
            <EmployeeFields
              includeSalary={false}
              defaults={{
                employeeCode: e.employeeCode,
                firstName: e.firstName,
                lastName: e.lastName,
                email: e.email,
                department: e.department,
                jobTitle: e.jobTitle,
                employmentType: e.employmentType,
                joiningDate: e.joiningDate,
              }}
            />
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() => setProfileEditing(false)}
              >
                Cancel
              </button>
              <button className="button primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {lifecycleEditing && (
        <Modal
          title={e.status === 'active' ? 'Schedule employment end' : 'Reactivate employee'}
          onClose={() => !busy && setLifecycleEditing(false)}
        >
          <form onSubmit={submitLifecycle}>
            {e.status === 'active' ? (
              <>
                <p className="muted modal-intro">
                  PayFlow uses full-month payroll. This person remains eligible in their leaving
                  month and is excluded afterward.
                </p>
                <label className="field-label">
                  Last working date
                  <input name="leavingDate" type="date" min={e.joiningDate} required />
                </label>
              </>
            ) : (
              <div className="notice">
                <UserCheck size={20} />
                <p>
                  Reactivation removes the employment end date. Calculated payroll remains locked.
                </p>
              </div>
            )}
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() => setLifecycleEditing(false)}
              >
                Cancel
              </button>
              <button className="button primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : e.status === 'active' ? 'Save employment end' : 'Reactivate'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
