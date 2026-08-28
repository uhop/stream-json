// Scaling meter for JSONC comment scanning (GHSA-hqr4-qq8f-hg3x): one block
// comment fed in 16 KB chunks; time must grow linearly with size — a quadratic
// curve (4x per doubling) means the scan restarted from the comment's start.
// Run via `npx nano-bench-io bench/parser-jsonc-comments.js` and read the ratios.
import jsoncParser from '../src/jsonc/parser.js';

const feed = doc =>
  new Promise((resolve, reject) => {
    const stream = jsoncParser.asStream();
    stream.on('data', () => {});
    stream.on('error', reject);
    stream.on('end', resolve);
    for (let i = 0; i < doc.length; i += 16384) stream.write(doc.slice(i, i + 16384));
    stream.end();
  });

const K = 1024;
const docs = {
  'comment 256K': '/*' + 'a'.repeat(256 * K) + '*/1',
  'comment 512K': '/*' + 'a'.repeat(512 * K) + '*/1',
  'comment 1M': '/*' + 'a'.repeat(1024 * K) + '*/1',
  'string 1M': '"' + 'a'.repeat(1024 * K) + '"'
};

export default Object.fromEntries(
  Object.entries(docs).map(([name, doc]) => [
    name,
    async n => {
      for (let i = 0; i < n; ++i) await feed(doc);
    }
  ])
);
