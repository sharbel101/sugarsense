import weights from "./weights.json";
import { buildFeatures } from "./buildFeatures";

export interface PredictionInput {
  currentBG: number;
  carbs: number;
  bolus: number;
  cir: number;
  gi?: number;
}

function validateWeights(W: any, b: any) {
  if (!Array.isArray(W) || W.length !== 36) {
    throw new Error("weights.W must be an array with 36 rows");
  }
  for (let i = 0; i < 36; i++) {
    if (!Array.isArray(W[i]) || W[i].length !== 144) {
      throw new Error(`weights.W[${i}] must be an array of length 144`);
    }
    for (let j = 0; j < 144; j++) {
      if (typeof W[i][j] !== "number") {
        throw new Error(`weights.W[${i}][${j}] must be a number`);
      }
    }
  }

  if (!Array.isArray(b) || b.length !== 36) {
    throw new Error("weights.b must be an array of length 36");
  }
  for (let i = 0; i < 36; i++) {
    if (typeof b[i] !== "number") {
      throw new Error(`weights.b[${i}] must be a number`);
    }
  }
}

const raw = weights as any;
validateWeights(raw.W, raw.b);
const modelW: number[][] = raw.W;
const modelB: number[] = raw.b;

export function predictDelta(
  carbs: number,
  bolus: number,
  cir: number,
  gi: number = 55
): number[] {
  const X = buildFeatures(carbs, bolus, cir, gi);

  return modelB.map((bias, i) => {
    let sum = bias;
    for (let j = 0; j < X.length; j++) {
      sum += X[j] * modelW[i][j];
    }
    return sum;
  });
}

export function predictAbsolute(input: PredictionInput): number[] {
  const deltas = predictDelta(input.carbs, input.bolus, input.cir, input.gi ?? 55);
  return deltas.map(delta => input.currentBG + delta);
}
