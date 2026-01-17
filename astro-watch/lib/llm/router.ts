/**
 * Model Router for AstroWatch Agentic System
 * Routes queries to appropriate model tier based on complexity analysis
 */

import type {
  ModelTier,
  ChatMessage,
  ComplexityAnalysis,
  RoutingDecision,
} from './types';

// Keywords that indicate complexity
const COMPLEX_KEYWORDS = [
  'compare',
  'analyze',
  'explain why',
  'what if',
  'calculate',
  'predict',
  'trajectory',
  'orbital',
  'probability',
  'scenario',
  'multiple',
  'several',
  'relationship',
  'correlation',
  'impact',
  'history',
  'trend',
  'pattern',
];

const SIMPLE_KEYWORDS = [
  'what is',
  'when',
  'where',
  'how many',
  'list',
  'show',
  'name',
  'closest',
  'largest',
  'smallest',
  'today',
  'current',
];

// Complexity thresholds
const FLASH_THINKING_THRESHOLD = 0.65;
const HIGH_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Analyze query complexity to inform model routing
 */
export function analyzeComplexity(messages: ChatMessage[]): ComplexityAnalysis {
  const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
  const query = lastUserMessage?.content.toLowerCase() ?? '';

  const factors = {
    multiStep: false,
    requiresReasoning: false,
    ambiguous: false,
    domainSpecific: false,
    temporalReasoning: false,
  };

  // Check for multi-step indicators
  factors.multiStep =
    query.includes(' and ') ||
    query.includes(' then ') ||
    query.includes('also') ||
    (query.match(/\?/g)?.length ?? 0) > 1 ||
    query.includes('step');

  // Check for reasoning requirements
  factors.requiresReasoning =
    query.includes('why') ||
    query.includes('how does') ||
    query.includes('explain') ||
    query.includes('difference') ||
    COMPLEX_KEYWORDS.some((k) => query.includes(k));

  // Check for ambiguity (short queries or vague references)
  factors.ambiguous =
    query.length < 20 ||
    query.includes('it') ||
    query.includes('that') ||
    query.includes('this');

  // Check for domain-specific complexity
  factors.domainSpecific =
    query.includes('torino') ||
    query.includes('palermo') ||
    query.includes('orbital') ||
    query.includes('trajectory') ||
    query.includes('perihelion') ||
    query.includes('aphelion') ||
    query.includes('eccentricity') ||
    query.includes('kinetic energy');

  // Check for temporal reasoning
  factors.temporalReasoning =
    query.includes('will') ||
    query.includes('next') ||
    query.includes('future') ||
    query.includes('predict') ||
    query.includes('forecast') ||
    query.includes('over time');

  // Calculate complexity score
  let score = 0;
  if (factors.multiStep) score += 0.25;
  if (factors.requiresReasoning) score += 0.3;
  if (factors.ambiguous) score += 0.1;
  if (factors.domainSpecific) score += 0.2;
  if (factors.temporalReasoning) score += 0.25;

  // Reduce score for simple queries
  if (SIMPLE_KEYWORDS.some((k) => query.startsWith(k))) {
    score = Math.max(0, score - 0.2);
  }

  // Consider conversation context
  const conversationLength = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  ).length;
  if (conversationLength > 4) {
    score = Math.min(1, score + 0.1); // Longer conversations may need more context awareness
  }

  // Normalize score to 0-1
  score = Math.min(1, Math.max(0, score));

  return { score, factors };
}

/**
 * Route to appropriate model based on complexity analysis
 */
export function routeModel(
  messages: ChatMessage[],
  forceModel?: ModelTier
): RoutingDecision {
  // Honor explicit model selection
  if (forceModel) {
    return {
      model: forceModel,
      reason: 'Explicitly requested model',
      confidence: 1,
    };
  }

  const analysis = analyzeComplexity(messages);

  // Determine model and reason
  if (analysis.score >= FLASH_THINKING_THRESHOLD) {
    const reasons: string[] = [];
    if (analysis.factors.multiStep) reasons.push('multi-step query');
    if (analysis.factors.requiresReasoning) reasons.push('requires reasoning');
    if (analysis.factors.domainSpecific) reasons.push('domain-specific');
    if (analysis.factors.temporalReasoning) reasons.push('temporal reasoning');

    return {
      model: 'flash-thinking',
      reason: `Complex query: ${reasons.join(', ')}`,
      confidence:
        analysis.score >= HIGH_CONFIDENCE_THRESHOLD
          ? 0.95
          : 0.8,
    };
  }

  return {
    model: 'flash-lite',
    reason: 'Standard query complexity',
    confidence:
      analysis.score <= 0.3
        ? 0.95
        : 0.75,
  };
}

/**
 * Router class for stateful routing with metrics
 */
export class ModelRouter {
  private routingHistory: RoutingDecision[] = [];
  private maxHistory = 1000;

  /**
   * Route a query to the appropriate model
   */
  route(messages: ChatMessage[], forceModel?: ModelTier): RoutingDecision {
    const decision = routeModel(messages, forceModel);

    // Track routing decision
    this.routingHistory.push(decision);
    if (this.routingHistory.length > this.maxHistory) {
      this.routingHistory.shift();
    }

    return decision;
  }

  /**
   * Get routing statistics
   */
  getStats(): {
    total: number;
    flashLite: number;
    flashThinking: number;
    flashLitePercent: number;
  } {
    const total = this.routingHistory.length;
    const flashLite = this.routingHistory.filter(
      (r) => r.model === 'flash-lite'
    ).length;
    const flashThinking = total - flashLite;

    return {
      total,
      flashLite,
      flashThinking,
      flashLitePercent: total > 0 ? (flashLite / total) * 100 : 0,
    };
  }

  /**
   * Reset routing history
   */
  reset(): void {
    this.routingHistory = [];
  }
}

// Singleton router instance
let _router: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!_router) {
    _router = new ModelRouter();
  }
  return _router;
}
