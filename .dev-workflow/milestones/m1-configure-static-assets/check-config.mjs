import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const EXPECTED_WRANGLER_VERSION = "4.147.0";

function removeJsoncComments(source) {
  let result = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        result += character;
      } else {
        result += " ";
      }
      continue;
    }

    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        result += "  ";
        index += 1;
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (!inString && character === "/" && next === "/") {
      lineComment = true;
      result += "  ";
      index += 1;
      continue;
    }

    if (!inString && character === "/" && next === "*") {
      blockComment = true;
      result += "  ";
      index += 1;
      continue;
    }

    result += character;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
    } else if (character === '"') {
      inString = true;
    }
  }

  return result;
}

function removeJsoncTrailingCommas(source) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (!inString && character === ",") {
      let lookahead = index + 1;
      while (/\s/.test(source[lookahead] ?? "")) lookahead += 1;
      if (source[lookahead] === "}" || source[lookahead] === "]") continue;
    }

    result += character;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
    } else if (character === '"') {
      inString = true;
    }
  }

  return result;
}

function parseJsonc(source) {
  return JSON.parse(removeJsoncTrailingCommas(removeJsoncComments(source)));
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));

assert.equal(
  packageJson.devDependencies?.wrangler,
  EXPECTED_WRANGLER_VERSION,
  "package.json must pin wrangler exactly in devDependencies",
);
assert.equal(
  packageJson.dependencies?.wrangler,
  undefined,
  "wrangler must not be a production dependency",
);

const expectedScripts = {
  dev: "vite --host 127.0.0.1",
  build: "tsc --noEmit && vite build",
  preview: "npm run build && wrangler dev",
  check: "tsc --noEmit",
  "dev:worker": "npm run build && wrangler dev",
  deploy: "wrangler deploy",
  "preview:deploy": "wrangler preview",
};

for (const [name, command] of Object.entries(expectedScripts)) {
  assert.equal(packageJson.scripts?.[name], command, `unexpected npm script: ${name}`);
}

assert.equal(
  packageLock.packages?.[""]?.devDependencies?.wrangler,
  EXPECTED_WRANGLER_VERSION,
  "lockfile root must pin the same wrangler version",
);
assert.equal(
  packageLock.packages?.["node_modules/wrangler"]?.version,
  EXPECTED_WRANGLER_VERSION,
  "lockfile must resolve wrangler to the pinned version",
);

const wranglerConfig = parseJsonc(await readFile("wrangler.jsonc", "utf8"));

assert.equal(wranglerConfig.$schema, "./node_modules/wrangler/config-schema.json");
assert.equal(wranglerConfig.name, "valhalla-committee");
assert.equal(wranglerConfig.compatibility_date, "2026-10-05");
assert.deepEqual(wranglerConfig.assets, { directory: "./dist" });

const forbiddenWranglerKeys = [
  "main",
  "account_id",
  "route",
  "routes",
  "vars",
  "kv_namespaces",
  "r2_buckets",
  "d1_databases",
  "durable_objects",
  "services",
  "queues",
  "vectorize",
  "hyperdrive",
  "workflows",
  "ai",
  "browser",
  "mtls_certificates",
  "dispatch_namespaces",
  "unsafe",
];

for (const key of forbiddenWranglerKeys) {
  assert.equal(
    Object.hasOwn(wranglerConfig, key),
    false,
    `wrangler.jsonc must remain assets-only; forbidden key: ${key}`,
  );
}

console.log("PASS: manifest, lockfile, scripts, and assets-only Wrangler config");
