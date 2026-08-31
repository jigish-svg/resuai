import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { TruthGuardFlag } from '@/types/match';

const RewrittenBulletSchema = z.object({
  rewritten: z.string(),
  reasoning: z.string(),
  facts_used: z.array(z.string()), // exact facts from resume used in rewrite
  metrics_used: z.array(z.string()), // exact metrics from resume
});

const TruthGuardSchema = z.object({
  flags: z.array(z.object({
    text: z.string(),
    reason: z.string(),
    source: z.enum(['ai_generated', 'not_in_resume']),
  })),
  passed: z.boolean(),
});

const OptimizeATSSchema = z.object({
  summary: z.string(),
  experience: z.array(z.object({
    bullets: z.array(z.string()),
  })),
  skills: z.array(z.string()),
  keywords_added: z.array(z.string()),
  keywords_still_missing: z.array(z.string()),
});

export interface OptimizeATSExperienceInput {
  company: string;
  job_title: string;
  bullets: string[];
}

export interface OptimizeATSAchievementInput {
  company: string;
  job_title: string;
  achievement_text: string;
  skills: string[];
  metrics: string[];
}

const TailoringPlanSchema = z.object({
  summary_change: z.object({
    proposed: z.string(),
    rationale: z.string(),
  }).nullable(),
  bullet_changes: z.array(z.object({
    experience_index: z.number(),
    bullet_index: z.number(),
    proposed: z.string(),
    requirement_text: z.string().optional(),
    rationale: z.string(),
  })),
  skills_to_add: z.array(z.object({
    skill: z.string(),
    rationale: z.string(),
  })),
  skills_to_remove: z.array(z.object({
    skill: z.string(),
    rationale: z.string(),
  })),
  gaps: z.array(z.object({
    keyword: z.string(),
    reason: z.string(),
  })),
});

