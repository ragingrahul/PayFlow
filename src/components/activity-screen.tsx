'use client';
import { useQuery } from 'convex/react';
import { CheckCircle2, Clock3, FileText, SlidersHorizontal, UserRound } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { useWorkspace } from './shell';
import { Badge, Empty, Loading, PageHeader } from './ui';
import { shortDate } from '@/lib/format';

const icons = {
  payroll: FileText,
  adjustment: SlidersHorizontal,
  employee: UserRound,
  company: CheckCircle2,
};

export function ActivityScreen() {
  const { company } = useWorkspace();
  const events = useQuery(api.activity.list, { companyId: company._id });
  if (!events) return <Loading />;
  return (
    <>
      <PageHeader
        eyebrow="A COMPLETE PAPER TRAIL"
        title="What changed, and when."
        description="Payroll, adjustment, and compensation decisions recorded by PayFlow."
        actions={<span className="count-pill">{events.length} events</span>}
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Workspace activity</h2>
            <p className="muted">Newest events appear first</p>
          </div>
        </div>
        {events.length ? (
          <div className="activity-timeline">
            {events.map((event) => {
              const Icon = icons[event.entityType as keyof typeof icons] ?? Clock3;
              return (
                <article key={event._id} className="activity-row">
                  <span className="activity-icon">
                    <Icon size={17} />
                  </span>
                  <div>
                    <strong>{event.message}</strong>
                    <small>
                      {shortDate(event.createdAt)} · {event.entityType}
                    </small>
                  </div>
                  <Badge value={event.action} />
                </article>
              );
            })}
          </div>
        ) : (
          <Empty title="No activity yet" description="Completed actions will be recorded here." />
        )}
      </section>
    </>
  );
}
