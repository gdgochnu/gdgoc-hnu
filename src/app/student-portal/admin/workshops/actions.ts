'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { Workshop, WorkshopInstructor, WorkshopStatus, CourseInstructorRole } from '@/types/student';

export interface AdminWorkshopItem extends Workshop {
  department_name?: string;
  department_code?: string;
  instructors_list: Array<{
    id: string;
    profile_id: string;
    role: CourseInstructorRole;
    full_name: string;
    avatar_url: string | null;
  }>;
  registrations_count: number;
  sessions_count: number;
}

export interface CreateWorkshopInput {
  title: string;
  description?: string;
  category?: string;
  department_id?: string;
  cover_image_url?: string;
  capacity?: number | null;
  registration_deadline?: string | null;
  status: WorkshopStatus;
  registration_open: boolean;
  instructors?: Array<{
    profile_id: string;
    role: CourseInstructorRole;
  }>;
}

export interface UpdateWorkshopInput extends Partial<CreateWorkshopInput> {
  id: string;
}

/**
 * 1. Get list of workshops accessible to current Team Member
 */
export async function getAdminWorkshops(): Promise<{
  success: boolean;
  workshops: AdminWorkshopItem[];
  departments: Array<{ id: string; name: string; code: string; branch: string }>;
  teamMembers: Array<{ id: string; full_name: string; avatar_url: string | null; role: string; department_id: string | null }>;
  userRole: string;
  userDepartmentId: string | null;
  canCreate: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return {
        success: false,
        workshops: [],
        departments: [],
        teamMembers: [],
        userRole: '',
        userDepartmentId: null,
        canCreate: false,
        error: 'Unauthorized: Team membership required.',
      };
    }

    const admin = createAdminClient();
    const profile = context.profile;
    const role = profile.role;
    const isPresident = role === 'president' || role === 'co_president' || role === 'branch_head';
    const isCommitteeHead = ['committee_head', 'committee_co_head'].includes(role);

    // 1. Fetch available departments
    const { data: depts } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .order('name', { ascending: true });

    // 2. Fetch candidate team members for instructor assignment
    const { data: members } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, role, department_id')
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    // 3. Query workshops according to role
    let workshopQuery = admin.from('workshops').select(`
      *,
      department:departments(id, name, code, branch),
      instructors:workshop_instructors(
        id,
        role,
        profile:profiles!workshop_instructors_profile_id_fkey(id, full_name, avatar_url)
      ),
      sessions:workshop_sessions(id),
      registrations:workshop_registrations(id)
    `);

    if (isPresident) {
      // See all workshops
    } else if (isCommitteeHead && profile.department_id) {
      // See workshops owned by their committee, or where assigned as instructor
      const { data: myInstructorWorkshops } = await admin
        .from('workshop_instructors')
        .select('workshop_id')
        .eq('profile_id', profile.id);

      const assignedIds = myInstructorWorkshops?.map((wi: any) => wi.workshop_id) || [];
      if (assignedIds.length > 0) {
        workshopQuery = workshopQuery.or(`department_id.eq.${profile.department_id},id.in.(${assignedIds.join(',')})`);
      } else {
        workshopQuery = workshopQuery.eq('department_id', profile.department_id);
      }
    } else {
      // Regular team members: see only workshops where assigned as instructor/mentor
      const { data: myInstructorWorkshops } = await admin
        .from('workshop_instructors')
        .select('workshop_id')
        .eq('profile_id', profile.id);

      const assignedIds = myInstructorWorkshops?.map((wi: any) => wi.workshop_id) || [];
      if (assignedIds.length === 0) {
        return {
          success: true,
          workshops: [],
          departments: depts || [],
          teamMembers: members || [],
          userRole: role,
          userDepartmentId: profile.department_id,
          canCreate: isPresident || isCommitteeHead,
        };
      }
      workshopQuery = workshopQuery.in('id', assignedIds);
    }

    const { data: rawWorkshops, error: wsErr } = await workshopQuery.order('created_at', { ascending: false });

    if (wsErr) {
      console.error('getAdminWorkshops error:', wsErr);
      return {
        success: false,
        workshops: [],
        departments: depts || [],
        teamMembers: members || [],
        userRole: role,
        userDepartmentId: profile.department_id,
        canCreate: isPresident || isCommitteeHead,
        error: wsErr.message,
      };
    }

    const formattedWorkshops: AdminWorkshopItem[] = (rawWorkshops || []).map((w: any) => {
      const dept = Array.isArray(w.department) ? w.department[0] : w.department;
      const instructorsList = (w.instructors || []).map((inst: any) => {
        const prof = Array.isArray(inst.profile) ? inst.profile[0] : inst.profile;
        return {
          id: inst.id,
          profile_id: prof?.id,
          role: inst.role as CourseInstructorRole,
          full_name: prof?.full_name || 'Instructor',
          avatar_url: prof?.avatar_url || null,
        };
      });

      return {
        id: w.id,
        title: w.title,
        description: w.description,
        cover_image_url: w.cover_image_url,
        category: w.category,
        department_id: w.department_id,
        capacity: w.capacity,
        registration_deadline: w.registration_deadline,
        status: w.status,
        registration_open: w.registration_open,
        created_by: w.created_by,
        created_at: w.created_at,
        updated_at: w.updated_at,
        department: dept || null,
        department_name: dept?.name,
        department_code: dept?.code,
        instructors_list: instructorsList,
        registrations_count: w.registrations ? w.registrations.length : 0,
        sessions_count: w.sessions ? w.sessions.length : 0,
      };
    });

    return {
      success: true,
      workshops: formattedWorkshops,
      departments: depts || [],
      teamMembers: members || [],
      userRole: role,
      userDepartmentId: profile.department_id,
      canCreate: isPresident || isCommitteeHead,
    };
  } catch (err: any) {
    console.error('getAdminWorkshops exception:', err);
    return {
      success: false,
      workshops: [],
      departments: [],
      teamMembers: [],
      userRole: '',
      userDepartmentId: null,
      canCreate: false,
      error: err.message || 'An unexpected error occurred.',
    };
  }
}