export async function generateTailoringPlan(
  jobTitle: string,
  company: string | null,
  summary: string,
  experience: OptimizeATSExperienceInput[],
  skills: string[],
  jobKeywords: string[],
  requirements: { text: string; importance: string }[],
  achievements: OptimizeATSAchievementInput[]
): Promise<z.infer<typeof TailoringPlanSchema>> {
  const requirementsList = requirements.map((r) => `[${r.importance.toUpperCase()}] ${r.text}`).join('\n');
  const achievementsList = achievements
    .map((a) => `${a.job_title} at ${a.company}: "${a.achievement_text}" (Skills: ${a.skills.join(', ')}; Metrics: ${a.metrics.join(', ')})`)
    .join('\n');
  const experienceList = experience
    .map((e, i) => `[exp ${i}] ${e.job_title} at ${e.company}:\n${e.bullets.map((b, j) => `  [bullet ${j}] ${b}`).join('\n')}`)
    .join('\n\n');

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an ATS optimization expert and resume writer. Instead of rewriting the resume directly, propose a REVIEWABLE LIST of individual, specific changes for the candidate to approve or reject one by one, tailored to this exact job.

Be generous and resourceful about what counts as evidence — most real job requirements can be honestly supported by adjacent or transferable experience, not just an exact wording match. Examples: leading a small project or mentoring one person supports "team leadership"; building internal scripts/tools supports "software development"; coordinating with clients or stakeholders supports "customer-facing" or "communication skills"; using one framework/tool supports a closely related one in the same ecosystem. Actively look for these connections instead of defaulting to "no evidence." Only treat a keyword as a true gap if there is genuinely no reasonably related experience anywhere in the achievements.

ABSOLUTE RULES — TRUTH GUARD (never break these):
1. Only propose a change if it is evidenced by the candidate's achievements below — directly, via a clear equivalent (e.g. "React" evidences "React.js"), or via a reasonable transferable/adjacent skill as described above. Never state something with more confidence or scope than the underlying evidence supports.
2. Never propose inventing metrics, numbers, employers, titles, projects, or responsibilities not present in the evidence. You may only reword EXISTING bullets and the EXISTING summary — never propose a new job, project, or accomplishment that doesn't correspond to a real achievement below.
3. Each proposed bullet change should reword an EXISTING bullet to use the job description's exact terminology where the underlying achievement already supports it (directly or via transferable skill) — reference it by its exact [exp N] and [bullet N] index from the input. Preserve every real metric and fact exactly; only change phrasing/keyword choice and framing, not substance.
4. Propose a thorough, high-coverage set of changes across the bullets and skills that affect this job's requirements and keyword coverage — don't hold back on a change just because the match is via a transferable skill rather than an exact one, as long as it's honestly framed.
5. skills_to_add must contain skills genuinely evidenced by the achievements — directly, via synonym, or via a clearly related transferable skill — that are missing from the current skills list and are emphasized by this job.
6. skills_to_remove: a tailored resume's skills section should only show what's relevant to THIS job, not everything the candidate has ever done. Propose removing any current skill that has no meaningful relevance to this job's requirements/keywords (e.g. an unrelated tool from a totally different domain). Never propose removing a skill that is relevant, even loosely, to this job — when in doubt, keep it.
7. Propose ONE tailored professional summary rewrite (summary_change) specifically emphasizing the strongest matches for THIS job — grounded only in real evidence, generously interpreted as above. Set summary_change to null only if the current summary is already excellent for this job.
8. Only after genuinely searching for a transferable-skill angle and finding none, list the keyword in gaps with a short honest reason.`,
      },
      {
        role: 'user',
        content: `Job: ${jobTitle}${company ? ` at ${company}` : ''}

JOB REQUIREMENTS:
${requirementsList}

JOB KEYWORDS:
${jobKeywords.join(', ')}

CANDIDATE'S REAL ACHIEVEMENTS (only source of truth):
${achievementsList}

CURRENT SUMMARY:
${summary}

CURRENT EXPERIENCE BULLETS (reference by [exp N] [bullet N] index):
${experienceList}

CURRENT SKILLS:
${skills.join(', ')}

Propose the tailoring plan now.`,
      },
    ],
    response_format: zodResponseFormat(TailoringPlanSchema, 'tailoring_plan'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Tailoring plan generation failed: no result returned');
  }

  return result;
}

export async function optimizeResumeForATS(
  summary: string,
  experience: OptimizeATSExperienceInput[],
  skills: string[],
  jobKeywords: string[],
  requirements: { text: string; importance: string }[],
  achievements: OptimizeATSAchievementInput[]
): Promise<z.infer<typeof OptimizeATSSchema>> {
  const requirementsList = requirements.map((r) => `[${r.importance.toUpperCase()}] ${r.text}`).join('\n');
  const achievementsList = achievements
    .map((a) => `${a.job_title} at ${a.company}: "${a.achievement_text}" (Skills: ${a.skills.join(', ')}; Metrics: ${a.metrics.join(', ')})`)
    .join('\n');
  const experienceList = experience
    .map((e, i) => `[${i}] ${e.job_title} at ${e.company}:\n${e.bullets.map((b) => `  - ${b}`).join('\n')}`)
    .join('\n\n');

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an ATS (Applicant Tracking System) optimization expert and professional resume writer. Your job is to rewrite this resume so it scores as high as possible against an ATS keyword scan for a specific job — while remaining 100% truthful.

Be generous and resourceful about what counts as evidence — most real job requirements can be honestly supported by adjacent or transferable experience, not just an exact wording match. Examples: leading a small project or mentoring one person supports "team leadership"; building internal scripts/tools supports "software development"; coordinating with clients or stakeholders supports "customer-facing" or "communication skills"; using one framework/tool supports a closely related one in the same ecosystem. Actively look for these connections instead of defaulting to "no evidence."

ABSOLUTE RULES — TRUTH GUARD (never break these):
1. You may ONLY state a skill, tool, technology, or responsibility if it is evidenced by the candidate's achievements provided below — directly, via a clear equivalent (e.g. "React" evidences "React.js"), or via a reasonable transferable/adjacent skill as described above.
2. You may NEVER invent metrics, numbers, employers, job titles, projects, or responsibilities not present in the evidence. You are only rewording and reframing EXISTING bullets and the EXISTING summary — never add a new job, project, or accomplishment that doesn't correspond to a real achievement below. Keep the exact same number of experience entries and bullets per entry as given.
3. Where a job keyword IS evidenced (directly or via transferable skill), rewrite the relevant bullet(s) or the summary to use the job description's exact terminology (e.g. if the evidence says "built REST APIs" and the JD says "RESTful services", use "RESTful services"). Prefer weaving keywords into existing bullets naturally over just listing them.
4. Where a job keyword is genuinely NOT evidenced anywhere in the achievements — even after considering transferable skills — do NOT add it to the resume. Instead, list it in keywords_still_missing. Never pad the skills list with unsupported skills.
5. Preserve every real metric and fact exactly as given — only change phrasing/keywords, not substance.
6. Keep the same number of experience entries and the same number of bullets per entry as the input (rewrite bullets in place, don't add or remove any).
7. The returned skills list should contain ONLY skills relevant to this specific job — reorder it, add genuinely-evidenced skills relevant to this job (pulled from the achievements' skills/metrics), and drop any current skill that has no meaningful relevance to this job's requirements/keywords. Never add an unevidenced skill, and never drop a skill that is relevant, even loosely — when in doubt, keep it.
8. Report every keyword you successfully wove in (verbatim as it now appears) in keywords_added.

Your goal: the strongest possible truthful match to this job — never a fabricated one.`,
      },
      {
        role: 'user',
        content: `JOB REQUIREMENTS:
${requirementsList}

JOB KEYWORDS (from the job description, for ATS matching):
${jobKeywords.join(', ')}

CANDIDATE'S REAL ACHIEVEMENTS (only source of truth):
${achievementsList}

CURRENT RESUME SUMMARY:
${summary}

CURRENT EXPERIENCE BULLETS (rewrite in place, same count of entries and bullets):
${experienceList}

CURRENT SKILLS LIST:
${skills.join(', ')}

Optimize this resume now for maximum truthful ATS keyword match.`,
      },
    ],
    response_format: zodResponseFormat(OptimizeATSSchema, 'optimize_ats'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('ATS optimization failed: no result returned');
  }
  if (result.experience.length !== experience.length) {
    throw new Error('ATS optimization returned a different number of experience entries than expected');
  }

  return result;
}

