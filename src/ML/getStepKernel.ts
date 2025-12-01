export function getStepKernel(
  tPeak: number,
  width: number,
  total: number = 180,
  delay: number = 0
): number[] {
  const DT = 5;
  const t: number[] = [];
  // use width parameter to avoid unused-parameter compiler error
  void width;
  for (let i = DT; i <= total; i += DT) t.push(i);

  const shifted = t.map(v => Math.max(0, v - delay));

  const alpha = Math.max(2.0, 2.1 * (tPeak / 60.0));
  const beta = Math.max(1e-6, tPeak / ((alpha - 1) * 60.0));

  const pdf = shifted.map(s => {
    const x = s / 60.0;
    if (x <= 0) return 0;
    return Math.pow(x, alpha - 1) * Math.exp(-x / beta);
  });

  const cdf: number[] = [];
  let sum = 0;
  for (const p of pdf) {
    sum += p;
    cdf.push(sum);
  }

  const final = cdf[cdf.length - 1] || 1;
  return cdf.map(v => v / final);
}
