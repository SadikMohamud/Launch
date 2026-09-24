// Waitlist submission.
//
// Runs as a Vercel function. It talks to Upstash and Resend over their REST
// APIs with plain fetch, so it adds no dependencies to the site bundle and
// nothing here ships to the browser.
//
// The rule this endpoint exists to keep: the caller is only told the entry
// was stored once the store has actually confirmed it. A form that says
// "you are on the list" before the write lands is lying to the person who
// filled it in, and they will find out at launch rather than now.
//
// Required environment variables, none of which live in the repository:
//
//   UPSTASH_REDIS_REST_URL      the Upstash database REST endpoint
//   UPSTASH_REDIS_REST_TOKEN    its token
//   RESEND_API_KEY              optional; without it no email is sent
//   WAITLIST_FROM               optional; the confirmation sender address

export const config = { runtime: 'edge' };

/** Submissions allowed from one address within the window. */
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;

/** Bound on what we will read, so a huge body cannot tie the function up. */
const MAX_BODY_BYTES = 2_000;

interface Payload {
  email?: unknown;
  /** The honeypot. Real people never see this field. */
  company?: unknown;
}

/** A deliberately conservative address check. */
function isValidEmail(value: string): boolean {
  if (value.length < 6 || value.length > 254) return false;
  if (/\s/.test(value)) return false;

  // One @, something either side, a dot in the domain, and no leading or
  // trailing dots in either part.
  return /^[^@.][^@\s]*@[^@\s.][^@\s]*\.[a-z]{2,}$/i.test(value);
}

/** JSON response with no caching, since every reply is specific to a caller. */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/** Call the Upstash REST API. Returns null rather than throwing. */
async function redis(command: unknown[]): Promise<unknown | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) return null;

    const result = (await response.json()) as { result?: unknown };
    return result.result ?? null;
  } catch {
    return null;
  }
}

/** Send the confirmation. Failure here must not fail the submission. */
async function sendConfirmation(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM;
  if (!key || !from) return;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'You are on the Launch waitlist',
        text: [
          'Thanks for joining the waitlist for the Launch platform.',
          '',
          'We will email you once early access opens. That is the only',
          'reason we will use this address, and you can unsubscribe from',
          'any message in one click.',
          '',
          'In the meantime the command line engine is available today:',
          'https://launch.snurm.com',
          '',
          'Snurm',
        ].join('\n'),
      }),
    });
  } catch {
    // The entry is stored either way. An undelivered confirmation is not a
    // reason to tell someone their submission failed.
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }

  // Read with a bound. Content-Length can lie, so the parsed text is
  // checked as well.
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'That request was too large.' }, 413);
  }

  let payload: Payload;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'That request was too large.' }, 413);
    }
    payload = JSON.parse(text) as Payload;
  } catch {
    return json({ ok: false, error: 'That request could not be read.' }, 400);
  }

  // The honeypot. Anything that fills a field nobody can see is automated,
  // and is answered exactly like a success so it learns nothing.
  if (typeof payload.company === 'string' && payload.company.trim() !== '') {
    return json({ ok: true }, 200);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return json({ ok: false, error: 'That does not look like an email address.' }, 400);
  }

  // Rate limit per address. The first request in a window sets the expiry,
  // so the window slides forward only when it lapses.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const rateKey = `waitlist:rate:${ip}`;
  const count = await redis(['INCR', rateKey]);

  if (count === null) {
    // No store means nothing can be recorded, and saying otherwise would be
    // the exact dishonesty this endpoint is written to avoid.
    return json(
      { ok: false, error: 'The waitlist is unavailable right now. Please try again shortly.' },
      503
    );
  }

  if (count === 1) await redis(['EXPIRE', rateKey, RATE_WINDOW_SECONDS]);

  if (typeof count === 'number' && count > RATE_LIMIT) {
    return json({ ok: false, error: 'Too many attempts. Please try again later.' }, 429);
  }

  // Store. HSET returns 1 for a new field and 0 for an existing one, so a
  // repeat submission is a success rather than an error.
  const stored = await redis([
    'HSET',
    'waitlist:entries',
    email,
    JSON.stringify({ at: new Date().toISOString(), ip }),
  ]);

  if (stored === null) {
    return json(
      { ok: false, error: 'The waitlist is unavailable right now. Please try again shortly.' },
      503
    );
  }

  // Only a confirmed write reaches this line.
  if (stored === 1) await sendConfirmation(email);

  return json({ ok: true }, 200);
}
