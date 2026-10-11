// Supabase Edge Function (Deno): verifica compras de Google Play para cordova-plugin-purchase.
//
// Secretos necesarios (supabase secrets set ...):
//   GOOGLE_SERVICE_ACCOUNT_JSON  JSON completo de la cuenta de servicio con acceso a Play Console
//   ANDROID_PACKAGE_NAME         p. ej. com.joyabloques.juego
//
// Contrato (cordova-plugin-purchase): POST { id, transaction: { type: 'android-playstore', purchaseToken } }
// → { ok: true, data: {...} }  |  { ok: false, code, message }
import { evaluate, successPayload, type GoogleProductPurchase } from './logic.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expires: number } | null = null;

function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expires > now + 60) return cachedToken.value;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`OAuth ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expires: now + body.expires_in };
  return body.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, message: 'Método no permitido' }, 405);

  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  const packageName = Deno.env.get('ANDROID_PACKAGE_NAME');
  if (!saJson || !packageName) return json({ ok: false, code: 6778001, message: 'Servidor no configurado' }, 500);

  let body: { id?: string; transaction?: { type?: string; purchaseToken?: string } };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: 6778003, message: 'JSON inválido' }, 400);
  }
  const productId = body.id ?? '';
  const token = body.transaction?.purchaseToken ?? '';
  if (body.transaction?.type !== 'android-playstore' || !productId || !token)
    return json({ ok: false, code: 6778003, message: 'Petición incompleta' }, 400);

  try {
    const access = await googleAccessToken(JSON.parse(saJson) as ServiceAccount);
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
    if (res.status === 404 || res.status === 410 || res.status === 400)
      return json({ ok: false, code: 6778003, message: 'Token de compra no válido' });
    if (!res.ok) throw new Error(`Play API ${res.status}: ${await res.text()}`);
    const purchase = (await res.json()) as GoogleProductPurchase;
    const verdict = evaluate(productId, purchase);
    if (!verdict.ok) return json({ ok: false, code: verdict.code, message: verdict.message }, verdict.status);
    return json(successPayload(productId, token, purchase));
  } catch (e) {
    console.error(e);
    // Error temporal: el plugin reintentará la verificación más tarde. La compra NO se pierde.
    return json({ ok: false, code: 6778001, message: 'Error temporal verificando la compra' }, 503);
  }
});
