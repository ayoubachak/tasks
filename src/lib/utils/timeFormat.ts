/**
 * Format minutes to human-readable time string
 * @param minutes - Time in minutes
 * @returns Formatted string (e.g., "2h 30m", "45m", "1d 3h")
 */
export function formatTime(minutes: number): string {
  if (minutes < 0) return '0m';
  
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

  return parts.join(' ');
}

/**
 * Parse time string to minutes
 * Supports formats like "2h 30m", "45m", "1d 3h", "2.5h"
 */
export function parseTime(timeString: string): number {
  if (!timeString.trim()) return 0;

  const clean = timeString.trim().toLowerCase();
  let totalMinutes = 0;

  // Match patterns like "2h 30m", "1d 3h 15m", "45m", "2.5h"
  const patterns = [
    { regex: /(\d+(?:\.\d+)?)\s*d(?:ays?)?/i, multiplier: 24 * 60 },
    { regex: /(\d+(?:\.\d+)?)\s*h(?:ours?)?/i, multiplier: 60 },
    { regex: /(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/i, multiplier: 1 },
  ];

  for (const { regex, multiplier } of patterns) {
    const match = clean.match(regex);
    if (match) {
      totalMinutes += parseFloat(match[1]) * multiplier;
    }
  }

  return Math.round(totalMinutes);
}

/**
 * Format time for input field (e.g., "2h 30m")
 */
export function formatTimeForInput(minutes: number): string {
  if (minutes === 0) return '';
  return formatTime(minutes);
}

