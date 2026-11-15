import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Sends a JSON error with a consistent shape: { error, fields? } */
export function sendError(res: VercelResponse, status: number, error: string, fields?: unknown) {
  res.status(status).json(fields ? { error, fields } : { error });
}

/** Wraps a handler so unexpected errors return a clean 500 instead of crashing. */
export function withErrors(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[api] error:', err);
      sendError(res, 500, 'Something went wrong on the server. Please try again.');
    }
  };
}

export function parseId(raw: unknown): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
