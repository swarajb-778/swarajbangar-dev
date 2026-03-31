// ═══════════════════════════════════════════════════════════════
// swarajbangar.dev — Utility Functions
// ═══════════════════════════════════════════════════════════════

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper conflict resolution.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format large numbers for display.
 * Examples: 50_000_000 → "50M+", 3500 → "3.5K", 247 → "247"
 */
export function formatNumber(value: number, suffix?: string): string {
  const suffixStr = suffix ?? '';

  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(
      value % 1_000_000 === 0 ? 0 : 1
    );
    return `${formatted}M+${suffixStr}`;
  }

  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1);
    return `${formatted}K${suffixStr}`;
  }

  return `${value}${suffixStr}`;
}

/**
 * Format an ISO date string for display.
 * Example: "2024-03-15" → "Mar 15, 2024"
 */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Promise-based delay. Useful for staggered animations and simulated latency.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis.
 * Example: truncate("Hello World", 5) → "Hello..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
