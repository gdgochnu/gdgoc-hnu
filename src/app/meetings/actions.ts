'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  TeamMeeting,
  TeamMeetingAttendee,
  TeamMeetingType,
  TeamMeetingAudienceType,
  TeamMeetingStatus,
  TeamMeetingAttendanceStatus,
  DepartmentBranch,
} from '@/types';
import { createNotification } from '@/app/notifications/actions';

export interface CreateTeamMeetingInput {
  title: string;
  description?: string | null;
  meetingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime?: string | null;
  type: TeamMeetingType;
  onlineMeetingUrl?: string | null;
  location?: string | null;
  targetAudienceType: TeamMeetingAudienceType;
  targetBranch?: DepartmentBranch | null;
  targetDepartmentId?: string | null;
  selectedMemberIds?: string[];
  facilitatorId?: string | null;
  agenda?: string | null;
}

export interface UpdateTeamMeetingInput {
  title?: string;
  description?: string | null;
  meetingDate?: string;
  startTime?: string;
  endTime?: string | null;
  type?: TeamMeetingType;
  onlineMeetingUrl?: string | null;
  location?: string | null;
  status?: TeamMeetingStatus;
  facilitatorId?: string | null;
  agenda?: string | null;
  minutes?: string | null;
}

/**
 * Get available options (departments and active members) for scheduling a meeting
 */
export async function getMeetingSchedulingOptions(): Promise<{
  departments: Array<{ id: string; name: string; code: string; branch: DepartmentBranch }>;
  members: Array<{ id: string; full_name: string; role: string; department_id: string | null; email: string; avatar_url: string | null }>;
  canSchedule: boolean;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { departments: [], members: [], canSchedule: false };
    }

    const admin = createAdminClient();
    const [{ data: depts }, { data: mems }] = await Promise.all([
      admin.from('departments').select('id, name, code, branch').order('name'),
      admin
        .from('profiles')
        .select('id, full_name, role, department_id, email, avatar_url')
        .eq('status', 'active')
        .order('full_name'),
    ]);

    return {
      departments: (depts || []) as any,
      members: (mems || []) as any,
      canSchedule: canScheduleMeetings(context.profile),
    };
  } catch (err) {
    console.error('getMeetingSchedulingOptions error:', err);
    return { departments: [], members: [], canSchedule: false };
  }
}

/**
 * Check if the user is authorized to schedule/create meetings.
 * Strict gating: Only President, Co-President, and Branch Heads can create meetings.
 */
function canScheduleMeetings(profile: any): boolean {
  if (!profile) return false;
  if (profile.role === 'president' || profile.role === 'co_president') return true;
  if (profile.role === 'branch_head') return true;
  return false;
}

/**
 * Check if the user is authorized to record attendance for a meeting.
 * Allowed: President, Co-President, Branch Heads, HR members, Meeting Creator, or Assigned Facilitator.
 */
function canRecordAttendance(profile: any, meeting: any): boolean {
  if (!profile) return false;
  if (profile.role === 'president' || profile.role === 'co_president') return true;
  if (profile.role === 'branch_head') return true;
  if (profile.department?.code === 'HR' || profile.department?.code === 'HUMAN_RESOURCES') return true;
  if (meeting.created_by === profile.id) return true;
  if (meeting.facilitator_id === profile.id) return true;
  return false;
}

/**
 * 1. Create a new Team Meeting
 */
