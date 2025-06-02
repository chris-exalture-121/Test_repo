async function digestMessage(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

/**
 * Generate a short, deterministic id from a url.
 * Not meant to be securely unique.
 */
export async function generateShortId(url: string) {
  const shortId = (await digestMessage(url)).slice(0, 20);

  return shortId;
}
