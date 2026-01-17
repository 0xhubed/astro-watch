/**
 * Get Risk Analysis Tool
 * Detailed risk analysis with Torino scale and impact scenarios
 */

import type { ToolFunction } from '../../llm/types';
import type {
  ToolContext,
  ToolResult,
  RiskAnalysisResult,
  Citation,
} from '../types';
import type { EnhancedAsteroid } from '../../nasa-api';

export const GET_RISK_ANALYSIS_SCHEMA: ToolFunction['parameters'] = {
  type: 'object',
  properties: {
    asteroidId: {
      type: 'string',
      description: 'The asteroid ID to analyze',
    },
  },
  required: ['asteroidId'],
};

interface RiskArgs {
  asteroidId: string;
}

// Torino scale descriptions
const TORINO_DESCRIPTIONS: Record<number, { description: string; color: string }> = {
  0: {
    description: 'No hazard. The likelihood of a collision is zero, or is so low as to be effectively zero.',
    color: '#FFFFFF',
  },
  1: {
    description: 'Normal. A routine discovery, meriting careful monitoring but no concern.',
    color: '#00FF00',
  },
  2: {
    description: 'Meriting attention. A somewhat close but not unusual encounter. Attention by astronomers is merited.',
    color: '#FFFF00',
  },
  3: {
    description: 'Meriting attention. A close encounter with 1% or greater chance of collision capable of localized destruction.',
    color: '#FFFF00',
  },
  4: {
    description: 'Meriting attention. A close encounter with 1% or greater chance of regional devastation.',
    color: '#FFFF00',
  },
  5: {
    description: 'Threatening. A close encounter posing serious but uncertain threat of regional devastation.',
    color: '#FFA500',
  },
  6: {
    description: 'Threatening. A close encounter by large object posing serious but uncertain threat of global catastrophe.',
    color: '#FFA500',
  },
  7: {
    description: 'Threatening. A very close encounter with serious threat of global catastrophe.',
    color: '#FFA500',
  },
  8: {
    description: 'Certain collision. Collision capable of localized destruction is certain.',
    color: '#FF0000',
  },
  9: {
    description: 'Certain collision. Collision capable of regional devastation is certain.',
    color: '#FF0000',
  },
  10: {
    description: 'Certain collision. Collision capable of global climatic catastrophe is certain.',
    color: '#FF0000',
  },
};

export async function getRiskAnalysis(
  args: RiskArgs,
  context: ToolContext
): Promise<ToolResult<RiskAnalysisResult>> {
  const { asteroidId } = args;

  // Find the asteroid
  const asteroid = context.asteroids.find(
    (a) =>
      a.id === asteroidId ||
      a.id.toLowerCase() === asteroidId.toLowerCase() ||
      a.name.toLowerCase().includes(asteroidId.toLowerCase())
  );

  if (!asteroid) {
    return {
      success: false,
      error: `Asteroid not found: ${asteroidId}`,
    };
  }

  // Get Torino scale info
  const torinoValue = asteroid.torinoScale ?? 0;
  const torinoInfo = TORINO_DESCRIPTIONS[torinoValue] ?? TORINO_DESCRIPTIONS[0];

  // Calculate Palermo scale (simplified)
  const palermoScale = calculatePalermoScale(asteroid);

  // Generate impact scenarios
  const impactScenarios = generateImpactScenarios(asteroid);

  // Calculate mitigation window if applicable
  const mitigationWindow =
    torinoValue >= 4 ? calculateMitigationWindow(asteroid) : undefined;

  // Generate summary
  const summary = generateSummary(asteroid, torinoValue, palermoScale, impactScenarios);

  // Citations
  const citations: Citation[] = [
    {
      id: `cite_risk_${asteroid.id}`,
      text: `Risk analysis for ${asteroid.name}`,
      source: 'calculation',
      asteroidId: asteroid.id,
      asteroidName: asteroid.name,
    },
  ];

  return {
    success: true,
    data: {
      asteroid,
      torinoScale: {
        value: torinoValue,
        description: torinoInfo.description,
        color: torinoInfo.color,
      },
      palermoScale,
      impactScenarios,
      mitigationWindow,
      summary,
    },
    citations,
  };
}

function calculatePalermoScale(asteroid: EnhancedAsteroid): number {
  // Simplified Palermo scale calculation
  // PS = log10(Pi) - log10(fB * T)
  // Where Pi = impact probability, fB = background frequency, T = time interval

  const risk = asteroid.risk ?? 0;
  if (risk === 0) return -10;

  // Estimate background impact frequency based on size
  const size = asteroid.size ?? 50;
  const fB = Math.pow(10, -4.5 - 0.8 * Math.log10(size / 10));

  // Assume 100-year time interval
  const T = 100;

  const palermo = Math.log10(risk) - Math.log10(fB * T);

  return Math.max(-10, Math.min(2, palermo));
}

