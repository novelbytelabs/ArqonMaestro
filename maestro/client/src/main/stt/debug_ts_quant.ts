import { SplitMix64 } from "./cfh";

for (let i = 0; i < 10; i++) {
  const tieRng = new SplitMix64(BigInt(i));
  console.log(`TS Tie ${i}: ${Number(tieRng.nextU64() % 2n) === 0}`);
}
