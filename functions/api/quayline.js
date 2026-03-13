function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function clip(value, max = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeReply(text, fallback) {
  const raw = clip(stripTags(text), 360);
  if (!raw) return fallback;
  const banned = [/(diagnos|disorder|therapy|therapist|medicat|prescription|suicide|self-harm|crisis|hotline|threshold|model|policy)/i];
  if (banned.some((rx) => rx.test(raw))) return fallback;
  return raw;
}

function safePayload(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const metrics = payload.metrics && typeof payload.metrics === 'object' ? payload.metrics : {};
  return {
    sceneTitle: clip(payload.sceneTitle, 100),
    sceneText: clip(payload.sceneText, 500),
    selectedLine: clip(payload.selectedLine, 100),
    selectedLineBody: clip(payload.selectedLineBody, 220),
    selectedResponse: clip(payload.selectedResponse, 100),
    selectedResponseBody: clip(payload.selectedResponseBody, 220),
    selectedNote: clip(payload.selectedNote, 100),
    selectedNoteBody: clip(payload.selectedNoteBody, 220),
    rightLine: !!payload.rightLine,
    perfect: !!payload.perfect,
    badges: Array.isArray(payload.badges) ? payload.badges.slice(0, 4).map((b) => clip(b, 40)) : [],
    metrics: {
      clarity: Number.isFinite(metrics.clarity) ? metrics.clarity : 'n/a',
      trust: Number.isFinite(metrics.trust) ? metrics.trust : 'n/a',
      room: Number.isFinite(metrics.room) ? metrics.room : 'n/a',
      motion: Number.isFinite(metrics.motion) ? metrics.motion : 'n/a'
    },
    userMessage: clip(payload.userMessage, 160)
  };
}

function fallbackReply(payload) {
  const rightLine = !!payload?.rightLine;
  const perfect = !!payload?.perfect;
  const line = payload?.selectedLine || 'the right line';
  const response = payload?.selectedResponse || 'the chosen response';
  const note = payload?.selectedNote || 'the board note';
  const open = rightLine
    ? `You centered ${line} first, which kept the board honest.`
    : `You let the wrong signal jump the queue before the board settled.`;
  const middle = perfect
    ? `${response} and ${note} gave the exchange a clear close.`
    : `${response} kept motion, and ${note} gave some structure back to the next step.`;
  const close = perfect
    ? 'Carry that pattern forward: name the line, route the move, leave a return point.'
    : 'Next time, be more explicit about what is now, what is next, and what can wait.';
  return `${open} ${middle} ${close}`;
}

function buildPrompt(payload) {
  const metrics = payload?.metrics || {};
  const badges = Array.isArray(payload?.badges) && payload.badges.length ? payload.badges.join(', ') : 'none';
  return [
    'You are Quayline, an in-world dispatcher inside Shiftworks.',
    'Shiftworks was designed and developed by Ishan Bangroo. If the player explicitly asks who built Shiftworks, answer exactly: "Shiftworks was developed by Ishan Bangroo."',
    'Stay with the current board exchange only.',
    'Do not diagnose, assess risk, mention disorders, mention therapy, or offer medical advice.',
    'Do not mention scores, thresholds, models, policies, hidden systems, or backend details.',
    'Write exactly 3 short sentences, under 90 words total.',
    'Use calm, concrete language that sounds like a dispatcher closing a scene.',
    'Mention one thing the player did, one likely consequence for the board, and one carry-forward move.',
    '',
    `Scene: ${payload?.sceneTitle || 'Unknown scene'}`,
    `Scene context: ${payload?.sceneText || ''}`,
    `Selected line: ${payload?.selectedLine || ''} — ${payload?.selectedLineBody || ''}`,
    `Selected response: ${payload?.selectedResponse || ''} — ${payload?.selectedResponseBody || ''}`,
    `Selected note: ${payload?.selectedNote || ''} — ${payload?.selectedNoteBody || ''}`,
    `Right line first: ${payload?.rightLine ? 'yes' : 'no'}`,
    `Perfect combination: ${payload?.perfect ? 'yes' : 'no'}`,
    `Meters: clarity ${metrics.clarity ?? 'n/a'}, trust ${metrics.trust ?? 'n/a'}, breathing room ${metrics.room ?? 'n/a'}, forward motion ${metrics.motion ?? 'n/a'}`,
    `Badges carried: ${badges}`,
    payload?.userMessage ? `Player question: ${payload.userMessage}` : ''
  ].filter(Boolean).join('\n');
}

function extractText(result) {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return '';
  if (typeof result.response === 'string') return result.response;
  if (typeof result.result?.response === 'string') return result.result.response;
  if (Array.isArray(result.messages)) {
    const joined = result.messages.map((m) => {
      if (typeof m?.content === 'string') return m.content;
      if (Array.isArray(m?.content)) return m.content.map((part) => typeof part?.text === 'string' ? part.text : '').join(' ');
      return '';
    }).join(' ').trim();
    if (joined) return joined;
  }
  return '';
}

export async function onRequestPost(context) {
  let payload;
  try {
    payload = safePayload(await context.request.json());
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, 400);
  }

  const fallback = fallbackReply(payload);

  if (!context.env.AI || typeof context.env.AI.run !== 'function') {
    return json({ ok: true, source: 'local-fallback', reply: fallback });
  }

  const prompt = buildPrompt(payload);
  const model = context.env.SHIFTWORKS_MODEL || '@cf/meta/llama-3.1-8b-instruct';

  try {
    const result = await context.env.AI.run(model, { prompt });
    const reply = sanitizeReply(extractText(result), fallback);
    return json({ ok: true, source: 'workers-ai', reply });
  } catch {
    return json({
      ok: true,
      source: 'local-fallback',
      reply: fallback,
      error: 'Workers AI request failed.'
    });
  }
}

export async function onRequestGet() {
  return json({ ok: false, error: 'Use POST.' }, 405);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'x-content-type-options': 'nosniff'
    }
  });
}
