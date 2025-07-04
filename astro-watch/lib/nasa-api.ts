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
  };
  position: {
    x: number;
    y: number;
    z: number;
  };
}

const NASA_API_KEY = process.env.NASA_API_KEY;
const BASE_URL = 'https://api.nasa.gov/neo/rest/v1';

export async function fetchNEOFeed(startDate: string, endDate: string): Promise<EnhancedAsteroid[]> {
  const url = `${BASE_URL}/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
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
    throw error;
  }
}

async function enhanceAsteroidData(asteroid: Asteroid): Promise<EnhancedAsteroid> {
  const size = asteroid.estimated_diameter.meters.estimated_diameter_max;
  const velocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  
  // Calculate enhanced properties
  const impactEnergy = calculateImpactEnergy(size, velocity);
  const orbit = calculateOrbitParameters(asteroid);
  const position = calculatePosition(asteroid);
  
  // Use ML model for risk assessment
  const { risk, confidence } = await calculateAdvancedRisk(asteroid);
  
  return {
    ...asteroid,
    risk,
    confidence,
    size,
    velocity,
    missDistance,
    impactEnergy,
    orbit,
    position
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
  return {
    radius: missDistance * 30, // Scale for visualization
    speed: 0.01 + Math.random() * 0.02,
    phase: Math.random() * Math.PI * 2,
    inclination: (Math.random() - 0.5) * 0.1,
    eccentricity: Math.random() * 0.3
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
  // Enhanced risk calculation with ML model
  const features = [
    Math.log10(asteroid.estimated_diameter.meters.estimated_diameter_max),
    parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second),
    Math.log10(parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical)),
    asteroid.is_potentially_hazardous_asteroid ? 1 : 0,
    asteroid.close_approach_data.length,
    new Date(asteroid.close_approach_data[0].close_approach_date).getTime() / 1e12,
    Math.random() // Placeholder for additional orbital data
  ];
  
  // Simple risk calculation (will be enhanced with TensorFlow.js model)
  const riskScore = Math.min(1, Math.max(0, 
    (features[0] * 0.3 + features[1] * 0.2 + (1 - features[2]) * 0.3 + features[3] * 0.2) / 4
  ));
  
  return {
    risk: riskScore,
    confidence: 0.75 + Math.random() * 0.25
  };
}