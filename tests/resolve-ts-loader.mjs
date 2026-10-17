import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/cache") {
    return nextResolve(new URL("./next-cache-stub.mjs", import.meta.url).href, context);
  }
  if (specifier.startsWith("@/lib/")) {
    const candidate = new URL(`../src/lib/${specifier.slice("@/lib/".length)}.ts`, context.parentURL);
    try { await access(fileURLToPath(candidate)); return nextResolve(candidate.href, context); } catch { /* Continue with normal resolution. */ }
  }
  try { return await nextResolve(specifier, context); } catch (error) {
    if (!specifier.startsWith(".") || extname(specifier)) throw error;
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    try {
      await access(fileURLToPath(candidate));
      return nextResolve(candidate.href, context);
    } catch { throw error; }
  }
}
