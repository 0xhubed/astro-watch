export interface APOD {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
  copyright?: string;
}

export interface Asteroid {
  id: string;
  name: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  close_approach_data: Array<{
    close_approach_date: string;
    relative_velocity: {
      kilometers_per_second: string;
    };
    miss_distance: {
      astronomical: string;
      kilometers: string;
    };
  }>;
  is_potentially_hazardous_asteroid: boolean;
  orbital_data?: {
    eccentricity: string;
    inclination: string;
    semi_major_axis: string;
    ascending_node_longitude: string;
    perihelion_argument: string;
  };
}

export interface EnhancedAsteroid extends Asteroid {
  risk: number;
  rarity: number;
  hazardLevel: 'none' | 'normal' | 'noteworthy' | 'rare' | 'exceptional';
  confidence: number;
  size: number;
  velocity: number;
  missDistance: number;
  impactEnergy: number;
  orbit: {
    radius: number;
    speed: number;
    phase: number;
    inclination: number;
    eccentricity: number;
    semi_major_axis: number;
    isInnerOrbit?: boolean;
    ascendingNode: number;
    perihelionArgument: number;
  };
  moonCollisionData: {
    probability: number;              // 0-1 probability
    confidence: number;               // Assessment confidence
    impactVelocity: number;          // km/s
    impactEnergy: number;            // Joules
    craterDiameter: number;          // meters
    observableFromEarth: boolean;    // Visible impact flash
    closestMoonApproach: number;     // AU
    moonEncounterDate?: string;      // ISO date string
    comparisonToEarth: {
      earthProbability: number;
      moonToEarthRatio: number;
      interpretation: string;
    };
  };
}

const NASA_API_KEY = process.env.NASA_API_KEY;
const BASE_URL = 'https://api.nasa.gov/neo/rest/v1';

/** NASA's API currently serves this stub when real content is missing. */
const APOD_PLACEHOLDER_MARKER = 'nasa-logo@2x';

function isApodPlaceholder(apod: APOD): boolean {
  return (apod.url || '').includes(APOD_PLACEHOLDER_MARKER);
}

/**
 * Fallback when the APOD API only serves placeholders (during outages it
 * returns the NASA Science logo for every date, archive included). NASA has
 * migrated APOD to science.nasa.gov — the old apod.nasa.gov pages now just
 * redirect there. The landing page lists recent entries; each article page
 * carries og: meta with the real image and an "Explanation:" section that
 * ends at "Tomorrow's picture".
 */
const APOD_LANDING_URL = 'https://science.nasa.gov/apod/';
const APOD_FETCH_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const APOD_MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function apodUnavailable(step: string, detail?: string | number): Error {
  // The [step] tag lands in the server logs so outages are debuggable;
  // the message keeps "503" for the route's upstream-outage mapping.
  return new Error(
    `NASA APOD service temporarily unavailable (503) [${step}${detail !== undefined ? ` ${detail}` : ''}]`
  );
}

