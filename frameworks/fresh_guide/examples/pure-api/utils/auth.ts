const SECRET = new TextEncoder().encode("super-secret-key-change-in-production");

function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateToken(
  payload: { userId: string; role: string },
): Promise<string> {
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: payload.userId,
        role: payload.role,
        iat: now,
        exp: now + 86400,
      }),
    ),
  );

  const data = `${header}.${tokenPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    SECRET,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  const sig = base64url(signature);

  return `${data}.${sig}`;
}

export async function verifyToken(
  token: string,
): Promise<{ userId: string; role: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw",
      SECRET,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(signatureB64),
      new TextEncoder().encode(data),
    );

    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const hash = base64url(bits);
  const saltStr = base64url(salt);
  return `${saltStr}:${hash}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    const [saltStr, storedHash] = hash.split(":");
    const salt = base64urlDecode(saltStr);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      key,
      256,
    );
    return base64url(bits) === storedHash;
  } catch {
    return false;
  }
}
