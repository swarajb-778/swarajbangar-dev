// ═══════════════════════════════════════════════════════════════
// Command History — sessionStorage-backed, navigable via up/down
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'swaraj-cmd-history';
const MAX_SIZE = 50;

export interface CommandHistory {
  /** Add a command to history (dedupes consecutive) */
  push(cmd: string): void;
  /** Move back in history, returns the command or null if at start */
  up(currentInput: string): string | null;
  /** Move forward in history, returns the command or empty string at end */
  down(): string | null;
  /** Reset navigation index (call when user types new input) */
  reset(): void;
  /** Get all history entries */
  getAll(): readonly string[];
}

export function createCommandHistory(): CommandHistory {
  let entries: string[] = [];
  let index = -1; // -1 = not browsing, 0..n-1 = position from end
  let savedInput = ''; // input before user started browsing

  // Load from sessionStorage
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      entries = JSON.parse(stored) as string[];
    }
  } catch {
    // sessionStorage unavailable
  }

  function save(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // sessionStorage unavailable
    }
  }

  return {
    push(cmd: string): void {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      // Dedupe consecutive
      if (entries[entries.length - 1] !== trimmed) {
        entries.push(trimmed);
        if (entries.length > MAX_SIZE) {
          entries = entries.slice(entries.length - MAX_SIZE);
        }
        save();
      }
      index = -1;
    },

    up(currentInput: string): string | null {
      if (entries.length === 0) return null;
      if (index === -1) {
        // Starting to browse — save current input
        savedInput = currentInput;
        index = entries.length - 1;
      } else if (index > 0) {
        index--;
      } else {
        return entries[0] ?? null; // Already at oldest
      }
      return entries[index] ?? null;
    },

    down(): string | null {
      if (index === -1) return null;
      if (index < entries.length - 1) {
        index++;
        return entries[index] ?? null;
      }
      // Past the newest — restore saved input
      index = -1;
      return savedInput;
    },

    reset(): void {
      index = -1;
    },

    getAll(): readonly string[] {
      return entries;
    },
  };
}