async function scrapeApodPage(date?: string): Promise<APOD> {
  const landingRes = await fetch(APOD_LANDING_URL, {
    headers: { 'User-Agent': APOD_FETCH_UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(10000),
  });
  if (!landingRes.ok) throw apodUnavailable('landing', landingRes.status);
  const landing = await landingRes.text();

  const articleLinks = Array.from(
    landing.matchAll(/href="(https:\/\/science\.nasa\.gov\/image-article\/apod-[^"]+)"/g),
    m => m[1]
  );
  let articleUrl = articleLinks[0]; // featured entry = latest picture
  if (!articleUrl) throw apodUnavailable('no article links on landing page');

  if (date) {
    const [y, m, d] = date.split('-');
    const needle = `apod-${y}-${APOD_MONTHS[Number(m) - 1]}-${Number(d)}`;
    const matched = articleLinks.find(link => link.includes(needle));
    if (!matched) {
      // The new NASA site only exposes recent entries; don't silently show
      // a different date than the one asked for.
      throw apodUnavailable('date not in current archive', date);
    }
    articleUrl = matched;
  }

  const articleRes = await fetch(articleUrl, {
    headers: { 'User-Agent': APOD_FETCH_UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(10000),
  });
  if (!articleRes.ok) throw apodUnavailable('article', articleRes.status);
  const html = await articleRes.text();

  const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
  if (!ogImage) throw apodUnavailable('no og:image on article page');
  const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1] ?? '';

  // og:title looks like "APOD: 2026 October 7 - Supernova Remnant Pa 30 - NASA Science"
  const titleMatch = ogTitle.match(/APOD:\s*(\d{4})\s+(\w+)\s+(\d{1,2})\s*-\s*(.*?)\s*(?:-\s*NASA)?\s*$/i);
  let apodDate = date ?? new Date().toISOString().split('T')[0];
  let title = 'Astronomy Picture of the Day';
  if (titleMatch) {
    const parsed = new Date(`${titleMatch[2]} ${titleMatch[3]}, ${titleMatch[1]}`);
    if (!Number.isNaN(parsed.getTime())) apodDate = parsed.toISOString().split('T')[0];
    // The non-greedy capture keeps the "- NASA Science" suffix; drop it.
    title = titleMatch[4].replace(/\s*-\s*NASA Science\s*$/i, '');
  }

  const expRegion = html.match(/Explanation:\s*<\/[^>]+>\s*([\s\S]{0,6000})/i)?.[1] ?? '';
  const explanation = expRegion
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .split(/Tomorrow's picture/i)[0]
    .trim()
    .slice(0, 2500);

  return {
    date: apodDate,
    title,
    url: ogImage,
    explanation,
    media_type: 'image',
    service_version: 'v1',
  };
}

export async function getAPOD(date?: string): Promise<APOD> {
  const apiKey = NASA_API_KEY || 'DEMO_KEY';

  const fetchAPOD = async (d?: string, retries = 1): Promise<APOD> => {
    let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
    if (d) url += `&date=${d}`;
    const response = await fetch(url, {
      next: { revalidate: 86400 }, // Cache for 24 hours
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    if (!response.ok) {
      // Retry once on transient 5xx errors
      if (response.status >= 500 && retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return fetchAPOD(d, retries - 1);
      }
      throw new Error(`NASA APOD API error: ${response.status}`);
    }
    return response.json();
  };

  // 1) The API entry, when it carries real content.
  try {
    const apod = await fetchAPOD(date);
    if (!isApodPlaceholder(apod)) {
      return apod;
    }
  } catch (error) {
    console.error('APOD API fetch failed, trying the official site:', error);
  }

  // 2) science.nasa.gov — the APOD site NASA migrated to, independent of
  //    the (currently placeholder-serving) API.
  try {
    return await scrapeApodPage(date);
  } catch (error) {
    console.error('APOD site scrape failed:', error);
  }

  // 3) Nothing worked — surface an upstream outage so the route answers
  //    503 + Retry-After and the UI shows its retry state instead of a
  //    misleading NASA logo.
  throw new Error('NASA APOD service temporarily unavailable (503)');
}

export async function fetchNEOFeed(startDate: string, endDate: string): Promise<EnhancedAsteroid[]> {
  const url = `${BASE_URL}/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`NASA API error: ${response.status}`);
    }
    
    const data = await response.json();
    const asteroids: Asteroid[] = [];
    
    Object.values(data.near_earth_objects).forEach((dayAsteroids: any) => {
      asteroids.push(...dayAsteroids);
    });

    // Guard the feed: enrichment indexes close_approach_data[0], so drop
    // objects that arrive without approach data instead of throwing (#4).
    const enrichable = asteroids.filter(a =>
      Array.isArray(a.close_approach_data) && a.close_approach_data.length > 0
    );

    // Enhanced processing
    return await Promise.all(enrichable.map(enhanceAsteroidData));
  } catch (error) {
    console.error('Failed to fetch NEO data:', error);
    
    // In development, return mock data instead of throwing
    if (process.env.NODE_ENV === 'development') {
      console.log('Using fallback mock data for development...');
      return generateMockAsteroids();
    }
    
    throw error;
  }
}

export async function enhanceAsteroidData(asteroid: Asteroid): Promise<EnhancedAsteroid> {
  // Use mean diameter — mass ∝ d³ so using max overestimates by 2-3×
  const size = (asteroid.estimated_diameter.meters.estimated_diameter_min + asteroid.estimated_diameter.meters.estimated_diameter_max) / 2;
  const velocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const missDistanceKm = parseFloat(asteroid.close_approach_data[0].miss_distance.kilometers || '0')
    || missDistance * 149597870.7;

  // Calculate enhanced properties
  const impactEnergy = calculateImpactEnergy(size, velocity);
  const orbit = calculateOrbitParameters(asteroid);

  const { risk, confidence } = calculateRiskScore(asteroid);

  // Calculate close-approach rarity (Farnocchia & Chodas 2021)
  const { calculateRarity, diameterToH } = await import('./rarity');
  const H = asteroid.absolute_magnitude_h ?? diameterToH(size / 1000);
  const rarity = calculateRarity(H, missDistanceKm);

  let hazardLevel: EnhancedAsteroid['hazardLevel'] = 'none';
  if (rarity >= 6) hazardLevel = 'exceptional';
  else if (rarity >= 4) hazardLevel = 'rare';
  else if (rarity >= 2) hazardLevel = 'noteworthy';
  else if (rarity >= 1) hazardLevel = 'normal';

  const enhancedAsteroid = {
    ...asteroid,
    risk,
    rarity,
    hazardLevel,
    confidence,
    size,
    velocity,
    missDistance,
    impactEnergy,
    orbit,
    moonCollisionData: {
      probability: 0,
      confidence: 0,
      impactVelocity: 0,
      impactEnergy: 0,
      craterDiameter: 0,
      observableFromEarth: false,
      closestMoonApproach: 0,
      comparisonToEarth: {
        earthProbability: 0,
        moonToEarthRatio: 0,
        interpretation: ''
      }
    }
  };
  
  // Add Moon collision assessment
  const { calculateMoonCollisionRisk } = await import('./moon-collision-assessment');
  const moonCollisionData = calculateMoonCollisionRisk(enhancedAsteroid);
  
  return {
    ...enhancedAsteroid,
    moonCollisionData
  };
}

function calculateImpactEnergy(size: number, velocity: number): number {
  const mass = (4/3) * Math.PI * Math.pow(size/2, 3) * 2000; // kg, assuming 2000 kg/m³ density
  const velocityMs = velocity * 1000; // km/s to m/s
  return 0.5 * mass * velocityMs * velocityMs;
}

/** Deterministic [0,1) hash of a string — same asteroid, same scene (#33). */
function hashSeed(id: string): number {
  let h = 1779033703 ^ id.length;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
}

interface OrbitParameters {
  radius: number;
  /** Mean motion in rad/s of scene time, Kepler-consistent (n = 0.2/a^1.5). */
  speed: number;
  /** Mean anomaly at t=0 (rad) — deterministic per asteroid. */
  phase: number;
  /** Radians at ingest — convert to degrees where displayed. */
  inclination: number;
  eccentricity: number;
  semi_major_axis: number;
  isInnerOrbit: boolean;
  /** Longitude of the ascending node (rad). */
  ascendingNode: number;
  /** Argument of perihelion (rad). */
  perihelionArgument: number;
}

function calculateOrbitParameters(asteroid: Asteroid): OrbitParameters {
  // Calculate orbital parameters for visualization
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const scaleFactor = 64; // Our scale: 1 AU = 64 units

  // Get orbital data if available
  const orbitalData = asteroid.orbital_data;
  // Angles are stored in RADIANS; NASA publishes degrees (#8).
  const actualInclination = orbitalData?.inclination
    ? parseFloat(orbitalData.inclination) * (Math.PI / 180)
    : (hashSeed(asteroid.id + ':incl') - 0.5) * 0.2;
  const actualEccentricity = orbitalData?.eccentricity
    ? parseFloat(orbitalData.eccentricity)
    : hashSeed(asteroid.id + ':ecc') * 0.3;
  const ascendingNode = orbitalData?.ascending_node_longitude
    ? parseFloat(orbitalData.ascending_node_longitude) * (Math.PI / 180)
    : hashSeed(asteroid.id + ':node') * Math.PI * 2;
  const perihelionArgument = orbitalData?.perihelion_argument
    ? parseFloat(orbitalData.perihelion_argument) * (Math.PI / 180)
    : hashSeed(asteroid.id + ':arg') * Math.PI * 2;

  // Use the asteroid's actual semi-major axis for its orbital radius around the Sun.
  // The miss distance is the closest approach to Earth, NOT the distance from the Sun.
  // Most NEOs have semi-major axes of 0.9–3.5 AU, placing them near/between
  // Earth (1 AU = 64 units) and Mars (1.52 AU = 97 units).
  // Fallback: place near Earth's orbit offset by miss distance.
  const semiMajorAxis = orbitalData?.semi_major_axis
    ? parseFloat(orbitalData.semi_major_axis)
    : 1.0 + missDistance; // fallback: just outside Earth's orbit

  return {
    radius: semiMajorAxis * scaleFactor,
    // Kepler's third law, anchored to the scene's Earth drive rate so inner
    // rocks visibly outrun outer ones (meanMotion() in lib/orbit-mechanics).
    speed: 0.2 / Math.pow(Math.max(0.1, semiMajorAxis), 1.5),
    phase: hashSeed(asteroid.id + ':phase') * Math.PI * 2,
    inclination: actualInclination,
    eccentricity: actualEccentricity,
    semi_major_axis: semiMajorAxis,
    isInnerOrbit: semiMajorAxis < 1.0,
    ascendingNode,
    perihelionArgument
  };
}

function calculateRiskScore(asteroid: Asteroid): { risk: number; confidence: number } {
  const size = asteroid.estimated_diameter.meters.estimated_diameter_max;
  const velocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const isPHA = asteroid.is_potentially_hazardous_asteroid;
  
  // Risk = how close it comes (proximity) gated against how concerning the
  // object intrinsically is (severity). A large, fast asteroid that misses by
  // a wide margin is not a risk, so distance must gate the whole score rather
  // than contribute as one additive term.

  // Intrinsic severity factors (how bad it would be if on a collision course)
  const sizeFactor = Math.min(1, Math.log10(size + 1) / 3); // log scale, normalized
  const velocityFactor = Math.min(1, velocity / 30); // 30 km/s is very fast
  const phaFactor = isPHA ? 1 : 0;

  const severity =
    sizeFactor * 0.5 +
    velocityFactor * 0.3 +
    phaFactor * 0.2;

  // Proximity gates the whole score. 0.05 AU (~19.5 lunar distances, the PHA
  // close-approach threshold) is the e-folding scale, so risk decays smoothly
  // with distance instead of hard-cutting to zero at 0.05 AU.
  const proximityFactor = Math.exp(-missDistance / 0.05);

  const riskScore = Math.min(1, proximityFactor * severity);
  
  // Confidence based on data quality and distance
  const confidence = missDistance < 0.1 ? 0.95 : 0.75 + (0.2 * (1 - missDistance));
  
  return {
    risk: riskScore,
    confidence: Math.min(0.99, confidence)
  };
}

// Mock data generator for development fallback
function generateMockAsteroids(): EnhancedAsteroid[] {
  const { calculateRarity, diameterToH } = require('./rarity');
  const mockAsteroids: EnhancedAsteroid[] = [];
  const today = new Date();

  for (let i = 0; i < 15; i++) {
    const approachDate = new Date(today);
    approachDate.setDate(today.getDate() + Math.floor(Math.random() * 7));

    const size = 0.1 + Math.random() * 2; // 0.1 to 2.1 km
    const velocity = 5 + Math.random() * 30; // 5 to 35 km/s
    const missDistance = 0.01 + Math.random() * 0.5; // 0.01 to 0.51 AU
    const missDistanceKm = missDistance * 149597870.7;
    const isPHA = Math.random() < 0.2;
    const H = diameterToH(size);
    const rarity = calculateRarity(H, missDistanceKm);

    let hazardLevel: EnhancedAsteroid['hazardLevel'] = 'none';
    if (rarity >= 6) hazardLevel = 'exceptional';
    else if (rarity >= 4) hazardLevel = 'rare';
    else if (rarity >= 2) hazardLevel = 'noteworthy';
    else if (rarity >= 1) hazardLevel = 'normal';

    mockAsteroids.push({
      id: `mock-${i + 1}`,
      name: `Mock Asteroid ${i + 1}`,
      absolute_magnitude_h: H,
      close_approach_data: [{
        close_approach_date: approachDate.toISOString().split('T')[0],
        relative_velocity: {
          kilometers_per_second: velocity.toString()
        },
        miss_distance: {
          astronomical: missDistance.toString(),
          kilometers: missDistanceKm.toString()
        }
      }],
      estimated_diameter: {
        meters: {
          estimated_diameter_min: size * 800,
          estimated_diameter_max: size * 1000
        }
      },
      is_potentially_hazardous_asteroid: isPHA,
      orbital_data: {
        eccentricity: (0.1 + Math.random() * 0.8).toString(),
        inclination: (Math.random() * 30).toString(),
        semi_major_axis: (1 + Math.random() * 2).toString(),
        ascending_node_longitude: (Math.random() * 360).toString(),
        perihelion_argument: (Math.random() * 360).toString()
      },risk: Math.random(),
      rarity,
      hazardLevel,
      confidence: 0.7 + Math.random() * 0.3,
      size,
      velocity,
      missDistance,
      impactEnergy: Math.pow(size, 3) * Math.pow(velocity, 2) * 0.5,
      orbit: {
        radius: (1 + Math.random() * 2) * 64, // semi-major axis * scale factor
        speed: 0.2 / Math.pow(1 + Math.random() * 2, 1.5),
        phase: Math.random() * Math.PI * 2,
        inclination: Math.random() * 0.5, // radians, matching real ingest
        eccentricity: 0.1 + Math.random() * 0.8,
        semi_major_axis: 1 + Math.random() * 2,
        isInnerOrbit: false,
        ascendingNode: Math.random() * Math.PI * 2,
        perihelionArgument: Math.random() * Math.PI * 2
      },
      moonCollisionData: {
        probability: Math.random() * 0.1,
        confidence: 0.7 + Math.random() * 0.3,
        impactVelocity: velocity + Math.random() * 5,
        impactEnergy: Math.pow(size, 3) * Math.pow(velocity, 2) * 0.3,
        craterDiameter: size * 10 + Math.random() * 50,
        observableFromEarth: Math.random() > 0.5,
        closestMoonApproach: missDistance + Math.random() * 0.1,
        moonEncounterDate: approachDate.toISOString(),
        comparisonToEarth: {
          earthProbability: Math.random() * 0.05,
          moonToEarthRatio: 1 + Math.random() * 3,
          interpretation: 'Low risk assessment based on trajectory analysis'
        }
      }
    });
  }

  return mockAsteroids;
}