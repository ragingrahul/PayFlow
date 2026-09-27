'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { AdjustmentType } from '@/lib/payroll';
import { humanize, inr, periodLabel, shortDate } from '@/lib/format';
import { PeriodPicker, useWorkspace } from './shell';
import { ErrorMessage, Modal, PageHeader, messageOf } from './ui';

type ProviderStatus = {
  provider: 'openai' | 'inkeep';
  configured: boolean;
  missing: string[];
  model: string | null;
};

type ProviderProposal = {
  employeeId: string;
  employeeName: string;
  adjustmentType: AdjustmentType;
  amount: number;
  title: string;
  rationale: string;
};

const examples = [
  'Why is this payroll different from the previous month?',
  'Show approved bonuses above ₹20,000.',
  'Give Ananya a ₹20,000 performance bonus this month.',
];

function providerLabel(value: 'openai' | 'inkeep') {
  return value === 'openai' ? 'OpenAI' : 'Inkeep';
}

export function CopilotScreen() {
  const { company, month, year } = useWorkspace();
  const threads = useQuery(api.copilot.threads, { companyId: company._id, month, year });
  const recordTurn = useMutation(api.copilot.recordTurn);
  const confirmProposal = useMutation(api.copilot.confirmProposal);
  const rejectProposal = useMutation(api.copilot.rejectProposal);
  const [selectedId, setSelectedId] = useState<Id<'copilotThreads'> | null>(null);
  const [newChat, setNewChat] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [rejecting, setRejecting] = useState<Id<'copilotProposals'> | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const activeId = useMemo(
    () =>
      newChat
        ? null
        : ((selectedId && threads?.some((thread) => thread._id === selectedId)
            ? selectedId
            : threads?.[0]?._id) ?? null),
    [newChat, selectedId, threads],
  );
  const conversation = useQuery(
    api.copilot.conversation,
    activeId ? { companyId: company._id, threadId: activeId } : 'skip',
  );

  useEffect(() => {
    let current = true;
    fetch('/api/copilot')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not read Copilot configuration.');
        return (await response.json()) as ProviderStatus;
      })
      .then((status) => {
        if (current) setProviderStatus(status);
      })
      .catch((cause) => {
        if (current) setError(messageOf(cause));
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [conversation?.messages.length, pendingText, sending]);

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || sending || !providerStatus?.configured) return;
    setSending(true);
    setPendingText(message);
    setInput('');
    setError(null);
    setSuccess('');
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company._id,
          month,
          year,
          message,
          ...(activeId ? { threadId: activeId } : {}),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        provider?: 'openai' | 'inkeep';
        assistantText?: string;
        proposal?: ProviderProposal;
      };
      if (!response.ok || !result.provider || !result.assistantText)
        throw new Error(result.error || 'Copilot returned an invalid response.');
      const saved = await recordTurn({
        companyId: company._id,
        month,
        year,
        ...(activeId ? { threadId: activeId } : {}),
        provider: result.provider,
        userText: message,
        assistantText: result.assistantText,
        ...(result.proposal
          ? {
              proposal: {
                employeeId: result.proposal.employeeId as Id<'employees'>,
                adjustmentType: result.proposal.adjustmentType,
                amount: result.proposal.amount,
                title: result.proposal.title,
                rationale: result.proposal.rationale,
              },
            }
          : {}),
      });
      setSelectedId(saved.threadId);
      setNewChat(false);
    } catch (cause) {
      setInput(message);
      setError(messageOf(cause));
    } finally {
      setPendingText('');
      setSending(false);
    }
  }

  async function confirm(id: Id<'copilotProposals'>) {
    setDecisionBusy(true);
    setError(null);
    try {
      await confirmProposal({ companyId: company._id, proposalId: id });
      setSuccess(
        'Proposal confirmed and submitted as pending. Review it in Adjustments before payroll changes.',
      );
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setDecisionBusy(false);
    }
  }

  async function reject() {
    if (!rejecting) return;
    setDecisionBusy(true);
    setError(null);
    try {
      await rejectProposal({
        companyId: company._id,
        proposalId: rejecting,
        reason: rejectionReason,
      });
      setRejecting(null);
      setRejectionReason('');
      setSuccess('Proposal rejected. Tell Copilot what you want changed in your next message.');
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setDecisionBusy(false);
    }
  }

  const proposals = new Map(conversation?.proposals.map((item) => [item._id, item]) ?? []);

  return (
    <>
      <PageHeader
        eyebrow="AI WITH A HUMAN CHECKPOINT"
        title="Ask. Review. Then act."
        description="Explore live payroll data and prepare changes without giving AI direct write access."
        actions={<PeriodPicker />}
      />
      {providerStatus && !providerStatus.configured && (
        <div className="notice warning-notice copilot-config" role="status">
          <CircleAlert size={20} />
          <div>
            <strong>{providerLabel(providerStatus.provider)} setup required</strong>
            <p>
              Add {providerStatus.missing.join(', ')} to <code>.env.local</code>, then restart
              Next.js. No AI response is simulated while configuration is missing.
            </p>
          </div>
        </div>
      )}
      {success && (
        <p className="success-message" role="status">
          {success}
        </p>
      )}
      <ErrorMessage message={error} />
      <div className="copilot-layout">
        <aside className="panel copilot-threads">
          <div className="panel-heading">
            <div>
              <h2>{periodLabel(month, year)}</h2>
              <p className="muted">Conversations</p>
            </div>
            <button
              className="icon-button"
              aria-label="Start a new conversation"
              onClick={() => {
                setSelectedId(null);
                setNewChat(true);
                setError(null);
                setSuccess('');
              }}
            >
              <Plus size={18} />
            </button>
          </div>
          {threads?.length ? (
            threads.map((thread) => (
              <button
                key={thread._id}
                className={`copilot-thread ${thread._id === activeId ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedId(thread._id);
                  setNewChat(false);
                }}
              >
                <span>{thread.title}</span>
                <small>
                  {providerLabel(thread.provider)} · {shortDate(thread.updatedAt)}
                </small>
              </button>
            ))
          ) : (
            <p className="muted thread-empty">Your conversations will appear here.</p>
          )}
        </aside>
        <section className="panel copilot-chat" aria-label="Copilot conversation">
          <div className="copilot-chat-heading">
            <div className="copilot-identity">
              <span className="copilot-avatar">
                <Sparkles size={19} />
              </span>
              <div>
                <strong>PayFlow Copilot</strong>
                <small>
                  {providerStatus
                    ? `${providerLabel(providerStatus.provider)} · ${providerStatus.model ?? 'agent'}`
                    : 'Checking provider…'}
                </small>
              </div>
            </div>
            <span className="safe-pill">
              <ShieldCheck size={14} /> Human approval on
            </span>
          </div>
          <div className="copilot-transcript" aria-live="polite">
            {!conversation?.messages.length && !pendingText ? (
              <div className="copilot-welcome">
                <span className="future-icon">
                  <Bot size={30} />
                </span>
                <h2>What should we look at?</h2>
                <p className="muted">
                  Ask about this payroll period or prepare an adjustment for review.
                </p>
                <div className="prompt-grid">
                  {examples.map((example) => (
                    <button key={example} onClick={() => setInput(example)}>
                      <span>{example}</span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation?.messages.map((message) => {
                const proposal = message.proposalId ? proposals.get(message.proposalId) : undefined;
                return (
                  <div key={message._id} className={`chat-row ${message.role}`}>
                    <span className="chat-avatar">
                      {message.role === 'assistant' ? (
                        <Sparkles size={15} />
                      ) : (
                        <UserRound size={15} />
                      )}
                    </span>
                    <div className="chat-content">
                      <p>{message.content}</p>
                      {proposal && message.kind === 'proposal' && (
                        <ProposalCard
                          proposal={proposal}
                          busy={decisionBusy}
                          onConfirm={() => confirm(proposal._id)}
                          onReject={() => {
                            setRejecting(proposal._id);
                            setRejectionReason('');
                            setError(null);
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {pendingText && (
              <>
                <div className="chat-row user pending-message">
                  <span className="chat-avatar">
                    <UserRound size={15} />
                  </span>
                  <div className="chat-content">
                    <p>{pendingText}</p>
                  </div>
                </div>
                <div className="chat-row assistant pending-message">
                  <span className="chat-avatar">
                    <Sparkles size={15} />
                  </span>
                  <div className="typing-dots" aria-label="Copilot is working">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </>
            )}
            <div ref={transcriptEnd} />
          </div>
          <form
            className="copilot-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <label className="sr-only" htmlFor="copilot-message">
              Message PayFlow Copilot
            </label>
            <textarea
              id="copilot-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder="Ask about payroll or describe an adjustment…"
              rows={2}
              maxLength={2_000}
              disabled={sending || !providerStatus?.configured}
            />
            <button
              className="button primary composer-send"
              type="submit"
              aria-label="Send message"
              disabled={sending || !input.trim() || !providerStatus?.configured}
            >
              <Send size={17} />
            </button>
            <p>
              Copilot can propose changes. Only your confirmation can submit one for normal
              approval.
            </p>
          </form>
        </section>
      </div>
      {rejecting && (
        <Modal
          title="Reject and correct this proposal"
          onClose={() => {
            if (!decisionBusy) setRejecting(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void reject();
            }}
          >
            <label className="field-label" htmlFor="rejection-reason">
              What should Copilot change?
            </label>
            <textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              minLength={3}
              maxLength={500}
              required
              placeholder="Use ₹15,000 instead, and call it a customer launch bonus."
            />
            <div className="notice inline-notice">
              <ShieldCheck size={19} />
              <p>Your correction becomes conversation context for the next request.</p>
            </div>
            <ErrorMessage message={error} />
            <div className="modal-actions">
              <button className="button" type="button" onClick={() => setRejecting(null)}>
                Keep proposal
              </button>
              <button
                className="button danger"
                type="submit"
                disabled={decisionBusy || rejectionReason.trim().length < 3}
              >
                <X size={16} /> {decisionBusy ? 'Rejecting…' : 'Reject proposal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function ProposalCard({
  proposal,
  busy,
  onConfirm,
  onReject,
}: {
  proposal: {
    _id: Id<'copilotProposals'>;
    status: 'pending' | 'applied' | 'rejected';
    employeeName: string;
    adjustmentType: AdjustmentType;
    amount: number;
    title: string;
    rationale: string;
    month: number;
    year: number;
    baselineNetPay: number;
    projectedNetPay: number;
    rejectionReason?: string;
  };
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const change = proposal.projectedNetPay - proposal.baselineNetPay;
  return (
    <article className="proposal-card">
      <div className="proposal-heading">
        <div>
          <span className="eyebrow">STRUCTURED PROPOSAL</span>
          <h3>{proposal.title}</h3>
        </div>
        <span className={`proposal-status ${proposal.status}`}>{humanize(proposal.status)}</span>
      </div>
      <dl className="proposal-details">
        <div>
          <dt>Employee</dt>
          <dd>{proposal.employeeName}</dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>
            {humanize(proposal.adjustmentType)} · {inr(proposal.amount)}
          </dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>{periodLabel(proposal.month, proposal.year)}</dd>
        </div>
        <div>
          <dt>If approved later</dt>
          <dd className={change < 0 ? 'negative' : 'positive'}>
            {change < 0 ? '−' : '+'}
            {inr(Math.abs(change))}
          </dd>
        </div>
      </dl>
      <p className="proposal-rationale">{proposal.rationale}</p>
      <div className="proposal-total">
        <span>
          Current payroll<strong>{inr(proposal.baselineNetPay)}</strong>
        </span>
        <ArrowRight size={17} />
        <span>
          Projected after approval<strong>{inr(proposal.projectedNetPay)}</strong>
        </span>
      </div>
      {proposal.status === 'pending' && (
        <div className="proposal-actions">
          <button className="button" disabled={busy} onClick={onReject}>
            <X size={16} /> Reject / correct
          </button>
          <button className="button primary" disabled={busy} onClick={onConfirm}>
            <Check size={16} /> {busy ? 'Confirming…' : 'Confirm proposal'}
          </button>
        </div>
      )}
      {proposal.status === 'applied' && (
        <div className="proposal-result success-result">
          <Check size={17} />
          <p>
            Submitted as pending.{' '}
            <Link
              href={`/adjustments?period=${proposal.year}-${String(proposal.month).padStart(2, '0')}`}
            >
              Open Adjustments
            </Link>{' '}
            to review it.
          </p>
        </div>
      )}
      {proposal.status === 'rejected' && (
        <div className="proposal-result rejected-result">
          <X size={17} />
          <p>Rejected: {proposal.rejectionReason}</p>
        </div>
      )}
    </article>
  );
}
