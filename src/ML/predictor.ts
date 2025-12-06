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
  // FINAL NOISE INJECTION (LIGHT VERSION)
  // ============================================================
  // Previously: 5.0 + 3.0 + 2.0 amplitude = VERY STRONG
  // Now: 0.5 + 0.3 + 0.2 = VERY LIGHT + SMOOTH
  for (let t = 0; t < bgSeries.length; t++) {
    const n1 = 0.5 * Math.sin(t / 4.0);   // smoother + weaker
    const n2 = 0.3 * Math.cos(t / 10.0);  // longer period
    const n3 = 0.2 * Math.sin(t / 3.0);   // tiny micro-wave

    const noise = n1 + n2 + n3;

    let noisyBG = bgSeries[t] + noise;

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
