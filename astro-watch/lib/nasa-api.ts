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
  };
  position: {
    x: number;
    y: number;
    z: number;
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

export async function getAPOD(date?: string): Promise<APOD> {
  const apiKey = NASA_API_KEY || 'DEMO_KEY';

  const fetchAPOD = async (d?: string) => {
    let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
    if (d) url += `&date=${d}`;
    const response = await fetch(url, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    if (!response.ok) {
      throw new Error(`NASA APOD API error: ${response.status}`);
    }
    return response.json();
  };

  try {
    return await fetchAPOD(date);
  } catch (error) {
    // NASA APOD often 500s for today's date before the image is published;
    // fall back to yesterday
    const requestDate = date || new Date().toISOString().split('T')[0];
    const yesterday = new Date(requestDate + 'T00:00:00');
    yesterday.setDate(yesterday.getDate() - 1);
    const fallbackDate = yesterday.toISOString().split('T')[0];

    try {
      return await fetchAPOD(fallbackDate);
    } catch {
      console.error('Error fetching APOD (including fallback):', error);
      throw error;
    }
  }
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
    
    // Enhanced processing
    return await Promise.all(asteroids.map(enhanceAsteroidData));
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
  const position = calculatePosition(asteroid);

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
    position,
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

function calculateOrbitParameters(asteroid: Asteroid): any {
  // Calculate orbital parameters for visualization
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const scaleFactor = 64; // Our scale: 1 AU = 64 units

  // Get orbital data if available
  const orbitalData = asteroid.orbital_data;
  const actualInclination = orbitalData?.inclination ? parseFloat(orbitalData.inclination) : (Math.random() - 0.5) * 0.2;
  const actualEccentricity = orbitalData?.eccentricity ? parseFloat(orbitalData.eccentricity) : Math.random() * 0.3;

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
    speed: 0.01 + Math.random() * 0.02,
    phase: Math.random() * Math.PI * 2,
    inclination: actualInclination,
    eccentricity: actualEccentricity,
    semi_major_axis: semiMajorAxis,
    isInnerOrbit: semiMajorAxis < 1.0
  };
}

function calculatePosition(asteroid: Asteroid): any {
  // Calculate 3D position for visualization using semi-major axis (distance from Sun)
  const angle = Math.random() * Math.PI * 2;
  const orbitalData = asteroid.orbital_data;
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const semiMajorAxis = orbitalData?.semi_major_axis
    ? parseFloat(orbitalData.semi_major_axis)
    : 1.0 + missDistance;

  return {
    x: Math.cos(angle) * semiMajorAxis,
    y: (Math.random() - 0.5) * 0.1,
    z: Math.sin(angle) * semiMajorAxis
  };
}

function calculateRiskScore(asteroid: Asteroid): { risk: number; confidence: number } {
  const size = asteroid.estimated_diameter.meters.estimated_diameter_max;
  const velocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const isPHA = asteroid.is_potentially_hazardous_asteroid;
  
  // More realistic risk calculation based on actual parameters
  // Size factor (larger = more dangerous)
  const sizeFactor = Math.min(1, Math.log10(size + 1) / 3); // log scale, normalized
  
  // Distance factor (closer = more dangerous)
  // 1 AU = Earth-Sun distance, 0.05 AU is about 19.5 lunar distances
  const distanceFactor = missDistance < 0.05 ? 1 - (missDistance / 0.05) : 0;
  
  // Velocity factor (faster = more dangerous)
  const velocityFactor = Math.min(1, velocity / 30); // 30 km/s is very fast
  
  // PHA designation adds base risk
  const phaFactor = isPHA ? 0.3 : 0;
  
  // Weighted risk calculation
  const riskScore = Math.min(1, 
    sizeFactor * 0.25 + 
    distanceFactor * 0.4 + 
    velocityFactor * 0.15 + 
    phaFactor * 0.2
  );
  
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
      },
      risk: Math.random(),
      rarity,
      hazardLevel,
      confidence: 0.7 + Math.random() * 0.3,
      size,
      velocity,
      missDistance,
      impactEnergy: Math.pow(size, 3) * Math.pow(velocity, 2) * 0.5,
      orbit: {
        radius: (1 + Math.random() * 2) * 64, // semi-major axis * scale factor
        speed: velocity,
        phase: Math.random() * Math.PI * 2,
        inclination: Math.random() * 30,
        eccentricity: 0.1 + Math.random() * 0.8,
        semi_major_axis: 1 + Math.random() * 2,
        isInnerOrbit: false
      },
      position: {
        x: (Math.random() - 0.5) * 3,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 3
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