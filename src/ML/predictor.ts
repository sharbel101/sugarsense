import weightsJson from "./math_model_weights.json";

export interface PredictionInput {
  currentBG: number;
  carbs: number;
  bolus: number; // insulin units
  cir: number; // ICR (carb:insulin ratio)
  gi?: number;
}

type MathWeights = {
  HORIZONS: number[];
  DT: number;
  CARB_IMPACT_PER_GRAM: number;
  GI_PARAMETERS: {
    gi_min: number;
    gi_max: number;
    t_peak_low_gi: number;
    t_peak_high_gi: number;
    width_low_gi: number;
    width_high_gi: number;
    amplitude_min: number;
    amplitude_max: number;
  };
  INSULIN_PARAMETERS: {
    onset: number;
    peak: number;
    duration: number;
    alpha: number;
    beta: number;
    total_min: number;
  };
  ICR_ISF_RULES: {
    isf_multiplier: number;
  };
  CLIPPING: {
    MIN_BG: number;
    MAX_BG: number;
  };
  carb_kernel: number[];
  insulin_kernel: number[];
};

const M = weightsJson as MathWeights;

export function simulateBG(
  currentBG: number,
  carbs: number,
  gi: number,
  insulinUnits: number,
  ICR: number,
  weights: MathWeights = M
): number[] {
  const isf = ICR * weights.ICR_ISF_RULES.isf_multiplier;
  const giAmplitude = 0.8 + 0.6 * (Math.max(0, Math.min(100, gi)) / 100);

  const totalCarbEffect = carbs * weights.CARB_IMPACT_PER_GRAM * giAmplitude;
  const totalInsulinEffect = insulinUnits * isf;

  const carbFrac = weights.carb_kernel;
  const insulinFrac = weights.insulin_kernel;

  if (
    carbFrac.length !== weights.HORIZONS.length ||
    insulinFrac.length !== weights.HORIZONS.length
  ) {
    console.error(
      `Kernel length mismatch: HORIZONS=${weights.HORIZONS.length}, carb_kernel=${carbFrac.length}, insulin_kernel=${insulinFrac.length}`
    );
  }

  const horizons = weights.HORIZONS;
  const bgSeries: number[] = new Array(horizons.length);

  for (let t = 0; t < horizons.length; t++) {
    const cf = carbFrac[t] ?? carbFrac[carbFrac.length - 1];
    const inf = insulinFrac[t] ?? insulinFrac[insulinFrac.length - 1];

    let bg = currentBG + cf * totalCarbEffect - inf * totalInsulinEffect;

    bg = Math.max(weights.CLIPPING.MIN_BG, Math.min(weights.CLIPPING.MAX_BG, bg));
    bgSeries[t] = bg;

    if (t < 5) {
      console.log(
        `⚡ t=${t}: cf=${cf.toFixed(6)}, inf=${inf.toFixed(6)}, bg=${bg.toFixed(2)}`
      );
    }
  }

  // ============================================================
  // REAL CGM NOISE (Simplified to the Real Statistical Behavior)
  // ============================================================
  // Based on actual CGM noise measured vs fingersticks/YSI:
  // 1) Baseline random noise (Gaussian-Laplacian mixture)
  // 2) Tail spikes (rare big jumps)
  // 3) Short-noise waves (wobble during steady state)

  // Helper: Standard normal distribution (Box-Muller)
  const gaussianRandom = (): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  // Helper: Laplace distribution
  const laplaceRandom = (b: number = 1): number => {
    const u = Math.random() - 0.5;
    return -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  };

  // Pre-compute wobble parameters for this series (constant per prediction)
  const wobbleAmplitude = 0.5 + Math.random() * 1.5; // Uniform(0.5, 2)
  const wobblePeriod = 4 + Math.random() * 6;        // Uniform(4, 10) in units of steps

  for (let t = 0; t < bgSeries.length; t++) {
    // ============================================================
    // 1️⃣ BASELINE RANDOM NOISE (Gaussian-Laplacian mixture)
    // ============================================================
    // Most readings within ±3-4 mg/dL (slightly smoother)
    const baselineNoise = 3 * gaussianRandom() + 1.2 * laplaceRandom(1);

    // ============================================================
    // 2️⃣ TAIL SPIKES (Real CGM "jump" noise)
    // ============================================================
    // 88% no spike, 10% ~±7 mg/dL, 2% ~±15 mg/dL (less frequent & smaller)
    let spikeNoise = 0;
    const spikeRand = Math.random();
    if (spikeRand > 0.88) {
      if (spikeRand > 0.98) {
        // 2% probability: big spike
        spikeNoise = 15 * gaussianRandom();
      } else {
        // 10% probability: medium spike
        spikeNoise = 7 * gaussianRandom();
      }
    }

    // ============================================================
    // 3️⃣ SHORT-NOISE WAVES (CGM wobble)
    // ============================================================
    // Sine wave with random amplitude and period
    const wobbleNoise = wobbleAmplitude * Math.sin((2 * Math.PI * t) / wobblePeriod);

    // ============================================================
    // COMBINE ALL NOISE COMPONENTS
    // ============================================================
    const totalNoise = baselineNoise + spikeNoise + wobbleNoise;

    let noisyBG = bgSeries[t] + totalNoise;

    // Clip to valid BG range
    noisyBG = Math.max(
      weights.CLIPPING.MIN_BG,
      Math.min(weights.CLIPPING.MAX_BG, noisyBG)
    );

    bgSeries[t] = noisyBG;
  }

  console.log("🔥 LIGHT NOISE APPLIED - First 10 values:", bgSeries.slice(0, 10));

  return bgSeries;
}

export function predictDelta(
  carbs: number,
  bolus: number,
  cir: number,
  gi: number = 55
): number[] {
  const bg = simulateBG(0, carbs, gi, bolus, cir, M);
  return bg; // delta relative to 0
}

export function predictAbsolute(input: PredictionInput): number[] {
  return simulateBG(
    input.currentBG,
    input.carbs,
    input.gi ?? 55,
    input.bolus,
    input.cir,
    M
  );
}
