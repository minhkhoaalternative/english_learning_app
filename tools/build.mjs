import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'web');
const output = path.resolve(root, 'dist');
// Delete only the generated directory directly inside this checkout.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') {
  throw new Error('Unexpected build output path');
}
const entries = (await fs.readdir(source, {withFileTypes:true})).sort((a,b) => a.name.localeCompare(b.name));
const hash = createHash('sha256');
for (const entry of entries) {
  if (!entry.isFile()) throw new Error('Only static files are expected in web/: ' + entry.name);
  hash.update(entry.name).update(await fs.readFile(path.join(source, entry.name)));
}
const version = hash.digest('hex').slice(0,16);
await fs.rm(output, {recursive:true, force:true});
await fs.mkdir(output);
for (const entry of entries) await fs.copyFile(path.join(source, entry.name), path.join(output, entry.name));
const worker = await fs.readFile(path.join(output, 'sw.js'), 'utf8');
if (!/^const CACHE = 'busgrammar-static-[^']+';/m.test(worker)) throw new Error('Missing service-worker cache version');
await fs.writeFile(path.join(output, 'sw.js'), worker.replace(/^const CACHE = 'busgrammar-static-[^']+';/m, `const CACHE = 'busgrammar-static-${version}';`));
console.log(`Built ${entries.length} static files in dist/ (offline cache ${version}).`);
