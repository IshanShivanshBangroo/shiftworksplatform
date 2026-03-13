export async function onRequestGet() {
  return Response.json({ ok: true, service: 'shiftworks-quayline' });
}
