'use client';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import {
  ArrowRight,
  ArrowUpRight,
  Wallet,
  Users,
  CalendarDays,
  TrendingUp,
  Check,
  Plus,
  Sparkles,
  Clock3,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { useWorkspace, PeriodPicker } from './shell';
import { PageHeader, Loading, Badge, Empty } from './ui';
import { inr, periodLabel, shortDate, humanize } from '@/lib/format';
export function DashboardScreen() {
  const { company, month, year } = useWorkspace();
  const data = useQuery(api.dashboard.summary, { companyId: company._id, month, year });
  if (!data) return <Loading />;
  const period = periodLabel(month, year);
  const periodQuery = `?period=${year}-${String(month).padStart(2, '0')}`;
  const approved = data.adjustments.filter((a) => a.status === 'approved');
  return (
    <>
      <PageHeader
        eyebrow="YOUR WORKSPACE, AT A GLANCE"
        title="A clearer view of payday."
        description="Your people, your payroll, everything in sync."
        actions={
          <>
            <PeriodPicker />
            <Link href={`/payroll${periodQuery}`} className="button primary">
              <Wallet size={16} />
              Open payroll
              <ArrowUpRight size={16} />
            </Link>
          </>
        }
      />
      <section className="metrics" aria-label="Payroll metrics">
        <div className="metric metric-featured">
          <div className="metric-label">
            Projected payroll
            <Wallet size={17} />
          </div>
          <strong data-testid="projected-total">{inr(data.netPay)}</strong>
          <span>
            {data.run?.status === 'ready_for_review'
              ? 'Calculated and ready for review'
              : 'Based on salaries + approved adjustments'}
          </span>
        </div>
        <div className="metric">
          <div className="metric-label">
            People in this payroll
            <Users size={17} />
          </div>
          <strong>
            {data.employeeCount}
            <small>people</small>
          </strong>
          <span>{data.contractorCount} active contractors in workspace</span>
        </div>
        <div className="metric">
          <div className="metric-label">
            Scheduled payday
            <CalendarDays size={17} />
          </div>
          <strong>
            {new Date(Date.UTC(year, month, 0)).getUTCDate()}
            <small>
              {new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
                month: 'short',
                timeZone: 'UTC',
              })}
            </small>
          </strong>
          <span>Last calendar day · {year}</span>
        </div>
        <div className="metric">
          <div className="metric-label">
            vs. previous month
            <TrendingUp size={17} />
          </div>
          <strong>
            {data.change === null ? '—' : `${data.change > 0 ? '+' : ''}${data.change}%`}
          </strong>
          <span>
            {data.previous
              ? `Compared with ${periodLabel(data.previous.month, data.previous.year)}`
              : 'No calculated previous payroll'}
          </span>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel payroll-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CURRENT PAYROLL</p>
              <h2>{period}</h2>
            </div>
            <Badge value={data.run?.status ?? 'not_started'} />
          </div>
          <div className="payroll-card-body">
            <div className="payroll-total">
              <span className="muted">Total take-home pay</span>
              <strong>{inr(data.netPay)}</strong>
              <span className="muted">
                For {data.employeeCount} people across {data.departments.length} departments
              </span>
            </div>
            <div className="calculation-list">
              <div>
                <span>Base salaries</span>
                <strong>{inr(data.totals.basePay)}</strong>
              </div>
              <div>
                <span>
                  <i className="legend-dot green" />
                  Bonuses
                </span>
                <strong>+{inr(data.totals.bonusTotal)}</strong>
              </div>
              <div>
                <span>
                  <i className="legend-dot teal" />
                  Reimbursements
                </span>
                <strong>+{inr(data.totals.reimbursementTotal)}</strong>
              </div>
              <div>
                <span>
                  <i className="legend-dot amber" />
                  Deductions
                </span>
                <strong>−{inr(data.totals.deductionTotal)}</strong>
              </div>
            </div>
          </div>
          <div className="card-footer">
            <span>
              <span className="check-circle">
                <Check size={12} />
              </span>
              {approved.length} approved adjustments included
            </span>
            <Link href={`/payroll${periodQuery}`} className="text-link">
              {data.run ? 'View payroll' : 'Create payroll'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="panel departments">
          <div className="panel-heading">
            <div>
              <h2>By department</h2>
              <p className="muted">Where your payroll goes</p>
            </div>
            <span className="subtle-icon">
              <Users size={19} />
            </span>
          </div>
          {data.departments.length === 0 ? (
            <Empty title="No people yet" description="Employee payroll will appear here." />
          ) : (
            <div className="department-list">
              {data.departments.map((d, i) => (
                <div className="department-row" key={d.name}>
                  <div>
                    <span>
                      <i className={`legend-dot dept-${i}`} />
                      {d.name}
                      <small>{d.count}</small>
                    </span>
                    <strong>{inr(d.netPay)}</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill dept-${i}`}
                      style={{ width: `${data.netPay ? (d.netPay / data.netPay) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p className="muted">A running record of your workspace</p>
            </div>
            <span className="live-label">
              <i /> Live · <Link href={`/activity${periodQuery}`}>View all</Link>
            </span>
          </div>
          <div className="activity-list">
            {data.activity.length ? (
              data.activity.map((event) => (
                <div className="activity-row" key={event._id}>
                  <span
                    className={`activity-icon ${event.entityType === 'payroll' ? 'green-bg' : ''}`}
                  >
                    {event.entityType === 'payroll' ? (
                      <Wallet size={16} />
                    ) : event.entityType === 'employee' ? (
                      <Users size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                  </span>
                  <div>
                    <p>{event.message}</p>
                    <small>
                      {humanize(event.action)} · {shortDate(event.createdAt)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <Empty title="A fresh start" description="Payroll activity will appear here." />
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>This month’s adjustments</h2>
              <p className="muted">The details behind the difference</p>
            </div>
            <Link
              href={`/adjustments${periodQuery}`}
              aria-label="View adjustments"
              className="icon-button"
            >
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="upcoming-list">
            {data.adjustments.slice(0, 4).map((a) => (
              <div key={a._id} className="upcoming-row">
                <span className="change-icon">
                  {a.status === 'pending' ? (
                    <Clock3 size={17} />
                  ) : a.type === 'bonus' ? (
                    <Sparkles size={17} />
                  ) : (
                    <Plus size={17} />
                  )}
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <small>
                    {a.employeeName} · {humanize(a.status)}
                  </small>
                </div>
                <b>
                  {a.type === 'deduction' ? '−' : '+'}
                  {inr(a.amount)}
                </b>
              </div>
            ))}
            {!data.adjustments.length && (
              <Empty
                title="No adjustments this month"
                description="Add a bonus, reimbursement, or deduction before calculating payroll."
              />
            )}
          </div>
          <div className="card-footer">
            <span>Only approved entries affect payroll</span>
            <Link className="text-link" href={`/adjustments${periodQuery}`}>
              View all
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
      <div className="trust-note">
        <span className="check-circle">
          <Check size={12} />
        </span>
        Calculated with care. Every rupee accounted for.
        <span>INR · Demo payroll · No payments initiated</span>
      </div>
    </>
  );
}
