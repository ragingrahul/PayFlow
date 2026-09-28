'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useConvexConnectionState } from 'convex/react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  SlidersHorizontal,
  FlaskConical,
  Sparkles,
  Settings,
  ArrowUpRight,
  Building2,
  PanelLeftClose,
  Menu,
  History,
  ReceiptText,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { Loading, Empty } from './ui';
const WorkspaceContext = createContext<{
  company: Doc<'companies'>;
  month: number;
  year: number;
  setPeriod: (month: number, year: number) => void;
} | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Workspace unavailable.');
  return value;
}
const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/people', label: 'People', icon: Users },
  { href: '/payroll', label: 'Payroll', icon: Wallet },
  { href: '/adjustments', label: 'Adjustments', icon: SlidersHorizontal },
  { href: '/activity', label: 'Activity', icon: History },
  { href: '/scenarios', label: 'Scenarios', icon: FlaskConical },
  { href: '/copilot', label: 'Copilot', icon: Sparkles },
  { href: '/portal', label: 'Employee portal', icon: ReceiptText },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const company = useQuery(api.workspace.current);
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const connection = useConvexConnectionState();
  const [open, setOpen] = useState(false);
  const requestedPeriod = searchParams.get('period') ?? '';
  const requestedYear = Number(requestedPeriod.slice(0, 4));
  const parsedPeriod =
    /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedPeriod) &&
    requestedYear >= 2000 &&
    requestedYear <= 2100
      ? requestedPeriod
      : '2026-09';
  const [year, month] = parsedPeriod.split('-').map(Number);
  const periodQuery = `?period=${parsedPeriod}`;
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  const title =
    nav.find((n) => (n.href === '/' ? path === '/' : path.startsWith(n.href)))?.label ?? 'Settings';
  const workspaceValue = company
    ? {
        company,
        month,
        year,
        setPeriod: (nextMonth: number, nextYear: number) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('period', `${nextYear}-${String(nextMonth).padStart(2, '0')}`);
          router.replace(`${path}?${params.toString()}`, { scroll: false });
        },
      }
    : null;
  if (path === '/welcome') return <div className="landing-shell">{children}</div>;
  if (path.startsWith('/portal') && workspaceValue)
    return (
      <WorkspaceContext.Provider value={workspaceValue}>
        <div className="portal-shell">
          <header className="portal-topbar no-print">
            <Link href="/portal" className="brand portal-brand">
              <span className="brand-mark">
                <span /> <span /> <span />
              </span>
              payflow<span className="brand-period">.</span>
            </Link>
            <span className="preview-pill">EMPLOYEE PREVIEW</span>
            <Link href={`/?period=${parsedPeriod}`} className="button compact">
              HR workspace <ArrowUpRight size={14} />
            </Link>
          </header>
          <main id="main" className="portal-main">
            {children}
          </main>
        </div>
      </WorkspaceContext.Provider>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <Link href={`/${periodQuery}`} className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <span /> <span /> <span />
          </span>
          payflow<span className="brand-period">.</span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-icon">
            <Building2 size={18} />
          </span>
          <div>
            <strong>{company?.name ?? 'Your workspace'}</strong>
            <small>Demo workspace</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={`${href}${periodQuery}`}
              onClick={() => setOpen(false)}
              aria-current={
                (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined
              }
              className="nav-item"
            >
              <Icon size={19} aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="copilot-note">
            <Sparkles size={19} aria-hidden />
            <h3>
              A little less admin.
              <br />A lot more clarity.
            </h3>
            <p>
              Your AI payroll copilot.
              <br />
              Live with human approval.
            </p>
            <Link href={`/copilot${periodQuery}`}>
              Open Copilot <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link
            href={`/settings${periodQuery}`}
            className="nav-item"
            aria-current={path === '/settings' ? 'page' : undefined}
          >
            <Settings size={19} />
            Settings
          </Link>
          <div className="profile">
            <span className="avatar">HR</span>
            <div>
              <strong>Workspace admin</strong>
              <small>Demo session · no auth</small>
            </div>
            <PanelLeftClose size={16} aria-hidden />
          </div>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Close navigation"
          className="nav-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(!open)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className={`connection ${connection.isWebSocketConnected ? 'connected' : ''}`}>
              <i />
              {connection.isWebSocketConnected ? 'Live updates' : 'Connecting…'}
            </span>
            <span className="demo-pill">DEMO</span>
            <span className="avatar avatar-small">HR</span>
          </div>
        </header>
        <main id="main" className="main-content">
          {company === undefined ? (
            <Loading />
          ) : company === null ? (
            <Empty
              title="Your workspace starts here"
              description="Load the Acme Studio demo company with 24 people, payroll history, and September adjustments."
            >
              <code>npm run seed</code>
              <p className="muted">
                Run this in the project terminal with Convex running. This screen updates
                automatically.
              </p>
            </Empty>
          ) : (
            <WorkspaceContext.Provider value={workspaceValue!}>
              {children}
            </WorkspaceContext.Provider>
          )}
        </main>
        <footer className="app-footer">
          <span>Payroll that thinks before you pay.</span>
          <span>PayFlow · Human-approved AI</span>
        </footer>
      </div>
    </div>
  );
}
export function PeriodPicker() {
  const { month, year, setPeriod } = useWorkspace();
  return (
    <label className="period-picker">
      <span className="sr-only">Payroll period</span>
      <input
        aria-label="Payroll period"
        type="month"
        min="2000-01"
        max="2100-12"
        value={`${year}-${String(month).padStart(2, '0')}`}
        onInput={(e) => {
          if (e.currentTarget.value) {
            const [y, m] = e.currentTarget.value.split('-').map(Number);
            if (y >= 2000 && y <= 2100) setPeriod(m, y);
          }
        }}
      />
    </label>
  );
}
