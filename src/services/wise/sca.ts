import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

let cachedKey: string | undefined;

function loadPrivateKey(keyPath: string) {
  cachedKey ??= readFileSync(keyPath, "utf-8");
  return cachedKey;
}

export function signScaChallenge(oneTimeToken: string, keyPath: string): string {
  const key = loadPrivateKey(keyPath);
  const signer = createSign("SHA256");
  signer.update(oneTimeToken);
  signer.end();
  return signer.sign(key, "base64");
}
