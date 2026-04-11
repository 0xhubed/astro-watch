/**
 * Close-approach rarity metric based on Farnocchia & Chodas (2021).
 *
 * Estimates how many years, on average, pass between close approaches
 * of a given size object at a given distance. Returns an integer 0-7+
 * where higher = rarer.
 *
 * Reference: Farnocchia, D. & Chodas, P. (2021). "Close-approach
 * frequency of near-Earth objects." Icarus, 366, 114585.
 */

// Earth radius no longer needed: NASA miss distances are already geocentric

/**
 * Estimate cumulative NEO population N(>D) using a polynomial fit
 * to the debiased population model (Granvik et al. 2018 + updates).
 *
 * @param H - Absolute magnitude
 * @returns Estimated number of NEOs brighter than H
 */
function cumulativeNEOPopulation(H: number): number {
  // Piecewise power-law fit to the NEO size-frequency distribution
  // log10(N) as a function of H
  if (H <= 17.75) {
    // Large NEOs: well-constrained
    return Math.pow(10, 0.35 * H - 5.3);
  }
  // Smaller NEOs: steeper slope
  return Math.pow(10, 0.46 * H - 7.22);
}

/**
 * Convert absolute magnitude H to diameter in km assuming a geometric albedo.
 *
 * @param H - Absolute magnitude
 * @param albedo - Geometric albedo (default 0.14, typical for S-type)
 * @returns Diameter in km
 */
export function hToDiameter(H: number, albedo = 0.14): number {
  return (1329 / Math.sqrt(albedo)) * Math.pow(10, -0.2 * H);
}

/**
 * Convert diameter in km to absolute magnitude H assuming a geometric albedo.
 * Useful for mock data where H isn't directly available.
 *
 * @param diameter_km - Diameter in km
 * @param albedo - Geometric albedo (default 0.14)
 * @returns Absolute magnitude H
 */
export function diameterToH(diameter_km: number, albedo = 0.14): number {
  return -5 * Math.log10(diameter_km * Math.sqrt(albedo) / 1329);
}

/**
 * Calculate the close-approach rarity score.
 *
 * The rarity R is the base-10 logarithm of the expected interval (in years)
 * between close approaches of NEOs at least as large as the given object
 * passing within the given distance, with gravitational focusing included.
 *
 * @param H - Absolute magnitude of the asteroid
 * @param r_km - Miss distance in km (geocentric)
 * @returns Integer rarity score (0 = routine, 7+ = exceptionally rare)
 */
export function calculateRarity(H: number, r_km: number): number {
  // Step 1: Number of NEOs brighter than H
  const N = cumulativeNEOPopulation(H);
  if (N <= 0) return 0;

  // Step 2: Average NEO encounter velocity with Earth (km/s)
  const v_inf = 18; // typical ~18 km/s

  // Step 3: Gravitational focusing — effective cross-section
  // v_esc at distance r from Earth center
  const GM_EARTH = 3.986e5; // km^3/s^2
  const r_center = r_km; // r_km is already geocentric (NASA API convention)
  const v_esc2 = 2 * GM_EARTH / r_center;
  const v_inf2 = v_inf * v_inf;
  const focusFactor = 1 + v_esc2 / v_inf2;

  // Geometric cross-section in AU^2, then multiply by focusing
  const KM_PER_AU = 1.496e8;
  const sigma_AU2 = Math.PI * (r_center / KM_PER_AU) ** 2 * focusFactor;

  // Step 4: Rate of close approaches per year
  // Opik-style estimate: rate = N * v_inf * sigma / V_shell
  // V_shell ≈ volume of near-Earth space swept per year
  // Simplified: use calibrated constant from Farnocchia & Chodas
  // ~0.1 encounters/year for the full NEO population within 1 AU
  const v_inf_AU_per_yr = v_inf * 3.156e7 / KM_PER_AU; // ~3.79 AU/yr
  const V_encounter = 2 * Math.PI; // effective volume normalization (AU^3)
  const rate = N * v_inf_AU_per_yr * sigma_AU2 / V_encounter;

  if (rate <= 0) return 7;

  // Step 5: Expected interval = 1/rate, rarity = log10(interval)
  const interval_years = 1 / rate;
  const rarity = Math.log10(interval_years);

  // Clamp to [0, 7] and round
  return Math.max(0, Math.min(7, Math.round(rarity)));
}
