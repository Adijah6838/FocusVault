const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const srcRenderer = path.join(root, 'src', 'renderer');
const outRenderer = path.join(root, 'dist', 'renderer');

fs.mkdirSync(outRenderer, { recursive: true });

for (const entry of ['index.html', 'styles']) {
  const from = path.join(srcRenderer, entry);
  const to = path.join(outRenderer, entry);
  if (fs.existsSync(from)) {
    fs.cpSync(from, to, { recursive: true });
    console.log('[assets] copied', entry);
  } else {
    console.log('[assets] skipped (missing):', entry);
  }
}