export async function createTeamMeeting(input: CreateTeamMeetingInput): Promise<{
  success: boolean;
  meetingId?: string;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Authentication required.' };
    }

    const currentProfile = context.profile;
    const creatorProfileId = currentProfile.id;

    if (!canScheduleMeetings(currentProfile)) {
      return {
        success: false,
        error: 'Forbidden: Only the Chapter President and Branch Heads are authorized to schedule team meetings.',
      };
    }

    // Validate inputs
    if (!input.title?.trim()) {
      return { success: false, error: 'Meeting title is required.' };
    }
    if (!input.meetingDate) {
      return { success: false, error: 'Meeting date is required.' };
    }
    if (!input.startTime) {
      return { success: false, error: 'Meeting start time is required.' };
    }
    if (input.type === 'online' && !input.onlineMeetingUrl?.trim()) {
      return { success: false, error: 'Online meeting link (Google Meet / Zoom) is required for online meetings.' };
    }
    if (input.type === 'offline' && !input.location?.trim()) {
      return { success: false, error: 'Physical venue/room is required for in-person meetings.' };
    }

    const admin = createAdminClient();

    // Insert meeting record
    const { data: meeting, error: insertErr } = await admin
      .from('team_meetings')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        meeting_date: input.meetingDate,
        start_time: input.startTime,
        end_time: input.endTime || null,
        type: input.type,
        online_meeting_url: input.type === 'online' ? input.onlineMeetingUrl?.trim() : null,
        location: input.type === 'offline' ? input.location?.trim() : null,
        target_audience_type: input.targetAudienceType,
        target_branch: input.targetAudienceType === 'branch' ? input.targetBranch : null,
        target_department_id: input.targetAudienceType === 'department' ? input.targetDepartmentId : null,
        status: 'scheduled',
        created_by: context.profile.id,
        facilitator_id: input.facilitatorId || null,
        agenda: input.agenda?.trim() || null,
      })
      .select('id, title, meeting_date, start_time, type, online_meeting_url, location')
      .single();

    if (insertErr || !meeting) {
      console.error('Error creating team meeting:', insertErr);
      return { success: false, error: insertErr?.message || 'Failed to create meeting.' };
    }

    // Resolve target audience member profile IDs
    let targetProfileIds: string[] = [];

    if (input.targetAudienceType === 'all_team') {
      const { data: allMembers } = await admin
        .from('profiles')
        .select('id')
        .eq('status', 'active');
      targetProfileIds = (allMembers || []).map((m) => m.id);
    } else if (input.targetAudienceType === 'branch' && input.targetBranch) {
      // Find all departments in branch
      const { data: depts } = await admin
        .from('departments')
        .select('id')
        .eq('branch', input.targetBranch);
      const deptIds = (depts || []).map((d) => d.id);

      const { data: branchMembers } = await admin
        .from('profiles')
        .select('id, department_id, role')
        .eq('status', 'active')
        .or(`department_id.in.(${deptIds.join(',')}),role.eq.branch_head`);
      targetProfileIds = (branchMembers || []).map((m) => m.id);
    } else if (input.targetAudienceType === 'department' && input.targetDepartmentId) {
      const { data: deptMembers } = await admin
        .from('profiles')
        .select('id')
        .eq('status', 'active')
        .eq('department_id', input.targetDepartmentId);
      targetProfileIds = (deptMembers || []).map((m) => m.id);
    } else if (input.targetAudienceType === 'selected_members' && input.selectedMemberIds?.length) {
      targetProfileIds = [...input.selectedMemberIds];
    }

    // Ensure creator and facilitator are included in attendees list
    const attendeeSet = new Set<string>(targetProfileIds);
    attendeeSet.add(creatorProfileId);
    if (input.facilitatorId) {
      attendeeSet.add(input.facilitatorId);
    }

    const uniqueAttendeeIds = Array.from(attendeeSet);

    if (uniqueAttendeeIds.length > 0) {
      const attendeeRows = uniqueAttendeeIds.map((pid) => ({
        meeting_id: meeting.id,
        profile_id: pid,
        status: pid === creatorProfileId ? 'present' : 'pending',
        check_in_time: pid === creatorProfileId ? new Date().toISOString() : null,
      }));

      // Insert in chunks of 100
      for (let i = 0; i < attendeeRows.length; i += 100) {
        const chunk = attendeeRows.slice(i, i + 100);
        await admin.from('team_meeting_attendees').insert(chunk);
      }

      // Notify invited members (except creator)
      const notifyIds = uniqueAttendeeIds.filter((id) => id !== creatorProfileId);
      const locationText = input.type === 'online' ? 'Online' : (input.location || 'In-Person');
      
      // Async dispatch notifications
      (async () => {
        for (const targetId of notifyIds) {
          try {
            await createNotification({
              profileId: targetId,
              type: 'team_meeting_scheduled',
              title: `New Team Meeting: ${meeting.title}`,
              message: `You have been scheduled for a team meeting on ${meeting.meeting_date} at ${meeting.start_time} (${locationText}).`,
              relatedEntityType: 'team_meeting',
              relatedEntityId: meeting.id,
            });
          } catch (e) {
            // non-blocking notification error
          }
        }
      })();
    }

    revalidatePath('/meetings');
    revalidatePath(`/meetings/${meeting.id}`);

    return { success: true, meetingId: meeting.id };
  } catch (err: any) {
    console.error('createTeamMeeting exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 2. Update an existing Team Meeting
 */
export async function updateTeamMeeting(
  meetingId: string,
  input: UpdateTeamMeetingInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();
    const { data: meeting, error: fetchErr } = await admin
      .from('team_meetings')
      .select('*, target_department:departments(*)')
      .eq('id', meetingId)
      .single();

    if (fetchErr || !meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    if (!canRecordAttendance(context.profile, meeting)) {
      return { success: false, error: 'Forbidden: You do not have permission to edit this meeting.' };
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.meetingDate !== undefined) updateData.meeting_date = input.meetingDate;
    if (input.startTime !== undefined) updateData.start_time = input.startTime;
    if (input.endTime !== undefined) updateData.end_time = input.endTime || null;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.onlineMeetingUrl !== undefined) updateData.online_meeting_url = input.onlineMeetingUrl?.trim() || null;
    if (input.location !== undefined) updateData.location = input.location?.trim() || null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.facilitatorId !== undefined) updateData.facilitator_id = input.facilitatorId || null;
    if (input.agenda !== undefined) updateData.agenda = input.agenda?.trim() || null;
    if (input.minutes !== undefined) updateData.minutes = input.minutes?.trim() || null;

    const { error: updateErr } = await admin
      .from('team_meetings')
      .update(updateData)
      .eq('id', meetingId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath('/meetings');
    revalidatePath(`/meetings/${meetingId}`);

    return { success: true };
  } catch (err: any) {
    console.error('updateTeamMeeting error:', err);
    return { success: false, error: err.message || 'Failed to update meeting.' };
  }
}

/**
 * 3. Delete a Team Meeting
 */
export async function deleteTeamMeeting(meetingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();
    const { data: meeting } = await admin
      .from('team_meetings')
      .select('id, created_by')
      .eq('id', meetingId)
      .single();

    if (!meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    const isPresident = context.profile.role === 'president' || context.profile.role === 'co_president';
    const isCreator = meeting.created_by === context.profile.id;

    if (!isPresident && !isCreator) {
      return { success: false, error: 'Only the meeting organizer or Chapter President can delete this meeting.' };
    }

    const { error: delErr } = await admin.from('team_meetings').delete().eq('id', meetingId);
    if (delErr) {
      return { success: false, error: delErr.message };
    }

    revalidatePath('/meetings');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete meeting.' };
  }
}

/**
 * 4. Update an attendee's status (HR, Leadership, Facilitator)
 */
export async function updateMeetingAttendeeStatus(params: {
  meetingId: string;
  profileId: string;
  status: TeamMeetingAttendanceStatus;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();
    const { data: meeting } = await admin
      .from('team_meetings')
      .select('id, created_by, facilitator_id')
      .eq('id', params.meetingId)
      .single();

    if (!meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    if (!canRecordAttendance(context.profile, meeting)) {
      return {
        success: false,
        error: 'Forbidden: Only HR, Chapter Leadership, or the assigned meeting facilitator can record attendance.',
      };
    }

    const checkInTime = params.status === 'present' || params.status === 'late' ? new Date().toISOString() : null;

    const { error: updateErr } = await admin
      .from('team_meeting_attendees')
      .update({
        status: params.status,
        check_in_time: checkInTime,
        marked_by: context.profile.id,
        notes: params.notes !== undefined ? params.notes : null,
        updated_at: new Date().toISOString(),
      })
      .eq('meeting_id', params.meetingId)
      .eq('profile_id', params.profileId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath(`/meetings/${params.meetingId}`);
    revalidatePath(`/members/${params.profileId}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update attendance status.' };
  }
}

/**
 * 5. Batch update attendance (e.g. Mark all pending as absent)
 */
export async function batchUpdateMeetingAttendees(params: {
  meetingId: string;
  updates: Array<{
    profileId: string;
    status: TeamMeetingAttendanceStatus;
    notes?: string;
  }>;
}): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, updatedCount: 0, error: 'Authentication required.' };
    }

    const admin = createAdminClient();
    const { data: meeting } = await admin
      .from('team_meetings')
      .select('id, created_by, facilitator_id')
      .eq('id', params.meetingId)
      .single();

    if (!meeting || !canRecordAttendance(context.profile, meeting)) {
      return { success: false, updatedCount: 0, error: 'Forbidden.' };
    }

    let count = 0;
    for (const item of params.updates) {
      const checkInTime = item.status === 'present' || item.status === 'late' ? new Date().toISOString() : null;
      const { error } = await admin
        .from('team_meeting_attendees')
        .update({
          status: item.status,
          check_in_time: checkInTime,
          marked_by: context.profile.id,
          notes: item.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('meeting_id', params.meetingId)
        .eq('profile_id', item.profileId);

      if (!error) count++;
    }

    revalidatePath(`/meetings/${params.meetingId}`);
    return { success: true, updatedCount: count };
  } catch (err: any) {
    return { success: false, updatedCount: 0, error: err.message };
  }
}

/**
 * 6. Add attendee to meeting on-the-fly
 */
export async function addMeetingAttendee(params: {
  meetingId: string;
  profileId: string;
  status?: TeamMeetingAttendanceStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();
    const { data: meeting } = await admin
      .from('team_meetings')
      .select('id, created_by, facilitator_id')
      .eq('id', params.meetingId)
      .single();

    if (!meeting || !canRecordAttendance(context.profile, meeting)) {
      return { success: false, error: 'Forbidden.' };
    }

    const status = params.status || 'present';
    const checkInTime = status === 'present' || status === 'late' ? new Date().toISOString() : null;

    const { error } = await admin
      .from('team_meeting_attendees')
      .upsert(
        {
          meeting_id: params.meetingId,
          profile_id: params.profileId,
          status,
          check_in_time: checkInTime,
          marked_by: context.profile.id,
        },
        { onConflict: 'meeting_id,profile_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/meetings/${params.meetingId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 7. Query meetings list with counts and attendee status
 */
export async function getMeetingsList(filter?: {
  tab?: 'upcoming' | 'my' | 'past';
  type?: string;
  audience?: string;
}): Promise<{
  success: boolean;
  meetings: TeamMeeting[];
  canSchedule: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, meetings: [], canSchedule: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    let query = admin
      .from('team_meetings')
      .select('*')
      .order('meeting_date', { ascending: filter?.tab === 'past' ? false : true })
      .order('start_time', { ascending: true });

    if (filter?.type && (filter.type === 'online' || filter.type === 'offline')) {
      query = query.eq('type', filter.type);
    }

    if (filter?.audience && ['all_team', 'branch', 'department', 'selected_members'].includes(filter.audience)) {
      query = query.eq('target_audience_type', filter.audience);
    }

    if (filter?.tab === 'past') {
      query = query.lt('meeting_date', today);
    } else if (filter?.tab === 'upcoming') {
      query = query.gte('meeting_date', today).neq('status', 'cancelled');
    }

    const { data: meetingsData, error } = await query;
    if (error) {
      console.error('getMeetingsList error:', error);
      return { success: false, meetings: [], canSchedule: false, error: error.message };
    }

    const rawMeetings = meetingsData || [];
    const meetingIds = rawMeetings.map((m) => m.id);

    // Collect related IDs for creators and departments
    const creatorIds = Array.from(new Set(rawMeetings.map((m) => m.created_by).filter(Boolean)));
    const facilitatorIds = Array.from(new Set(rawMeetings.map((m) => m.facilitator_id).filter(Boolean)));
    const allProfileIds = Array.from(new Set([...creatorIds, ...facilitatorIds]));
    const departmentIds = Array.from(new Set(rawMeetings.map((m) => m.target_department_id).filter(Boolean)));

    const [profilesRes, departmentsRes] = await Promise.all([
      allProfileIds.length > 0
        ? admin.from('profiles').select('id, full_name, avatar_url, role').in('id', allProfileIds)
        : Promise.resolve({ data: [] }),
      departmentIds.length > 0
        ? admin.from('departments').select('id, name, code, branch').in('id', departmentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profilesMap = new Map<string, any>();
    (profilesRes.data || []).forEach((p) => profilesMap.set(p.id, p));

    const departmentsMap = new Map<string, any>();
    (departmentsRes.data || []).forEach((d) => departmentsMap.set(d.id, d));

    // Fetch attendees count & user's attendance
    let attendeesCountMap = new Map<string, number>();
    let myAttendanceMap = new Map<string, TeamMeetingAttendee>();

    if (meetingIds.length > 0) {
      const { data: allAttendees } = await admin
        .from('team_meeting_attendees')
        .select('id, meeting_id, profile_id, status, check_in_time, notes, marked_by, created_at, updated_at')
        .in('meeting_id', meetingIds);

      (allAttendees || []).forEach((att) => {
        attendeesCountMap.set(att.meeting_id, (attendeesCountMap.get(att.meeting_id) || 0) + 1);
        if (att.profile_id === context.profile?.id) {
          myAttendanceMap.set(att.meeting_id, att as TeamMeetingAttendee);
        }
      });
    }

    let finalMeetings: TeamMeeting[] = rawMeetings.map((m) => ({
      ...m,
      creator: profilesMap.get(m.created_by) || null,
      facilitator: profilesMap.get(m.facilitator_id) || null,
      target_department: departmentsMap.get(m.target_department_id) || null,
      attendees_count: attendeesCountMap.get(m.id) || 0,
      my_attendance: myAttendanceMap.get(m.id) || null,
    }));

    // If tab is 'my', filter to only meetings where user is assigned / invited
    if (filter?.tab === 'my') {
      finalMeetings = finalMeetings.filter(
        (m) =>
          m.my_attendance != null ||
          m.created_by === context.profile?.id ||
          m.facilitator_id === context.profile?.id
      );
    }

    const canSchedule = canScheduleMeetings(context.profile);

    return {
      success: true,
      meetings: finalMeetings,
      canSchedule,
    };
  } catch (err: any) {
    console.error('getMeetingsList exception:', err);
    return { success: false, meetings: [], canSchedule: false, error: err.message };
  }
}

/**
 * 8. Query meeting details and full attendee ledger
 */
export async function getMeetingDetails(meetingId: string): Promise<{
  success: boolean;
  meeting?: TeamMeeting;
  attendees?: TeamMeetingAttendee[];
  canManageAttendance?: boolean;
  canEditMeeting?: boolean;
  canDeleteMeeting?: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();
    const { data: meeting, error: meetingErr } = await admin
      .from('team_meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingErr || !meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    // Fetch creator, facilitator, and department in parallel
    const [creatorRes, facilitatorRes, deptRes] = await Promise.all([
      meeting.created_by
        ? admin.from('profiles').select('id, full_name, avatar_url, role').eq('id', meeting.created_by).maybeSingle()
        : Promise.resolve({ data: null }),
      meeting.facilitator_id
        ? admin.from('profiles').select('id, full_name, avatar_url').eq('id', meeting.facilitator_id).maybeSingle()
        : Promise.resolve({ data: null }),
      meeting.target_department_id
        ? admin.from('departments').select('id, name, code, branch').eq('id', meeting.target_department_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Fetch attendees cleanly with select('*')
    const { data: rawAttendees, error: attErr } = await admin
      .from('team_meeting_attendees')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (attErr) {
      console.error('getMeetingDetails attendees error:', attErr);
    }

    const attendeesList = rawAttendees || [];
    const profileIds = Array.from(new Set(attendeesList.map((a) => a.profile_id)));

    let attendeesProfilesMap = new Map<string, any>();
    if (profileIds.length > 0) {
      const { data: profs } = await admin
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          role,
          department:departments(name, code)
        `)
        .in('id', profileIds);

      (profs || []).forEach((p) => attendeesProfilesMap.set(p.id, p));
    }

    const hydratedAttendees: TeamMeetingAttendee[] = attendeesList.map((a) => ({
      ...a,
      profile: attendeesProfilesMap.get(a.profile_id) || null,
    }));

    const canManageAttendance = canRecordAttendance(context.profile, meeting);
    const isPresident = context.profile.role === 'president' || context.profile.role === 'co_president';
    const isCreator = meeting.created_by === context.profile.id;

    return {
      success: true,
      meeting: {
        ...meeting,
        creator: creatorRes.data || null,
        facilitator: facilitatorRes.data || null,
        target_department: deptRes.data || null,
        attendees_count: hydratedAttendees.length,
      },
      attendees: hydratedAttendees,
      canManageAttendance,
      canEditMeeting: canManageAttendance,
      canDeleteMeeting: isPresident || isCreator,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 9. Query meeting attendance history and statistics for a specific member
 */
export async function getMemberMeetingAttendanceStats(profileId: string): Promise<{
  success: boolean;
  stats?: {
    totalInvited: number;
    presentCount: number;
    lateCount: number;
    excusedCount: number;
    absentCount: number;
    attendanceRate: number;
  };
  meetings?: Array<{
    meetingId: string;
    title: string;
    meetingDate: string;
    startTime: string;
    type: TeamMeetingType;
    status: TeamMeetingAttendanceStatus;
    notes: string | null;
    checkInTime: string | null;
  }>;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('team_meeting_attendees')
      .select(`
        id,
        status,
        check_in_time,
        notes,
        meeting:team_meetings(
          id,
          title,
          meeting_date,
          start_time,
          type,
          status
        )
      `)
      .eq('profile_id', profileId);

    if (error) {
      return { success: false, error: error.message };
    }

    const validRecords = (data || []).filter(
      (r: any) => r.meeting && r.meeting.status !== 'cancelled'
    );

    let presentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let absentCount = 0;

    validRecords.forEach((r: any) => {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'late') lateCount++;
      else if (r.status === 'excused') excusedCount++;
      else if (r.status === 'absent') absentCount++;
    });

    const totalCounted = presentCount + lateCount + absentCount;
    const attendanceRate = totalCounted > 0
      ? Number((((presentCount + lateCount) / totalCounted) * 100).toFixed(1))
      : 100;

    const meetings = validRecords
      .map((r: any) => ({
        meetingId: r.meeting.id,
        title: r.meeting.title,
        meetingDate: r.meeting.meeting_date,
        startTime: r.meeting.start_time,
        type: r.meeting.type as TeamMeetingType,
        status: r.status as TeamMeetingAttendanceStatus,
        notes: r.notes,
        checkInTime: r.check_in_time,
      }))
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());

    return {
      success: true,
      stats: {
        totalInvited: validRecords.length,
        presentCount,
        lateCount,
        excusedCount,
        absentCount,
        attendanceRate,
      },
      meetings,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
