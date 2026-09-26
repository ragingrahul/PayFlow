'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import {
  Search,
  ArrowUpRight,
  ArrowLeft,
  Mail,
  Briefcase,
  CalendarDays,
  Wallet,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { useWorkspace } from './shell';
import { Avatar, Badge, PageHeader, Loading, Empty } from './ui';
import { inr, shortDate, humanize, periodLabel } from '@/lib/format';
export function PeopleScreen() {
  const { company } = useWorkspace();
  const people = useQuery(api.employees.list, { companyId: company._id });
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  if (!people) return <Loading />;
  const filtered = people.filter(
    (e) =>
      (department === 'all' || e.department === department) &&
      `${e.firstName} ${e.lastName} ${e.email} ${e.employeeCode}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="THE PEOPLE BEHIND THE PAYROLL"
        title="Your team."
        description="One place for your people and their compensation."
        actions={<span className="count-pill">{people.length} team members</span>}
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
                      <Link className="person-cell" href={`/people/${e._id}`}>
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
                    <td className="numeric">{inr(e.baseMonthlySalary)}</td>
                    <td>
                      <Badge value={e.status} />
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        href={`/people/${e._id}`}
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
    </>
  );
}
export function EmployeeScreen({ employeeId }: { employeeId: string }) {
  const { company } = useWorkspace();
  const data = useQuery(api.employees.detail, { companyId: company._id, employeeId });
  if (data === undefined) return <Loading />;
  if (!data)
    return (
      <Empty
        title="Employee not found"
        description="This employee may not exist in your workspace."
      >
        <Link href="/people" className="button">
          Back to people
        </Link>
      </Empty>
    );
  const { employee: e, history, adjustments } = data;
  return (
    <>
      <Link className="back-link" href="/people">
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
        <Badge value={e.status} />
      </section>
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Employee details</h2>
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
            <div>
              <dt>
                <Wallet size={16} />
                Monthly base
              </dt>
              <dd className="large-money">{inr(e.baseMonthlySalary)}</dd>
            </div>
          </dl>
          <p className="panel-note">
            Agreed monthly compensation. Tax and proration are outside this demo’s scope.
          </p>
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
    </>
  );
}