function generateImpactScenarios(
  asteroid: EnhancedAsteroid
): RiskAnalysisResult['impactScenarios'] {
  const scenarios: RiskAnalysisResult['impactScenarios'] = [];
  const size = asteroid.size ?? 50;
  const velocity = asteroid.velocity ?? 15;
  const risk = asteroid.risk ?? 0;

  // Calculate kinetic energy (joules)
  // KE = 0.5 * m * v^2
  // Assuming density of 2000 kg/m^3 (typical for S-type asteroid)
  const volume = (4 / 3) * Math.PI * Math.pow(size / 2, 3);
  const mass = volume * 2000;
  const velocityMs = velocity * 1000;
  const kineticEnergy = 0.5 * mass * velocityMs * velocityMs;

  // Convert to megatons TNT (1 MT = 4.184e15 joules)
  const energyMT = kineticEnergy / 4.184e15;

  // Crater diameter (simplified formula)
  const craterDiameter = 1.8 * Math.pow(energyMT, 0.3) * 1000; // meters

  // Scenario 1: Land impact
  if (size > 10) {
    scenarios.push({
      probability: risk * 0.29, // 29% of Earth is land
      energy: kineticEnergy,
      craterDiameter: craterDiameter,
      description: generateLandImpactDescription(size, energyMT, craterDiameter),
    });
  }

  // Scenario 2: Ocean impact
  if (size > 30) {
    const tsunamiHeight = estimateTsunamiHeight(size, velocity);
    scenarios.push({
      probability: risk * 0.71, // 71% of Earth is ocean
      energy: kineticEnergy,
      tsunamiHeight,
      description: generateOceanImpactDescription(size, energyMT, tsunamiHeight),
    });
  }

  // Scenario 3: Airburst (for smaller objects)
  if (size < 100) {
    scenarios.push({
      probability: risk * 0.5,
      energy: kineticEnergy * 0.3, // Partial energy release in atmosphere
      affectedArea: Math.PI * Math.pow(size * 10, 2) / 1e6, // km^2
      description: generateAirburstDescription(size, energyMT),
    });
  }

  return scenarios;
}

function estimateTsunamiHeight(size: number, velocity: number): number {
  // Very simplified tsunami height estimation
  // Based on energy and ocean depth
  const energyFactor = size * velocity / 1000;
  return Math.min(100, Math.max(0.1, energyFactor * 0.5));
}

function generateLandImpactDescription(
  size: number,
  energyMT: number,
  craterDiameter: number
): string {
  if (energyMT < 0.001) {
    return `Small meteorite impact. Minor local damage. Crater ~${craterDiameter.toFixed(0)}m.`;
  } else if (energyMT < 1) {
    return `Regional impact event (~${(energyMT * 1000).toFixed(0)} kilotons). ` +
      `Could cause significant local destruction. Crater ~${(craterDiameter / 1000).toFixed(2)}km.`;
  } else if (energyMT < 100) {
    return `Major impact event (~${energyMT.toFixed(0)} megatons). ` +
      `City-destroying potential. Crater ~${(craterDiameter / 1000).toFixed(1)}km diameter.`;
  } else {
    return `Extinction-level impact (~${energyMT.toFixed(0)} megatons). ` +
      `Global consequences including climate effects. Crater ~${(craterDiameter / 1000).toFixed(0)}km.`;
  }
}

function generateOceanImpactDescription(
  size: number,
  energyMT: number,
  tsunamiHeight: number
): string {
  if (tsunamiHeight < 1) {
    return `Ocean impact would generate minor waves (${tsunamiHeight.toFixed(1)}m). Limited coastal effect.`;
  } else if (tsunamiHeight < 10) {
    return `Ocean impact would generate significant tsunami (~${tsunamiHeight.toFixed(0)}m). ` +
      `Coastal evacuation would be necessary within hundreds of kilometers.`;
  } else {
    return `Ocean impact would generate devastating tsunami (~${tsunamiHeight.toFixed(0)}m). ` +
      `Major coastal destruction across entire ocean basin.`;
  }
}

