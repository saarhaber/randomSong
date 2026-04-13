/**
 * Uniform integer in [0, upperExclusive). Uses crypto.getRandomValues with
 * rejection sampling when available; otherwise Math.random.
 */
export function randomInt(upperExclusive: number): number {
  if (!Number.isFinite(upperExclusive) || upperExclusive <= 0) {
    throw new RangeError("randomInt: upperExclusive must be a positive finite number");
  }
  const upper = Math.floor(upperExclusive);
  if (upper <= 0) {
    throw new RangeError("randomInt: upperExclusive must be at least 1");
  }

  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const modulus = 0x1_0000_0000;
    const limit = Math.floor(modulus / upper) * upper;
    const buf = new Uint32Array(1);
    let x: number;
    do {
      cryptoObj.getRandomValues(buf);
      x = buf[0]!;
    } while (x >= limit);
    return x % upper;
  }

  return Math.floor(Math.random() * upper);
}
