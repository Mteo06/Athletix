import QRCode from "qrcode";

/**
 * Implementazione autonoma di TOTP (RFC 6238) via Web Crypto API, così da
 * funzionare sia lato server (Node 19+) sia lato client (browser) senza
 * dipendere da plugin esterni. Step 60s, 8 cifre: il QR dell'atleta si
 * rigenera ogni minuto, rendendo inutili screenshot o condivisioni.
 */
const STEP_SECONDS = 60;
const DIGITS = 8;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function intToBytes(num: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // JS number safe up to 2^53; counter di minuti non lo supera per secoli
  view.setUint32(4, num, false);
  return new Uint8Array(buf);
}

async function hmacSha1(keyBytes: Uint8Array, msgBytes: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto API non disponibile in questo ambiente");
  const key = await subtle.importKey(
    "raw",
    keyBytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await subtle.sign("HMAC", key, msgBytes as unknown as ArrayBuffer);
  return new Uint8Array(signature);
}

function truncate(hmac: Uint8Array, digits: number): string {
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = (binCode % 10 ** digits).toString().padStart(digits, "0");
  return code;
}

async function totpAt(hexSecret: string, timeStep: number): Promise<string> {
  const keyBytes = hexToBytes(hexSecret);
  const counterBytes = intToBytes(timeStep);
  const hmac = await hmacSha1(keyBytes, counterBytes);
  return truncate(hmac, DIGITS);
}

/** Genera il codice TOTP corrente (valido per la finestra di 60s in corso) */
export async function generateDynamicToken(
  secret: string,
  timestamp: number = Date.now()
): Promise<string> {
  const timeStep = Math.floor(timestamp / 1000 / STEP_SECONDS);
  const otp = await totpAt(secret, timeStep);
  return `${otp}.${timeStep}`;
}

/** Verifica un token accettando la finestra corrente e quella precedente (clock-skew) */
export async function verifyDynamicToken(token: string, secret: string): Promise<boolean> {
  const [otp, stepStr] = token.split(".");
  if (!otp || !stepStr) return false;
  const claimedStep = Number(stepStr);
  const currentStep = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  if (Math.abs(currentStep - claimedStep) > 1) return false; // finestra scaduta
  const expected = await totpAt(secret, claimedStep);
  return expected === otp;
}

/** Payload racchiuso nel QR: distingue codici dinamici (atleta) da statici (gift card/biglietti) */
export type QrPayload =
  | { type: "DYNAMIC"; athleteId: string; token: string }
  | { type: "STATIC"; code: string };

export function encodeQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload);
}

export function decodeQrPayload(raw: string): QrPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.type === "DYNAMIC" || parsed.type === "STATIC") return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Genera un'immagine QR (data URL PNG) da mostrare nel profilo atleta o su stampa */
export async function renderQrDataUrl(payload: QrPayload): Promise<string> {
  return QRCode.toDataURL(encodeQrPayload(payload), {
    margin: 1,
    width: 320,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
