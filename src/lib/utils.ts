import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.toLowerCase() === 'present' || dateStr.toLowerCase() === 'current') return 'Present';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

// Thresholds match getMatchLabel in lib/openai/match-scorer.ts — kept in
// sync so the color and the label never disagree with each other.
export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-brand-green';
  if (score >= 60) return 'text-green-600';
  if (score >= 45) return 'text-amber-600';
  if (score >= 30) return 'text-orange-600';
  return 'text-rose-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 75) return 'bg-brand-green/10 border-brand-green/25';
  if (score >= 60) return 'bg-green-500/10 border-green-500/25';
  if (score >= 45) return 'bg-amber-500/10 border-amber-500/25';
  if (score >= 30) return 'bg-orange-500/10 border-orange-500/25';
  return 'bg-rose-500/10 border-rose-500/25';
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