function generateAirburstDescription(size: number, energyMT: number): string {
  if (size < 20) {
    return `Atmospheric breakup likely. Bright fireball visible. ` +
      `Similar to Chelyabinsk 2013 event. Possible window damage from shockwave.`;
  } else if (size < 50) {
    return `Significant airburst (~${(energyMT * 1000).toFixed(0)} kilotons). ` +
      `Comparable to Tunguska 1908 event. Forest devastation over hundreds of km^2.`;
  } else {
    return `Powerful airburst with ground impact. ` +
      `Combined atmospheric and surface destruction over wide area.`;
  }
}

function calculateMitigationWindow(
  asteroid: EnhancedAsteroid
): RiskAnalysisResult['mitigationWindow'] {
  // Get closest approach date
  const approachDate = asteroid.close_approach_data?.[0]?.close_approach_date
    ? new Date(asteroid.close_approach_data[0].close_approach_date)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const now = new Date();
  const daysUntilApproach = Math.max(
    0,
    (approachDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Mission requires years of lead time
  const earliestDate = new Date(now);
  earliestDate.setFullYear(earliestDate.getFullYear() + 2);

  // Latest date: need at least 1 year before approach
  const latestDate = new Date(approachDate);
  latestDate.setFullYear(latestDate.getFullYear() - 1);

  // Delta-V required (simplified, based on size)
  const size = asteroid.size ?? 50;
  const mass = (4 / 3) * Math.PI * Math.pow(size / 2, 3) * 2000;
  const deltaVRequired = Math.max(0.001, 1000 / Math.sqrt(mass) * 0.01); // cm/s

  return {
    earliestDate,
    latestDate,
    deltaVRequired,
  };
}

function generateSummary(
  asteroid: EnhancedAsteroid,
  torinoValue: number,
  palermoScale: number,
  scenarios: RiskAnalysisResult['impactScenarios']
): string {
  const lines: string[] = [];

  lines.push(`**Risk Analysis Summary: ${asteroid.name}**`);
  lines.push('');

  // Overall assessment
  if (torinoValue === 0) {
    lines.push('**Assessment: No Hazard**');
    lines.push('This asteroid poses no threat to Earth.');
  } else if (torinoValue <= 2) {
    lines.push('**Assessment: Routine Monitoring**');
    lines.push('This asteroid merits standard tracking but poses minimal concern.');
  } else if (torinoValue <= 4) {
    lines.push('**Assessment: Elevated Attention**');
    lines.push('This asteroid warrants close observation by astronomers.');
  } else if (torinoValue <= 7) {
    lines.push('**Assessment: Significant Concern**');
    lines.push('This asteroid poses a potential threat requiring government attention.');
  } else {
    lines.push('**Assessment: IMPACT LIKELY/CERTAIN**');
    lines.push('Immediate action required. International coordination necessary.');
  }

  lines.push('');
  lines.push('**Key Metrics:**');
  lines.push(`- Torino Scale: ${torinoValue}/10`);
  lines.push(`- Palermo Scale: ${palermoScale.toFixed(2)}`);
  lines.push(`- ML Risk Score: ${((asteroid.risk ?? 0) * 100).toFixed(1)}%`);
  lines.push(`- Size: ${asteroid.size?.toFixed(0) ?? 'unknown'} meters`);
  lines.push(`- Miss Distance: ${asteroid.missDistance?.toFixed(2) ?? 'unknown'} LD`);

  if (scenarios.length > 0) {
    lines.push('');
    lines.push(`**${scenarios.length} Impact Scenario(s) Analyzed**`);
  }

  return lines.join('\n');
}

/**
 * Format risk analysis for display
 */
export function formatRiskAnalysis(result: RiskAnalysisResult): string {
  const lines: string[] = [result.summary, ''];

  lines.push('---');
  lines.push('');
  lines.push('**Torino Scale Assessment:**');
  lines.push(`Level ${result.torinoScale.value}: ${result.torinoScale.description}`);
  lines.push('');

  if (result.impactScenarios.length > 0) {
    lines.push('**Impact Scenarios:**');
    result.impactScenarios.forEach((scenario, idx) => {
      lines.push(`${idx + 1}. ${scenario.description}`);
      lines.push(`   Probability: ${(scenario.probability * 100).toFixed(4)}%`);
      lines.push('');
    });
  }

  if (result.mitigationWindow) {
    lines.push('**Mitigation Window:**');
    lines.push(`- Earliest launch: ${result.mitigationWindow.earliestDate.toISOString().split('T')[0]}`);
    lines.push(`- Latest launch: ${result.mitigationWindow.latestDate.toISOString().split('T')[0]}`);
    lines.push(`- Required delta-V: ${result.mitigationWindow.deltaVRequired.toFixed(3)} cm/s`);
  }

  return lines.join('\n');
}
