/**
 * GDGoC HNU OS — Gamification Types (§4.13)
 */

export interface PointRule {
  id: string;
  action_key: string;
  title: string;
  description: string | null;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PointsLogEntry {
  id: string;
  profile_id: string;
  rule_id: string | null;
  action_key: string;
  points: number;
  reason: string;
  awarded_by: string | null;
  season: string;
  created_at: string;
  // Joins
  rule?: PointRule | null;
  awarded_by_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
}

export interface AwardPointsInput {
  profileId: string;
  actionKey: string;
  customPoints?: number;
  customReason?: string;
  awardedBy?: string;
  season?: string;
  relatedEntityId?: string; // e.g. task_id, event_id
  preventDuplicate?: boolean; // If true, don't award if already awarded for this entity/action
}

export interface AwardPointsResult {
  success: boolean;
  pointsAwarded: number;
  rule?: PointRule;
  newTotalPoints?: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface MemberPointsSummary {
  profileId: string;
  totalPoints: number;
  seasonPoints: number;
  season: string;
  rank?: number;
  log: PointsLogEntry[];
}