export async function rewriteAchievementBullet(
  originalText: string,
  requirementText: string,
  verifiedFacts: string[],
  verifiedMetrics: string[]
): Promise<z.infer<typeof RewrittenBulletSchema>> {
  const factsContext = verifiedFacts.length > 0
    ? `\nVerified facts you MAY use:\n${verifiedFacts.map(f => `- ${f}`).join('\n')}`
    : '';
  const metricsContext = verifiedMetrics.length > 0
    ? `\nVerified metrics you MAY use:\n${verifiedMetrics.map(m => `- ${m}`).join('\n')}`
    : '';

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a professional resume writer. Rewrite achievement bullets to better align with job requirements.

ABSOLUTE RULES - TRUTH GUARD:
1. You may ONLY use facts explicitly present in the original text or the provided verified facts
2. You may ONLY use metrics (numbers, percentages, dollar amounts) from the verified metrics list
3. You CANNOT invent new metrics, numbers, or facts
4. You CANNOT add responsibilities not described in the original
5. If the original says "reduced time by 40%", you cannot change it to any other percentage
6. Keep quantifiable achievements intact
7. Start with a strong action verb
8. Make it ATS-friendly and keyword-rich using natural language

Your goal: make the candidate look as strong as possible using ONLY their real accomplishments.`,
      },
      {
        role: 'user',
        content: `Job requirement: "${requirementText}"

Original achievement: "${originalText}"${factsContext}${metricsContext}

Rewrite this achievement to better align with the requirement. Use only verified facts and metrics.`,
      },
    ],
    response_format: zodResponseFormat(RewrittenBulletSchema, 'rewritten_bullet'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Bullet rewrite failed: no result returned');
  }

  return result;
}

export async function runTruthGuard(
  tailoredText: string,
  masterResumeText: string
): Promise<{ flags: TruthGuardFlag[]; passed: boolean }> {
  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a fact-checker for resume content. Compare the tailored resume text against the master resume to identify any unsupported claims.

Flag any text in the tailored resume that:
1. Contains specific metrics (%, $, numbers) not present in the master resume
2. Claims skills or experience not in the master resume
3. Describes responsibilities broader than what's documented
4. Uses superlatives (e.g., "led company-wide") without supporting evidence

Only flag genuine discrepancies. Minor rewordings and synonyms are acceptable.`,
      },
      {
        role: 'user',
        content: `MASTER RESUME (source of truth):
${masterResumeText}

TAILORED RESUME (to fact-check):
${tailoredText}

Identify any unsupported claims or fabricated information.`,
      },
    ],
    response_format: zodResponseFormat(TruthGuardSchema, 'truth_guard_result'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Truth guard failed: no result returned');
  }

  return {
    flags: result.flags,
    passed: result.passed,
  };
}
