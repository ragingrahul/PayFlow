'use client';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ArrowRight, FlaskConical, Plus, ShieldCheck, Trash2, TrendingUp } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { parsePercentage } from '@/lib/payroll';
import { inr, percentage, periodLabel } from '@/lib/format';
import { PeriodPicker, useWorkspace } from './shell';
import { Avatar, Empty, ErrorMessage, Loading, Modal, PageHeader, messageOf } from './ui';

type TargetType = 'employee' | 'department';

export function ScenariosScreen() {
  const { company, month, year } = useWorkspace();
  const scenarios = useQuery(api.scenarios.list, { companyId: company._id, month, year });
  const people = useQuery(api.employees.list, { companyId: company._id, month, year });
  const create = useMutation(api.scenarios.create);
  const discard = useMutation(api.scenarios.discard);
  const [creating, setCreating] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<'scenarios'> | null>(null);
  const [targetType, setTargetType] = useState<TargetType>('employee');
  const [target, setTarget] = useState('');
  const [raise, setRaise] = useState('8');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const eligible = (people ?? []).filter(
    (person) => person.status === 'active' && person.joiningDate <= lastDay,
  );
  const departments = [...new Set(eligible.map((person) => person.department))].sort();
  let raiseBasisPoints: number | null = null;
  try {
    raiseBasisPoints = parsePercentage(raise);
  } catch {
    raiseBasisPoints = null;
  }
  const previewArgs =
    creating && target && raiseBasisPoints
      ? targetType === 'employee'
        ? {
            companyId: company._id,
            month,
            year,
            targetType,
            employeeId: target as Id<'employees'>,
            raiseBasisPoints,
          }
        : {
            companyId: company._id,
            month,
            year,
            targetType,
            department: target,
            raiseBasisPoints,
          }
      : 'skip';
  const preview = useQuery(api.scenarios.preview, previewArgs);
  if (!scenarios || !people) return <Loading />;
  const activeId =
    (selectedId && scenarios.some((scenario) => scenario._id === selectedId)
      ? selectedId
      : scenarios[0]?._id) ?? null;

  function startScenario() {
    setError(null);
    setSuccess('');
    setTargetType('employee');
    setTarget(eligible[0]?._id ?? '');
    setRaise('8');
    setName('');
    setCreating(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="DECIDE BEFORE YOU CHANGE"
        title="Explore the what-ifs."
        description="Model a raise, see its payroll impact, and save the result without changing real compensation."
        actions={
          <>
            <PeriodPicker />
            <button className="button primary" disabled={!eligible.length} onClick={startScenario}>
              <Plus size={17} /> New scenario
            </button>
          </>
        }
      />
      {success && (
        <p className="success-message" role="status">
          {success}
        </p>
      )}
      <div className="scenario-layout">
        <aside className="panel scenario-list">
          <div className="panel-heading">
            <div>
              <h2>{periodLabel(month, year)}</h2>
              <p className="muted">Saved scenarios</p>
            </div>
            <span className="count-pill">{scenarios.length}</span>
          </div>
          {scenarios.length ? (
            scenarios.map((scenario) => (
              <button
                key={scenario._id}
                className={`scenario-option ${scenario._id === activeId ? 'selected' : ''}`}
                onClick={() => setSelectedId(scenario._id)}
              >
                <span>
                  <strong>{scenario.name}</strong>
                  <small>
                    {scenario.subjectLabel} · {percentage(scenario.raiseBasisPoints)} raise
                  </small>
                </span>
                <b>+{inr(scenario.netPayChange)}</b>
              </button>
            ))
          ) : (
            <Empty
              title="No saved scenarios"
              description="Create a what-if plan for this payroll period."
            />
          )}
        </aside>
        <div className="scenario-main">
          {activeId ? (
            <ScenarioDetail scenarioId={activeId} onDiscard={() => setDiscarding(true)} />
          ) : (
            <section className="panel scenario-welcome">
              <span className="future-icon">
                <FlaskConical size={30} />
              </span>
              <h2>Model a decision safely.</h2>
              <p className="muted">
                Choose one employee or a whole department, enter a raise percentage, and compare the
                monthly and annual impact.
              </p>
              <div className="notice">
                <ShieldCheck size={20} />
                <p>A scenario is a saved snapshot. It cannot update salaries or payroll.</p>
              </div>
              <button
                className="button primary"
                disabled={!eligible.length}
                onClick={startScenario}
              >
                <Plus size={17} /> Create first scenario
              </button>
            </section>
          )}
        </div>
      </div>
      {creating && (
        <Modal
          title="Create a raise scenario"
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!raiseBasisPoints || !target) return;
              setBusy(true);
              setError(null);
              try {
                const scenarioId = await create({
                  companyId: company._id,
                  name,
                  month,
                  year,
                  targetType,
                  raiseBasisPoints,
                  ...(targetType === 'employee'
                    ? { employeeId: target as Id<'employees'> }
                    : { department: target }),
                });
                setSelectedId(scenarioId);
                setCreating(false);
                setSuccess('Scenario saved. Real payroll data was not changed.');
              } catch (cause) {
                setError(messageOf(cause));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="scenario-form-grid">
              <label>
                Scenario name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={3}
                  maxLength={100}
                  required
                  placeholder="Engineering market adjustment"
                />
              </label>
              <label>
                Raise for
                <select
                  value={targetType}
                  onChange={(event) => {
                    const next = event.target.value as TargetType;
                    setTargetType(next);
                    setTarget(
                      next === 'employee' ? (eligible[0]?._id ?? '') : (departments[0] ?? ''),
                    );
                  }}
                >
                  <option value="employee">One employee</option>
                  <option value="department">A department</option>
                </select>
              </label>
              <label>
                {targetType === 'employee' ? 'Employee' : 'Department'}
                <select value={target} onChange={(event) => setTarget(event.target.value)} required>
                  {targetType === 'employee'
                    ? eligible.map((person) => (
                        <option key={person._id} value={person._id}>
                          {person.firstName} {person.lastName}
                        </option>
                      ))
                    : departments.map((department) => (
                        <option key={department}>{department}</option>
                      ))}
                </select>
              </label>
              <label>
                Raise percentage
                <input
                  value={raise}
                  onChange={(event) => setRaise(event.target.value)}
                  inputMode="decimal"
                  pattern="[0-9]+(\.[0-9]{1,2})?"
                  required
                  aria-describedby="raise-help"
                />
                <small id="raise-help">0.01% to 100%, up to two decimal places.</small>
              </label>
            </div>
            <div className="scenario-preview" aria-live="polite">
              {!raiseBasisPoints ? (
                <p className="muted">Enter a valid raise percentage to calculate the impact.</p>
              ) : preview === undefined ? (
                <p className="muted">Calculating impact…</p>
              ) : (
                <>
                  <div className="preview-heading">
                    <span>
                      <TrendingUp size={18} /> Live impact preview
                    </span>
                    <strong>
                      {preview.affectedEmployeeCount}{' '}
                      {preview.affectedEmployeeCount === 1 ? 'person' : 'people'}
                    </strong>
                  </div>
                  <div className="preview-metrics">
                    <div>
                      <span>Current payroll</span>
                      <strong>{inr(preview.baselineNetPay)}</strong>
                    </div>
                    <ArrowRight size={18} />
                    <div>
                      <span>Projected payroll</span>
                      <strong>{inr(preview.projectedNetPay)}</strong>
                    </div>
                  </div>
                  <div className="impact-total">
                    <span>Monthly increase</span>
                    <strong>+{inr(preview.netPayChange)}</strong>
                  </div>
                  <div className="impact-total">
                    <span>Annualized increase</span>
                    <strong>+{inr(preview.annualNetPayChange)}</strong>
                  </div>
                </>
              )}
            </div>
            <div className="notice">
              <ShieldCheck size={20} />
              <p>
                Saving stores this preview only. It will not create salary revisions or alter
                payroll.
              </p>
            </div>
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={busy || !preview || !raiseBasisPoints}
              >
                {busy ? 'Saving…' : 'Save scenario'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {discarding && activeId && (
        <Modal
          title="Discard this scenario?"
          onClose={() => {
            if (!busy) setDiscarding(false);
          }}
        >
          <div className="notice">
            <ShieldCheck size={20} />
            <p>
              This removes only the saved scenario snapshot. Salaries and payroll remain unchanged.
            </p>
          </div>
          <ErrorMessage message={error} />
          <div className="modal-actions">
            <button className="button" disabled={busy} onClick={() => setDiscarding(false)}>
              Keep scenario
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await discard({ companyId: company._id, scenarioId: activeId });
                  setSelectedId(null);
                  setDiscarding(false);
                  setSuccess('Scenario discarded. No payroll data changed.');
                } catch (cause) {
                  setError(messageOf(cause));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 size={16} /> {busy ? 'Discarding…' : 'Discard scenario'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ScenarioDetail({
  scenarioId,
  onDiscard,
}: {
  scenarioId: Id<'scenarios'>;
  onDiscard: () => void;
}) {
  const { company } = useWorkspace();
  const data = useQuery(api.scenarios.detail, { companyId: company._id, scenarioId });
  if (!data) return <Loading />;
  const { scenario, items } = data;
  return (
    <>
      <section className="panel scenario-summary">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SAVED WHAT-IF</p>
            <h2>{scenario.name}</h2>
            <p className="muted">
              {scenario.subjectLabel} · {percentage(scenario.raiseBasisPoints)} raise ·{' '}
              {scenario.affectedEmployeeCount} affected
            </p>
          </div>
          <button className="button" onClick={onDiscard}>
            <Trash2 size={16} /> Discard
          </button>
        </div>
        <div className="scenario-hero">
          <div>
            <span>Projected monthly payroll</span>
            <strong>{inr(scenario.projectedNetPay)}</strong>
            <small>Current baseline {inr(scenario.baselineNetPay)}</small>
          </div>
          <div className="scenario-impact">
            <span>
              Monthly impact<strong>+{inr(scenario.netPayChange)}</strong>
            </span>
            <span>
              Annualized impact<strong>+{inr(scenario.annualNetPayChange)}</strong>
            </span>
          </div>
        </div>
        <div className="notice inline-notice">
          <ShieldCheck size={19} />
          <p>Snapshot only. This scenario has not changed compensation or payroll.</p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Affected people</h2>
            <p className="muted">Base pay and take-home impact for this scenario</p>
          </div>
          <span className="count-pill">{items.length}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th className="numeric">Current base</th>
                <th className="numeric">Projected base</th>
                <th className="numeric">Monthly impact</th>
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
                  <td className="numeric">{inr(item.baselineBasePay)}</td>
                  <td className="numeric">{inr(item.projectedBasePay)}</td>
                  <td className="numeric bold">+{inr(item.netPayChange)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
