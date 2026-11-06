import type WebSocket from 'ws';

export function rawDataToString(data: WebSocket.RawData): string {
  if (Buffer.isBuffer(data)) return data.toString('utf-8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf-8');

  return Buffer.from(data).toString('utf-8');
}

/** Parses a JSON text frame, or returns null when the frame is not a JSON object. */
export function parseJsonFrame(data: WebSocket.RawData): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(rawDataToString(data));

    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
