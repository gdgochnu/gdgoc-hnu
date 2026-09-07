import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { canUserApproveCurrentStep } from '@/lib/approvals/approval-engine';
import { ApprovalStageTracker, ApprovalStepItem, ApprovalInstanceData } from '@/components/approvals/ApprovalStageTracker';
import { Event, EventStatus, UserRole } from '@/types';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Building2, 
  CheckSquare, 
  HelpCircle, 
  ArrowLeft, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink,
  Sparkles,
  QrCode,
  FileText,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { EventReviewBanner } from '@/components/events/EventReviewBanner';

export const dynamic = 'force-dynamic';

interface EventReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventReviewPage({ params }: EventReviewPageProps) {
  const { id } = await params;
  const context = await getUserContext();
  const admin = createAdminClient();

  if (!context.user || !context.profile || context.profile.status !== 'active') {
    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }} suppressHydrationWarning>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }}>
            <ShieldAlert size={32} color="var(--google-red)" style={{ margin: '0 auto 1.5rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Authentication Required</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              You must be signed in with an active chapter account to view this review page.
            </p>
            <Link href="/auth/login" className="btn-primary">Sign In</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 1. Fetch Event with host committee details
  const { data: eventData, error: eventErr } = await admin
    .from('events')
    .select('*, department:departments(id, name, code, branch)')
    .eq('id', id)
    .maybeSingle();

  if (eventErr || !eventData) {
    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }} suppressHydrationWarning>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }}>
            <ShieldAlert size={32} color="var(--google-red)" style={{ margin: '0 auto 1.5rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Event Not Found</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              The requested event does not exist or has been removed.
            </p>
            <Link href="/events" className="btn-primary">Return to Events</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const event: Event = {
    ...eventData,
    registration_fields: Array.isArray(eventData.registration_fields) ? eventData.registration_fields : [],
    owners: Array.isArray(eventData.owners) ? eventData.owners : [],
    checkin_access_profile_ids: Array.isArray(eventData.checkin_access_profile_ids) ? eventData.checkin_access_profile_ids : [],
  };

  // 2. Authorization check
  const userId = context.user.id;
  const userRole = context.profile.role as UserRole;
  const isPresidential = ['president', 'co_president'].includes(userRole);
  const isBranchHead = userRole === 'branch_head';
  const isDeptHead = context.profile.department_id === event.department_id && ['committee_head', 'committee_co_head'].includes(userRole);
  const isCreator = event.created_by === userId;
  const isOwner = event.owners.some((o: any) => o.profile_id === userId);

  const canView = isPresidential || isBranchHead || isDeptHead || isCreator || isOwner;
  if (!canView) {
    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }} suppressHydrationWarning>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }}>
            <ShieldAlert size={32} color="var(--google-red)" style={{ margin: '0 auto 1.5rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Access Restricted</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              This review page is strictly restricted to event organizers, committee leadership, and executive approvers.
            </p>
            <Link href={`/events/${event.id}`} className="btn-primary">Return to Event</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 3. Fetch Approval Instance and Steps if submitted
  let approvalInstance: ApprovalInstanceData | null = null;
  let approvalSteps: ApprovalStepItem[] = [];
  let canUserApprove = false;

  if (event.approval_instance_id) {
    const { data: instData } = await admin
      .from('approval_instances')
      .select('*')
      .eq('id', event.approval_instance_id)
      .maybeSingle();

    if (instData) {
      approvalInstance = instData as ApprovalInstanceData;

      const { data: stepsData } = await admin
        .from('approval_instance_steps')
        .select(`
          id,
          step_order,
          approver_rule,
          status,
          notes,
          acted_at,
          resolved_approver_id,
          resolved_approver:resolved_approver_id (
            full_name,
            avatar_url,
            role,
            position
          )
        `)
        .eq('instance_id', instData.id)
        .order('step_order');

      approvalSteps = (stepsData as any[]) || [];

      // Check if current user is authorized to act on active step
      const activeStep = approvalSteps.find((s) => s.step_order === instData.current_step);
      if (activeStep && instData.status === 'in_progress') {
        canUserApprove = canUserApproveCurrentStep({
          userRole,
          userId: context.user.id,
          stepRule: activeStep.approver_rule,
        });
      }
    }
  }

  // 4. Fetch linked tasks summary
  const { data: tasks } = await admin
    .from('tasks')
    .select('id, title, status, priority')
    .eq('event_id', event.id);

  const linkedTasks = tasks || [];
  const completedTasksCount = linkedTasks.filter((t) => t.status === 'done').length;

  // 5. Fetch Check-in team names
  let checkinMembers: any[] = [];
  if (event.checkin_access_profile_ids && event.checkin_access_profile_ids.length > 0) {
    const { data: cProfiles } = await admin
      .from('profiles')
      .select('id, full_name, full_name_en, role')
      .in('id', event.checkin_access_profile_ids);
    checkinMembers = cProfiles || [];
  }

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1240px', margin: '0 auto' }} suppressHydrationWarning>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Breadcrumbs & Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link
                href={`/events/${event.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <ArrowLeft size={16} />
                <span>Back to Event Control Center</span>
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                href="/approvals"
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
              >
                <span>Approvals Inbox</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>

          {/* Header Title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{
                  background: 'rgba(66, 133, 244, 0.15)',
                  color: 'var(--google-blue)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  Executive Review & Approval Screen
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>• Spec §4.3 item 2</span>
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                {event.title}
              </h1>
            </div>

            {/* Quick Status Tag */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'capitalize',
                color: event.status === 'approved' ? 'var(--google-green)' : 'var(--google-blue)',
              }}>
                {event.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Review Banner with Actions */}
          <EventReviewBanner event={event} canManage={canView} approvalInstance={approvalInstance} />

          {/* Main Grid: Left = Event Details, Right = Approval Stage Tracker */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: '2rem',
          }}>
            
            {/* Left Column: Event Proposal Overview & Readiness */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* Event Core Information Card */}
              <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <FileText size={18} color="var(--google-blue)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Event Proposal Details</h3>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  padding: '1.2rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.5rem',
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>HOST COMMITTEE</span>
                    <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                      <Building2 size={14} color="var(--google-yellow)" />
                      {event.department?.name || 'General Chapter'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>TARGET DATE</span>
                    <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                      <Calendar size={14} color="var(--google-blue)" />
                      {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>TIME WINDOW</span>
                    <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                      <Clock size={14} color="var(--google-green)" />
                      {event.start_time ? event.start_time.slice(0, 5) : 'TBD'}
                      {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>VENUE / STREAM</span>
                    <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                      <MapPin size={14} color="var(--google-red)" />
                      {event.venue || 'To Be Announced'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>EXPECTED CAPACITY</span>
                    <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                      <Users size={14} color="#A855F7" />
                      {event.capacity ? `${event.capacity} Attendees` : 'Unlimited'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>PUBLIC SLUG</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px', display: 'block' }}>
                      /events/{event.slug}
                    </span>
                  </div>
                </div>

                {event.description && (
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                      Event Overview & Agenda
                    </span>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.92rem', margin: 0 }}>
                      {event.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Event Readiness & Team Cards */}
              <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <ShieldCheck size={18} color="var(--google-green)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Operational Readiness</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Linked Tasks Widget */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <CheckSquare size={16} color="var(--google-blue)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Preparation Tasks</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {completedTasksCount} / {linkedTasks.length} Done
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', margin: '0.2rem 0 0' }}>
                      {linkedTasks.length === 0 ? 'No tasks attached' : 'Tasks linked with tasks.event_id'}
                    </p>
                  </div>

                  {/* Check-in Team Widget */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <QrCode size={16} color="var(--google-green)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Check-in Team</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {checkinMembers.length} Assigned
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', margin: '0.2rem 0 0' }}>
                      {checkinMembers.length === 0 ? 'No individual check-in duty' : 'Assigned QR scanner rights'}
                    </p>
                  </div>
                </div>

                {/* Event Leads / Owners List */}
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                    Assigned Event Leads ({event.owners.length})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    {event.owners.map((owner: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{owner.full_name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>({owner.committee_role})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Registration Fields Preview */}
              <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <HelpCircle size={18} color="#A855F7" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registration Form Preview</h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    ({event.registration_fields.length} Custom Fields)
                  </span>
                </div>

                {event.registration_fields.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Standard registration form only (Full Name, Email, Phone, University).
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {event.registration_fields.map((field, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#FFFFFF' }}>
                            {field.label}
                          </div>
                          {field.placeholder && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Placeholder: "{field.placeholder}"
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                          }}>
                            {field.field_type}
                          </span>
                          {field.required && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: 'rgba(234, 67, 53, 0.15)',
                              color: '#F87171',
                            }}>
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Approval Stage Tracker Engine */}
            <div>
              {approvalInstance && approvalSteps.length > 0 ? (
                <div style={{ position: 'sticky', top: '2rem' }}>
                  <ApprovalStageTracker
                    instance={approvalInstance}
                    steps={approvalSteps}
                    canUserApprove={canUserApprove}
                    currentUserId={userId}
                  />
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
                  <Clock size={32} color="var(--google-yellow)" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    Not Submitted for Review
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    This event is still in <strong>Draft</strong> status. Submit it for review to initiate the Branch Head and Presidential approval stages.
                  </p>
                  <Link href={`/events/${event.id}`} className="btn-primary" style={{ display: 'inline-block' }}>
                    Open Event Control Center
                  </Link>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}
