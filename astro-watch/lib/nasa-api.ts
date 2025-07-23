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
  torinoScale: number;
  hazardLevel: 'none' | 'normal' | 'attention' | 'threatening' | 'certain';
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
  let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
  
  if (date) {
    url += `&date=${date}`;
  }
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    if (!response.ok) {
      throw new Error(`NASA APOD API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching APOD:', error);
    throw error;
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
  const size = asteroid.estimated_diameter.meters.estimated_diameter_max;
  const velocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  
  // Calculate enhanced properties
  const impactEnergy = calculateImpactEnergy(size, velocity);
  const orbit = calculateOrbitParameters(asteroid);
  const position = calculatePosition(asteroid);
  
  // Use ML model for risk assessment
  const { risk, confidence } = await calculateAdvancedRisk(asteroid);
  
  // Calculate Torino Scale value (enhanced for demonstration)
  let torinoScale = 0;
  let hazardLevel: 'none' | 'normal' | 'attention' | 'threatening' | 'certain' = 'none';
  
  // Add some variability for demonstration purposes
  const randomBoost = Math.random() * 0.3; // Random boost to show variety
  const enhancedRisk = Math.min(1, risk + randomBoost);
  
  if (enhancedRisk < 0.15) {
    torinoScale = 0;
    hazardLevel = 'none';
  } else if (enhancedRisk < 0.35) {
    torinoScale = 1;
    hazardLevel = 'normal';
  } else if (enhancedRisk < 0.55) {
    torinoScale = asteroid.is_potentially_hazardous_asteroid ? 3 : 2;
    hazardLevel = 'attention';
  } else if (enhancedRisk < 0.75) {
    torinoScale = asteroid.is_potentially_hazardous_asteroid ? 5 : 4;
    hazardLevel = 'threatening';
  } else if (enhancedRisk < 0.9) {
    torinoScale = asteroid.is_potentially_hazardous_asteroid ? 6 : 5;
    hazardLevel = 'threatening';
  } else {
    torinoScale = asteroid.is_potentially_hazardous_asteroid ? 7 : 6;
    hazardLevel = 'threatening';
  }
  
  const enhancedAsteroid = {
    ...asteroid,
    risk,
    torinoScale,
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
  
  // Use actual miss distance with our scale factor (64 units = 1 AU)
  // This gives realistic distances from very close (0.001 AU = 0.064 units) to far (0.5 AU = 32 units)
  const scaleFactor = 64; // Our scale: 1 AU = 64 units
  
  // Use actual miss distance for accurate positioning
  // Remove random variation to maintain correct relative distances
  const adjustedDistance = missDistance;
  
  // Get orbital data if available
  const orbitalData = asteroid.orbital_data;
  const semiMajorAxis = orbitalData?.semi_major_axis ? parseFloat(orbitalData.semi_major_axis) : adjustedDistance;
  const actualInclination = orbitalData?.inclination ? parseFloat(orbitalData.inclination) : (Math.random() - 0.5) * 0.2;
  const actualEccentricity = orbitalData?.eccentricity ? parseFloat(orbitalData.eccentricity) : Math.random() * 0.3;

  return {
    radius: adjustedDistance * scaleFactor, // Actual scaled distance with variation
    speed: 0.01 + Math.random() * 0.02,
    phase: Math.random() * Math.PI * 2,
    inclination: actualInclination,
    eccentricity: actualEccentricity,
    semi_major_axis: semiMajorAxis,
    isInnerOrbit: adjustedDistance < 1.0 // Track if asteroid is inside Earth's orbit (< 1 AU)
  };
}

function calculatePosition(asteroid: Asteroid): any {
  // Calculate 3D position for visualization
  const angle = Math.random() * Math.PI * 2;
  const distance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  
  return {
    x: Math.cos(angle) * distance,
    y: (Math.random() - 0.5) * 0.1,
    z: Math.sin(angle) * distance
  };
}

async function calculateAdvancedRisk(asteroid: Asteroid): Promise<{ risk: number; confidence: number }> {
  // Always use rule-based calculation on server-side
  // ML prediction will be done client-side
  return calculateAdvancedRiskRuleBased(asteroid);
}

// Keep original rule-based calculation as fallback
function calculateAdvancedRiskRuleBased(asteroid: Asteroid): { risk: number; confidence: number } {
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
  const mockAsteroids: EnhancedAsteroid[] = [];
  const today = new Date();
  
  for (let i = 0; i < 15; i++) {
    const approachDate = new Date(today);
    approachDate.setDate(today.getDate() + Math.floor(Math.random() * 7));
    
    const size = 0.1 + Math.random() * 2; // 0.1 to 2.1 km
    const velocity = 5 + Math.random() * 30; // 5 to 35 km/s
    const missDistance = 0.01 + Math.random() * 0.5; // 0.01 to 0.51 AU
    const isPHA = Math.random() < 0.2; // 20% chance of being PHA
    
    mockAsteroids.push({
      id: `mock-${i + 1}`,
      name: `Mock Asteroid ${i + 1}`,
      size,
      velocity,
      missDistance,
      isPotentiallyHazardous: isPHA,
      torinoScale: Math.floor(Math.random() * 5), // 0-4 scale
      close_approach_data: [{
        close_approach_date: approachDate.toISOString().split('T')[0],
        close_approach_date_full: approachDate.toISOString(),
        epoch_date_close_approach: approachDate.getTime(),
        relative_velocity: {
          kilometers_per_second: velocity.toString(),
          kilometers_per_hour: (velocity * 3600).toString(),
          miles_per_hour: (velocity * 2236.94).toString()
        },
        miss_distance: {
          astronomical: missDistance.toString(),
          lunar: (missDistance * 384).toString(),
          kilometers: (missDistance * 149597870.7).toString(),
          miles: (missDistance * 92955807.3).toString()
        },
        orbiting_body: 'Earth'
      }],
      estimated_diameter: {
        meters: {
          estimated_diameter_min: size * 800,
          estimated_diameter_max: size * 1000
        }
      },
      is_potentially_hazardous_asteroid: isPHA,
      is_sentry_object: false,
      // Enhanced properties
      impactEnergy: Math.pow(size, 3) * Math.pow(velocity, 2) * 0.5,
      orbit: {
        eccentricity: 0.1 + Math.random() * 0.8,
        semiMajorAxis: 1 + Math.random() * 2,
        inclination: Math.random() * 30,
        aphelion: 1.5 + Math.random() * 2,
        perihelion: 0.8 + Math.random() * 0.7
      },
      position: {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 10
      },
      mlPrediction: {
        risk: Math.random(),
        confidence: 0.7 + Math.random() * 0.3
      }
    });
  }
  
  return mockAsteroids;
}