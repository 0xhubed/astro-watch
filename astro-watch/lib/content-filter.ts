/**
 * Server-side content filter — runs BEFORE the LLM call to reject
 * obvious prompt injection and harmful content without spending tokens.
 *
 * This is a lightweight first line of defense. The hardened system prompt
 * is the second line. Neither is perfect alone; together they cover most abuse.
 */

interface FilterResult {
  allowed: boolean;
  reason?: string; // shown to user
}

// ── Prompt injection patterns ──────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions|rules|prompts?|guidelines|directives)/i,
  /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|prompts?)/i,
  /forget\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|context)/i,

  // Role hijacking
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /pretend\s+(you\s+are|to\s+be|you're)\s+/i,
  /act\s+as\s+(a|an|if\s+you\s+were)\s+/i,
  /from\s+now\s+on,?\s+you\s+(are|will|must|should)\s+/i,
  /new\s+(instructions?|rules?|persona|identity|role)\s*:/i,

  // System prompt extraction
  /((show|reveal|repeat|print|output|tell\s+me|display|write)\s+(me\s+)?(the\s+|your\s+)?(system|initial|original|hidden|secret)\s+(prompt|instructions?|message|context))/i,
  /what\s+(is|are)\s+your\s+(system|initial|original)\s+(prompt|instructions?|message)/i,

  // Delimiter / formatting attacks
  /\[\/?(system|INST|SYS)\]/i,
  /<<\s*SYS\s*>>/i,
  /<\|im_start\|>/i,
  /###\s*(system|instruction)/i,

  // Explicit jailbreak language
  /\b(DAN|jailbreak|bypass|override)\b.*\b(mode|filter|restrict|safe)/i,
];

// ── Harmful content patterns ───────────────────────────────────────────────

const HARMFUL_PATTERNS: RegExp[] = [
  // Weapons / explosives / violence
  /how\s+to\s+(make|build|create|construct|assemble)\s+(a\s+)?(bomb|explosive|weapon|poison|drug|meth)/i,
  /\b(synthesize|manufacture)\s+(explosive|narcotic|poison|weapon)/i,

  // CSAM / exploitation
  /\b(child|minor|underage)\b.*\b(sexual|exploit|abuse|porn)/i,

  // Self-harm
  /\b(how\s+to\s+(commit\s+)?suicide|kill\s+myself|end\s+my\s+life)\b/i,
];

// ── Public API ─────────────────────────────────────────────────────────────

export function filterMessage(content: string): FilterResult {
  if (!content || content.trim().length === 0) {
    return { allowed: true };
  }

  // Check prompt injection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        allowed: false,
        reason: 'Your message was flagged as an attempt to manipulate the assistant. Please ask a question about asteroids or near-Earth objects.',
      };
    }
  }

  // Check harmful content
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(content)) {
      return {
        allowed: false,
        reason: 'Your message contains content that is not allowed. This assistant only answers questions about asteroids and space.',
      };
    }
  }

  return { allowed: true };
}
