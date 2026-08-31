export interface SummaryChange {
  proposed: string;
  rationale: string;
}

export interface BulletChange {
  experience_index: number;
  bullet_index: number;
  proposed: string;
  requirement_text?: string;
  rationale: string;
}

export interface SkillToAdd {
  skill: string;
  rationale: string;
}

export interface SkillToRemove {
  skill: string;
  rationale: string;
}

export interface TailoringGap {
  keyword: string;
  reason: string;
}

export interface TailoringPlan {
  summary_change: SummaryChange | null;
  bullet_changes: BulletChange[];
  skills_to_add: SkillToAdd[];
  skills_to_remove: SkillToRemove[];
  gaps: TailoringGap[];
}
