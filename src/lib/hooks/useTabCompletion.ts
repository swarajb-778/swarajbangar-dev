// ═══════════════════════════════════════════════════════════════
// Tab Completion — prefix matching with subcommand support
// ═══════════════════════════════════════════════════════════════

/** Map of command → possible subcommand arguments */
const SUBCOMMAND_COMPLETIONS: Record<string, readonly string[]> = {
  cat: ['about.md', 'skills.json', 'readme.md'],
  sudo: ['hire swaraj'],
  ping: ['google.com'],
  rm: ['-rf /'],
  sound: ['on', 'off'],
} as const;

export interface TabCompletion {
  /** Returns the single best match if exactly one, or null */
  complete(partial: string): string | null;
  /** Returns all commands that start with the partial */
  getSuggestions(partial: string): readonly string[];
}

export function createTabCompletion(
  commandNames: readonly string[]
): TabCompletion {
  return {
    complete(partial: string): string | null {
      const lower = partial.toLowerCase().trimStart();
      if (!lower) return null;

      // Check if we're completing a subcommand (partial has a space)
      const spaceIdx = lower.indexOf(' ');
      if (spaceIdx !== -1) {
        const cmd = lower.slice(0, spaceIdx);
        const subPartial = lower.slice(spaceIdx + 1);
        const subs = SUBCOMMAND_COMPLETIONS[cmd];
        if (!subs) return null;

        const matches = subs.filter((s) =>
          s.toLowerCase().startsWith(subPartial.toLowerCase())
        );
        if (matches.length === 1) {
          return `${cmd} ${matches[0]}`;
        }
        return null;
      }

      // Top-level command completion
      const matches = commandNames.filter((name) =>
        name.toLowerCase().startsWith(lower)
      );
      if (matches.length === 1) {
        return matches[0]!;
      }
      return null;
    },

    getSuggestions(partial: string): readonly string[] {
      const lower = partial.toLowerCase().trimStart();
      if (!lower) return commandNames;

      // Subcommand suggestions
      const spaceIdx = lower.indexOf(' ');
      if (spaceIdx !== -1) {
        const cmd = lower.slice(0, spaceIdx);
        const subPartial = lower.slice(spaceIdx + 1);
        const subs = SUBCOMMAND_COMPLETIONS[cmd];
        if (!subs) return [];

        return subs.filter((s) =>
          s.toLowerCase().startsWith(subPartial.toLowerCase())
        );
      }

      // Top-level suggestions
      return commandNames.filter((name) =>
        name.toLowerCase().startsWith(lower)
      );
    },
  };
}
