/**
 * Verifies that npm pack would not include apps/playground in the publish payload.
 * Run before publish. Exits 1 if any playground path appears.
 */
const { execSync } = require('child_process');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const forbidden = 'apps/playground';

try {
  const out = execSync('npm pack --dry-run', { cwd: repoRoot, encoding: 'utf8' });
  const lines = out.split(/\r?\n/);
  const included = lines.filter((line) => line.includes(forbidden));
  if (included.length > 0) {
    console.error('verify:pack failed: pack would include playground files:');
    included.forEach((line) => console.error('  ', line));
    process.exit(1);
  }
  console.log('verify:pack ok: no apps/playground in pack output.');
} catch (e) {
  console.error('verify:pack failed:', e.message);
  process.exit(1);
}
