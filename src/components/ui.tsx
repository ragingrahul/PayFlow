'use client';
import { useRef, useEffect } from 'react';
import { X, ArrowUpRight, Inbox } from 'lucide-react';
import { humanize } from '@/lib/format';
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value}`}>
      <span className="badge-dot" />
      {humanize(value)}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="loading">
      <div className="skeleton heading-skeleton" />
      <div className="metrics">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton metric-skeleton" />
        ))}
      </div>
      <div className="skeleton table-skeleton" />
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={28} aria-hidden />
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {children}
    </div>
  );
}
export function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="error-message">
      {message}
    </p>
  ) : null;
}
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span className={`avatar ${large ? 'avatar-large' : ''}`} aria-hidden>
      {name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="modal"
      aria-labelledby="dialog-title"
    >
      <div className="modal-heading">
        <h2 id="dialog-title">{title}</h2>
        <button onClick={onClose} className="icon-button" aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ExternalArrow() {
  return <ArrowUpRight size={16} aria-hidden />;
}
export function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message.replace(/^.*Uncaught Error: /s, '').split('\n')[0]
    : 'Something went wrong. Please try again.';
}