/**
 * 2. Create a new workshop
 */
export async function createAdminWorkshop(input: CreateWorkshopInput): Promise<{
  success: boolean;
  workshop?: AdminWorkshopItem;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized.' };
    }

    const profile = context.profile;
    const isPresident = profile.role === 'president' || profile.role === 'co_president' || profile.role === 'branch_head';
    const isCommitteeHead = ['committee_head', 'committee_co_head'].includes(profile.role);

    if (!isPresident && !isCommitteeHead) {
      return { success: false, error: 'Only leadership and committee heads can create workshops.' };
    }

    const targetDeptId = isPresident
      ? input.department_id || profile.department_id
      : profile.department_id;

    if (!input.title || !input.title.trim()) {
      return { success: false, error: 'Workshop title is required.' };
    }

    const admin = createAdminClient();

    const insertData: any = {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || 'Technical Workshop',
      department_id: targetDeptId || null,
      cover_image_url: input.cover_image_url?.trim() || null,
      capacity: input.capacity && input.capacity > 0 ? input.capacity : null,
      registration_deadline: input.registration_deadline ? new Date(input.registration_deadline).toISOString() : null,
      status: input.status || 'draft',
      registration_open: input.registration_open !== undefined ? input.registration_open : true,
      created_by: profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newWorkshop, error: insertErr } = await admin
      .from('workshops')
      .insert(insertData)
      .select('*, department:departments(id, name, code, branch)')
      .single();

    if (insertErr || !newWorkshop) {
      console.error('createAdminWorkshop insert error:', insertErr);
      return { success: false, error: insertErr?.message || 'Failed to create workshop.' };
    }

    // Assign instructors if provided
    if (input.instructors && input.instructors.length > 0) {
      const instructorRows = input.instructors.map((inst) => ({
        workshop_id: newWorkshop.id,
        profile_id: inst.profile_id,
        role: inst.role,
        assigned_by: profile.id,
        assigned_at: new Date().toISOString(),
      }));

      await admin.from('workshop_instructors').insert(instructorRows);
    }

    revalidatePath('/student-portal/admin/workshops');
    revalidatePath('/student/workshops');

    return {
      success: true,
      workshop: {
        ...newWorkshop,
        department_name: newWorkshop.department?.name,
        department_code: newWorkshop.department?.code,
        instructors_list: [],
        registrations_count: 0,
        sessions_count: 0,
      },
    };
  } catch (err: any) {
    console.error('createAdminWorkshop exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 3. Update an existing workshop
 */
export async function updateAdminWorkshop(input: UpdateWorkshopInput): Promise<{
  success: boolean;
  workshop?: AdminWorkshopItem;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const profile = context.profile;
    const isPresident = profile.role === 'president' || profile.role === 'co_president' || profile.role === 'branch_head';
    const isCommitteeHead = ['committee_head', 'committee_co_head'].includes(profile.role);

    // Verify existing workshop
    const { data: existing, error: existErr } = await admin
      .from('workshops')
      .select('id, department_id')
      .eq('id', input.id)
      .single();

    if (existErr || !existing) {
      return { success: false, error: 'Workshop not found.' };
    }

    // Access check
    if (!isPresident) {
      if (isCommitteeHead && existing.department_id !== profile.department_id) {
        return { success: false, error: 'You can only update workshops owned by your committee.' };
      }
      if (!isCommitteeHead) {
        const { data: assigned } = await admin
          .from('workshop_instructors')
          .select('id')
          .eq('workshop_id', input.id)
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (!assigned) {
          return { success: false, error: 'Unauthorized to update this workshop.' };
        }
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description.trim() || null;
    if (input.category !== undefined) updateData.category = input.category.trim() || null;
    if (input.cover_image_url !== undefined) updateData.cover_image_url = input.cover_image_url.trim() || null;
    if (input.department_id !== undefined && isPresident) updateData.department_id = input.department_id || null;
    if (input.capacity !== undefined) updateData.capacity = input.capacity && input.capacity > 0 ? input.capacity : null;
    if (input.registration_deadline !== undefined) {
      updateData.registration_deadline = input.registration_deadline ? new Date(input.registration_deadline).toISOString() : null;
    }
    if (input.status !== undefined) updateData.status = input.status;
    if (input.registration_open !== undefined) updateData.registration_open = input.registration_open;

    const { data: updatedWorkshop, error: updateErr } = await admin
      .from('workshops')
      .update(updateData)
      .eq('id', input.id)
      .select('*, department:departments(id, name, code, branch)')
      .single();

    if (updateErr || !updatedWorkshop) {
      console.error('updateAdminWorkshop update error:', updateErr);
      return { success: false, error: updateErr?.message || 'Failed to update workshop.' };
    }

    // Update instructors if provided
    if (input.instructors !== undefined && (isPresident || isCommitteeHead)) {
      await admin.from('workshop_instructors').delete().eq('workshop_id', input.id);

      if (input.instructors.length > 0) {
        const instructorRows = input.instructors.map((inst) => ({
          workshop_id: input.id,
          profile_id: inst.profile_id,
          role: inst.role,
          assigned_by: profile.id,
          assigned_at: new Date().toISOString(),
        }));
        await admin.from('workshop_instructors').insert(instructorRows);
      }
    }

    revalidatePath('/student-portal/admin/workshops');
    revalidatePath(`/student-portal/admin/workshops/${input.id}`);
    revalidatePath('/student/workshops');
    revalidatePath(`/student/workshops/${input.id}`);

    return {
      success: true,
      workshop: {
        ...updatedWorkshop,
        department_name: updatedWorkshop.department?.name,
        department_code: updatedWorkshop.department?.code,
        instructors_list: [],
        registrations_count: 0,
        sessions_count: 0,
      },
    };
  } catch (err: any) {
    console.error('updateAdminWorkshop exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 4. Delete a workshop
 */
export async function deleteAdminWorkshop(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const profile = context.profile;
    const isPresident = profile.role === 'president' || profile.role === 'co_president';
    const isCommitteeHead = profile.role === 'committee_head';

    const { data: ws, error: findErr } = await admin
      .from('workshops')
      .select('id, department_id')
      .eq('id', id)
      .single();

    if (findErr || !ws) {
      return { success: false, error: 'Workshop not found.' };
    }

    if (!isPresident) {
      if (!isCommitteeHead || ws.department_id !== profile.department_id) {
        return { success: false, error: 'Only leadership or the owning committee head can delete workshops.' };
      }
    }

    // 1. Explicitly clean up student certificates for this workshop to prevent chk_student_certificates_parent violation
    await admin.from('student_certificates').delete().eq('workshop_id', id);

    // 2. Delete the workshop
    const { error: delErr } = await admin.from('workshops').delete().eq('id', id);

    if (delErr) {
      console.error('deleteAdminWorkshop error:', delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath('/student-portal/admin/workshops');
    revalidatePath('/student/workshops');

    return { success: true };
  } catch (err: any) {
    console.error('deleteAdminWorkshop exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 5. Quick toggle registration open / closed
 */
export async function toggleWorkshopRegistrationOpen(id: string, registration_open: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('workshops')
      .update({
        registration_open,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/student-portal/admin/workshops');
    revalidatePath('/student/workshops');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle registration.' };
  }
}
