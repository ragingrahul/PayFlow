'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  Printer,
  Search,
  Send,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { inr, periodLabel, shortDate } from '@/lib/format';
import { Avatar, Badge, Empty, ErrorMessage, Loading, messageOf } from './ui';
import { useWorkspace } from './shell';

type EmailConfiguration = { configured: boolean; missing: string[] };

export function PortalDirectoryScreen() {
  const { company, month, year } = useWorkspace();
  const people = useQuery(api.employees.list, { companyId: company._id, month, year });
  const [search, setSearch] = useState('');
  if (!people) return <Loading />;
  const matches = people.filter((employee) =>
    `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.employeeCode}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="portal-container">
      <section className="portal-hero">
        <p className="eyebrow">EMPLOYEE EXPERIENCE PREVIEW</p>
        <h1>Your pay, clearly explained.</h1>
        <p>
          Choose a demo employee to preview their finalized payroll history. Production identity and
          access control are intentionally not claimed in this hackathon build.
        </p>
      </section>
      <section className="portal-card portal-directory-card">
        <div className="portal-card-heading">
          <div>
            <h2>Choose an employee</h2>
            <p className="muted">Only processed runs appear as payslips.</p>
          </div>
          <span className="count-pill">{people.length} people</span>
        </div>
        <label className="search-input portal-search">
          <Search size={18} />
          <span className="sr-only">Search employees</span>
          <input
            type="search"
            placeholder="Search name, email, or employee code…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="portal-people-grid">
          {matches.map((employee) => (
            <Link
              key={employee._id}
              href={`/portal/${employee._id}`}
              className="portal-person-card"
            >
              <Avatar name={`${employee.firstName} ${employee.lastName}`} />
              <span>
                <strong>
                  {employee.firstName} {employee.lastName}
                </strong>
                <small>{employee.jobTitle}</small>
                <small>
                  {employee.employeeCode} · {employee.department}
                </small>
              </span>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function EmployeePortalScreen({ employeeId }: { employeeId: string }) {
  const { company, month, year } = useWorkspace();
  const id = employeeId as Id<'employees'>;
  const detail = useQuery(api.employees.detail, {
    companyId: company._id,
    employeeId,
    month,
    year,
  });
  const payslips = useQuery(api.payslips.listForEmployee, {
    companyId: company._id,
    employeeId: id,
  });
  if (detail === undefined || payslips === undefined) return <Loading />;
  if (!detail)
    return <Empty title="Employee unavailable" description="Return to the preview directory." />;
  const employee = detail.employee;
  return (
    <div className="portal-container">
      <Link href="/portal" className="back-link">
        <ArrowLeft size={16} /> Change employee
      </Link>
      <section className="portal-profile-card">
        <div className="portal-profile-copy">
          <Avatar large name={`${employee.firstName} ${employee.lastName}`} />
          <div>
            <p className="eyebrow">WELCOME BACK</p>
            <h1>
              {employee.firstName} {employee.lastName}
            </h1>
            <p>
              {employee.jobTitle} · {employee.department}
            </p>
          </div>
        </div>
        <div className="portal-profile-meta">
          <span>
            <BriefcaseBusiness size={16} /> {employee.employeeCode}
          </span>
          <span>
            <Mail size={16} /> {employee.email}
          </span>
          <span>
            <Building2 size={16} /> {company.name}
          </span>
        </div>
      </section>
      <div className="portal-summary-grid">
        <div className="portal-stat">
          <WalletCards size={20} />
          <span>Current monthly compensation</span>
          <strong>{inr(employee.currentMonthlySalary)}</strong>
        </div>
        <div className="portal-stat">
          <FileText size={20} />
          <span>Available payslips</span>
          <strong>{payslips.length}</strong>
        </div>
        <div className="portal-stat">
          <ShieldCheck size={20} />
          <span>Employment status</span>
          <strong>
            {employee.leavingDate
              ? `Ends ${shortDate(employee.leavingDate)}`
              : employee.status === 'active'
                ? 'Active'
                : 'Inactive'}
          </strong>
        </div>
      </div>
      <section className="portal-card">
        <div className="portal-card-heading">
          <div>
            <h2>Payslips</h2>
            <p className="muted">Final payroll snapshots from {company.name}.</p>
          </div>
        </div>
        {payslips.length ? (
          <div className="payslip-list">
            {payslips.map(({ item, run }) => (
              <Link key={item._id} href={`/portal/${employee._id}/payslips/${item._id}`}>
                <span className="payslip-list-icon">
                  <FileText size={19} />
                </span>
                <span>
                  <strong>{run ? periodLabel(run.month, run.year) : 'Finalized payroll'}</strong>
                  <small>
                    {run?.processedAt
                      ? `Finalized ${shortDate(run.processedAt)}`
                      : 'Final payroll record'}
                  </small>
                </span>
                <strong>{inr(item.netPay)}</strong>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="No finalized payslips yet"
            description="A payslip appears here after HR approves and finalizes a payroll run."
          />
        )}
      </section>
    </div>
  );
}

export function PayslipScreen({
  employeeId,
  payrollItemId,
}: {
  employeeId: string;
  payrollItemId: string;
}) {
  const { company } = useWorkspace();
  const data = useQuery(api.payslips.detail, {
    companyId: company._id,
    payrollItemId: payrollItemId as Id<'payrollItems'>,
  });
  const [emailConfig, setEmailConfig] = useState<EmailConfiguration | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    fetch('/api/payslips/email')
      .then((response) => response.json())
      .then((value: EmailConfiguration) => current && setEmailConfig(value))
      .catch(() => current && setEmailConfig({ configured: false, missing: ['RESEND_API_KEY'] }));
    return () => {
      current = false;
    };
  }, []);
  async function sendPayslip() {
    setSending(true);
    setError(null);
    setSuccess('');
    try {
      const response = await fetch('/api/payslips/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company._id, payrollItemId }),
      });
      const result = (await response.json()) as { error?: string; recipient?: string };
      if (!response.ok) throw new Error(result.error || 'Payslip delivery failed.');
      setSuccess(`Payslip sent to ${result.recipient}.`);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setSending(false);
    }
  }
  if (data === undefined) return <Loading />;
  const { item, run, employee, deliveries } = data;
  if (item.employeeId !== employeeId)
    return (
      <Empty
        title="Payslip unavailable"
        description="This payslip does not belong to the selected employee."
      />
    );
  const period = periodLabel(run.month, run.year);
  return (
    <div className="portal-container payslip-page">
      <div className="payslip-toolbar no-print">
        <Link href={`/portal/${employee._id}`} className="back-link">
          <ArrowLeft size={16} /> All payslips
        </Link>
        <div>
          <button className="button" onClick={() => window.print()}>
            <Printer size={16} /> Print / save PDF
          </button>
          <button
            className="button primary"
            disabled={sending || !emailConfig?.configured}
            onClick={sendPayslip}
          >
            <Send size={16} /> {sending ? 'Sending…' : 'Email payslip'}
          </button>
        </div>
      </div>
      {emailConfig && !emailConfig.configured && (
        <div className="notice warning-notice no-print">
          <Mail size={19} />
          <p>
            Add {emailConfig.missing.join(', ')} to <code>.env.local</code> to enable real Resend
            delivery.
          </p>
        </div>
      )}
      {success && (
        <p className="success-message no-print">
          <CheckCircle2 size={16} /> {success}
        </p>
      )}
      <ErrorMessage message={error} />
      <article className="payslip-document">
        <header className="payslip-header">
          <div>
            <span className="payslip-brand">
              payflow<span>.</span>
            </span>
            <p>Generated from a finalized payroll snapshot</p>
          </div>
          <div>
            <span>PAYSLIP</span>
            <strong>{period}</strong>
          </div>
        </header>
        <section className="payslip-company">
          <div>
            <small>Employer</small>
            <strong>{company.name}</strong>
            <span>India · INR payroll</span>
          </div>
          <div>
            <small>Employee</small>
            <strong>{item.employeeName}</strong>
            <span>
              {item.employeeCode} · {item.jobTitle}
            </span>
          </div>
        </section>
        <section className="payslip-lines">
          <div className="payslip-line-heading">
            <span>Earnings</span>
            <span>Amount</span>
          </div>
          <div>
            <span>Base compensation</span>
            <strong>{inr(item.basePay)}</strong>
          </div>
          <div>
            <span>Bonus</span>
            <strong>{item.bonusTotal ? inr(item.bonusTotal) : '—'}</strong>
          </div>
          <div>
            <span>Reimbursements</span>
            <strong>{item.reimbursementTotal ? inr(item.reimbursementTotal) : '—'}</strong>
          </div>
          <div className="payslip-subtotal">
            <span>Gross pay</span>
            <strong>{inr(item.grossPay)}</strong>
          </div>
          <div className="payslip-line-heading deductions">
            <span>Deductions</span>
            <span>Amount</span>
          </div>
          <div>
            <span>Payroll deductions</span>
            <strong>{item.deductionTotal ? `−${inr(item.deductionTotal)}` : '—'}</strong>
          </div>
        </section>
        <section className="payslip-net">
          <div>
            <span>Net pay</span>
            <small>Final recorded amount</small>
          </div>
          <strong>{inr(item.netPay)}</strong>
        </section>
        <footer className="payslip-footer">
          <ShieldCheck size={18} />
          <p>
            This document records a finalized payroll result. PayFlow did not initiate a bank
            transfer or calculate statutory taxes.
          </p>
        </footer>
      </article>
      {deliveries.length > 0 && (
        <section className="portal-card no-print delivery-history">
          <h2>Delivery history</h2>
          {deliveries.map((delivery) => (
            <div key={delivery._id}>
              <Badge value={delivery.status} />
              <span>{delivery.recipient}</span>
              <small>{shortDate(delivery.createdAt)}</small>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
