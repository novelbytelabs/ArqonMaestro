import { normalizeCanonical, SplitMix64 } from "./cfh";
import { createHash } from "crypto";

function projectFeature(feat: string, acc: number[], density: number): void {
  const hash = createHash('sha256');
  hash.update(feat);
  const hashBytes = hash.digest();
  
  const seed1 = hashBytes.readBigUInt64LE(0);
  const seed2 = hashBytes.readBigUInt64LE(8);
  const rng = new SplitMix64(seed1 ^ seed2);
  
  for (let i = 0; i < density; i++) {
    const bit = Number(rng.nextU64() % BigInt(acc.length));
    if (Number(rng.nextU64() % 2n) === 0) {
      acc[bit] += 1.0;
    } else {
      acc[bit] -= 1.0;
    }
  }
}

const q = "test query";
const tokens = normalizeCanonical(q);

const accumulator: number[] = new Array(1024).fill(0);

for (const token of tokens) {
  projectFeature(token, accumulator, 256);
  const chars = token.split("");
  if (chars.length >= 3) {
    for (let i = 0; i <= chars.length - 3; i++) {
      const trigram = chars.slice(i, i + 3).join("");
      projectFeature(trigram, accumulator, 64);
    }
    const prefix = chars.slice(0, 3).join("");
    const suffix = chars.slice(chars.length - 3).join("");
    projectFeature("^" + prefix, accumulator, 32);
    projectFeature(suffix + "$", accumulator, 32);
  }
}

let sum = 0.0;
let nonZero = 0;
for (let i = 0; i < accumulator.length; i++) {
  const val = accumulator[i];
  if (val !== 0.0) {
    console.log(`TS Acc[${i}]: ${val}`);
    sum += val;
    nonZero += 1;
  }
}
console.log(`TS Acc Non-Zero: ${nonZero}, Sum: ${sum}`);
