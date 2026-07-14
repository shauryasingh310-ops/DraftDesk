/*
Usage:
  node vercel-env-check.js

Checks whether required env vars are present (useful before running migrations).
*/

const required = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
];

const optional = [
  'NEXT_PUBLIC_BETTER_AUTH_URL',
];

for (const k of optional) {
  const v = process.env[k];
  if (!v || String(v).trim() === '') {
    console.warn(`[env] Optional env var not set: ${k}`);
  }
}

let missing = [];
for (const k of required) {
  const v = process.env[k];
  if (!v || String(v).trim() === '') missing.push(k);
}

if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}

console.log('All required env vars are set.');

