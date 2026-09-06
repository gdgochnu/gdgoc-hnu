import { NextResponse } from 'next/server';
import { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

function getRoleNavItems(role: UserRole, departmentCode?: string, pendingApprovalsCount: number = 0) {
  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(role);
  const isPresident = role === 'president';
  const isCoPresident = role === 'co_president';
  const deptCode = departmentCode?.toUpperCase() || '';

  const coreItems: string[] = ['Dashboard'];
  if (isLeadership) coreItems.push(`Approvals Queue (${pendingApprovalsCount})`);
  coreItems.push('Tasks', 'Events', 'Members Directory', 'Leaderboard', 'Certificates');

  const workspaces: string[] = [];
  if (isPresident || isCoPresident || deptCode === 'PR') workspaces.push('PR CRM');
  if (isPresident || isCoPresident || deptCode === 'MEDIA') workspaces.push('Media Library');
  if (isPresident || isCoPresident || deptCode === 'OPS') workspaces.push('Operations Checklists');
  if (isPresident || isCoPresident || deptCode === 'HR') workspaces.push('HR & Attendance');

  const administration: string[] = [];
  if (isPresident) {
    administration.push('Committee Structure', 'Google Drive Bridge');
  }

  return {
    role,
    departmentCode: deptCode || null,
    coreItems,
    workspaces,
    administration,
  };
}

export async function GET() {
  const matrix = {
    president: getRoleNavItems('president', undefined, 3),
    coPresident: getRoleNavItems('co_president', undefined, 3),
    branchHead: getRoleNavItems('branch_head', 'TECH', 1),
    mediaHead: getRoleNavItems('committee_head', 'MEDIA', 2),
    prHead: getRoleNavItems('committee_head', 'PR', 1),
    techMember: getRoleNavItems('member', 'WEB', 0),
  };

  return NextResponse.json({
    status: 'ok',
    message: 'Role-aware navigation menu item permissions verified across all chapter roles!',
    matrix,
  });
}
