import { getStepKernel } from "./getStepKernel";

export function buildFeatures(
  carbs: number,
  bolus: number,
  cir: number
): number[] {
  carbs = Math.max(0, carbs);
  bolus = Math.max(0, bolus);
  cir = Math.max(0.1, cir);

  const Kc = getStepKernel(45, 40);
  const Ki = getStepKernel(75, 60, 180, 15);

  const featCarbs = Kc.map(v => v * carbs * 4.5);
  const featIns = Ki.map(v => v * bolus * 45);
  const featCir = Kc.map(() => Math.log1p(cir));
  const featDrift = Kc.map(() => 0);

  const features: number[] = [];
  for (let i = 0; i < Kc.length; i++) {
    features.push(featCarbs[i], featIns[i], featCir[i], featDrift[i]);
  }

  return features; // 144 features
}
