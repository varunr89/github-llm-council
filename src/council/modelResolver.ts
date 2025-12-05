export type ChatModelInfo = { id: string; quality?: number };

/**
 * Picks up to `max` models preferring the desired ids, then filling with
 * remaining available models ordered by quality (descending).
 */
export function pickDefaultModels(desired: string[], available: ChatModelInfo[], max = 3): string[] {
  const availableMap = new Map(available.map(m => [m.id, m]));
  const desiredHits = desired.filter(id => availableMap.has(id));
  if (desiredHits.length >= max) {
    return desiredHits.slice(0, max);
  }

  const remaining = available
    .filter(m => !desiredHits.includes(m.id))
    .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))
    .map(m => m.id);

  return [...desiredHits, ...remaining].slice(0, max);
}

export function mapAvailableModels(models: readonly any[]): ChatModelInfo[] {
  return models.map(m => ({
    id: m.id ?? '',
    quality: (m.capabilities && (m.capabilities.quality as number | undefined)) ?? 0
  }));
}
