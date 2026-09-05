import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const distAssetsDir = join(process.cwd(), 'dist', 'assets');
const files = readdirSync(distAssetsDir);

let totalRaw = 0;
let totalGzip = 0;

console.log('\n=== Spike C: bundle size ===\n');
for (const file of files) {
  const filePath = join(distAssetsDir, file);
  const raw = statSync(filePath).size;
  const gzip = gzipSync(readFileSync(filePath)).length;
  totalRaw += raw;
  totalGzip += gzip;
  console.log(`${file}: ${(raw / 1024).toFixed(1)} KB raw / ${(gzip / 1024).toFixed(1)} KB gzip`);
}

console.log(
  `\nTotal: ${(totalRaw / 1024).toFixed(1)} KB raw / ${(totalGzip / 1024).toFixed(1)} KB gzip`,
);
