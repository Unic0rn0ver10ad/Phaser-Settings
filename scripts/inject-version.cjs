/**
 * Injects package version into src/version.ts so each build embeds the current version.
 * Run before tsc (e.g. "node scripts/inject-version.cjs && tsc").
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const outPath = path.join(__dirname, '..', 'src', 'version.ts');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '0.0.0';

const content = `/**
 * Package version — injected at build from package.json.
 * Do not edit manually; run \`npm run build\` to update.
 */
export const VERSION = "${version}";
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('Injected VERSION:', version);
