/**
 * Referential Reference Stack
 *
 * Part of FP-7A: Referential Intent Foundations (Phase 4A)
 *
 * This is a bounded, immediate-lifetime reference cache.
 * It is NOT persistent memory. It is NOT a conversation history.
 * It is a tiny, fast, expiring store that allows "that" and "it"
 * to resolve to the most recently referenced entity of a given type.
 *
 * =============================================================================
 * DESIGN RULES (Phase 4A)
 * =============================================================================
 *
 * 1. Short-lived only — entries expire after a small fixed window
 * 2. Bounded size — max entries per type is strictly capped
 * 3. Typed — each entry is classified by ReferentEntryType
 * 4. No persistence — no file IO, no cross-session carry-over
 * 5. No growing scope — do not add types not needed by current runtime/docs
 */

/**
 * Types of entities that can be stored in the reference stack.
 * Constrained to what the current runtime and FP-7A docs require.
 */
export type ReferentEntryType =
  | "selection"   // Current text selection or selected element
  | "surface"     // A focused surface (terminal, editor, pane)
  | "execution"   // A recently executed command or process
  | "file"        // A recently referenced file
  | "error";      // A recently surfaced error

/**
 * A single entry in the reference cache
 */
export interface ReferentEntry {
  type: ReferentEntryType;
  /** Human-readable label for the entity (e.g. "main.ts", "cargo build", "NullPointerException") */
  label: string;
  /** Opaque identifier for the entity (path, process id, selection range, etc.) */
  id: string;
  /** Timestamp when this entry was pushed (ms since epoch) */
  pushedAt: number;
}

/**
 * Configuration for reference stack lifetime/size behavior
 */
export interface ReferenceStackConfig {
  /**
   * How many entries to keep per type.
   * Phase 4A keeps this small — 1 for immediate, 3 for short-term types.
   */
  maxEntriesPerType: number;
  /**
   * Entries older than this (ms) are considered expired and will not be returned.
   * Phase 4A uses a short window — a few commands worth of context.
   */
  entryTtlMs: number;
}

const DEFAULT_CONFIG: ReferenceStackConfig = {
  maxEntriesPerType: 3,
  entryTtlMs: 30_000, // 30 seconds — short-term only
};

/**
 * ReferentialReferenceStack
 *
 * Bounded, short-lived reference cache for Phase 4A referent resolution.
 *
 * Usage:
 *   - Call `push()` whenever a command resolves a concrete entity
 *   - Call `lookup()` to retrieve the most recent non-expired entry of a type
 *   - Call `clear()` to reset (e.g. on session boundary)
 */
export class ReferentialReferenceStack {
  private readonly config: ReferenceStackConfig;
  private stack: Map<ReferentEntryType, ReferentEntry[]> = new Map();

  constructor(config: Partial<ReferenceStackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Push a new entity reference onto the stack.
   * If the stack for this type is full, the oldest entry is evicted.
   */
  push(entry: Omit<ReferentEntry, "pushedAt">): void {
    const typed: ReferentEntry = { ...entry, pushedAt: Date.now() };
    const existing = this.stack.get(entry.type) ?? [];

    // Prepend newest, cap at maxEntriesPerType
    const updated = [typed, ...existing].slice(0, this.config.maxEntriesPerType);
    this.stack.set(entry.type, updated);
  }

  /**
   * Return the most recent non-expired entry for the given type, or null.
   */
  lookup(type: ReferentEntryType): ReferentEntry | null {
    const now = Date.now();
    const entries = this.stack.get(type) ?? [];

    for (const entry of entries) {
      if (now - entry.pushedAt <= this.config.entryTtlMs) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Return all non-expired entries for a given type (most recent first).
   */
  lookupAll(type: ReferentEntryType): ReferentEntry[] {
    const now = Date.now();
    const entries = this.stack.get(type) ?? [];
    return entries.filter(e => now - e.pushedAt <= this.config.entryTtlMs);
  }

  /**
   * Remove all expired entries from all types (GC-style maintenance).
   */
  pruneExpired(): void {
    const now = Date.now();
    for (const [type, entries] of this.stack.entries()) {
      const live = entries.filter(e => now - e.pushedAt <= this.config.entryTtlMs);
      if (live.length === 0) {
        this.stack.delete(type);
      } else {
        this.stack.set(type, live);
      }
    }
  }

  /**
   * Remove all entries (e.g. on session or mode boundary).
   */
  clear(): void {
    this.stack.clear();
  }

  /**
   * Return the current live count across all types (for diagnostics).
   */
  liveCount(): number {
    const now = Date.now();
    let total = 0;
    for (const entries of this.stack.values()) {
      total += entries.filter(e => now - e.pushedAt <= this.config.entryTtlMs).length;
    }
    return total;
  }
}
