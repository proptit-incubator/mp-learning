/** One cost unit is one token of the cheapest model, billed at about 0.50 USD per million. */
const USD_PER_UNIT = 0.5 / 1_000_000;

export function formatAiUnits(units: number): string {
  if (units >= 1_000_000) {
    return `${(units / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  }
  if (units >= 1_000) return `${(units / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} k`;

  return units.toLocaleString('vi-VN');
}

export function estimateAiCostUsd(units: number): string {
  return `≈ $${(units * USD_PER_UNIT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
