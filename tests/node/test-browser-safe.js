import {test} from 'tape-six';
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NODE_BUILTINS = new Set([
  'assert',
  'assert/strict',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'dns/promises',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'inspector/promises',
  'module',
  'net',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'readline/promises',
  'repl',
  'stream',
  'stream/consumers',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'sys',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'util/types',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib'
]);

// Bare specifiers allowed in src/core/. Anything else flags a substrate-portability
// review: bare specifiers into stream-chain's Node-only subpaths (e.g.
// `stream-chain/jsonl/stringerStream.js`) or other deps' Node entries would pull
// `node:*` transitively but the relative-only walker can't detect that.
const CORE_ALLOWED_BARE_SPECIFIERS = new Set([
  'stream-chain/core',
  'stream-chain/defs.js',
  'stream-chain/jsonl/parser.js',
  'stream-chain/utils/batch.js',
  'stream-chain/utils/fixUtf8Stream.js',
  'stream-chain/utils/lines.js'
]);

// Type-level Node-stream leak patterns. `extends DuplexOptions` (etc.) declares a
// stream-shape on what should be a substrate-agnostic interface. Only checked in
// `.d.ts` files since `.js` doesn't have `extends` in interfaces.
const NODE_TYPE_EXTENDS_RE = /\bextends\s+[^{]*?\b(DuplexOptions|TransformOptions|WritableOptions|ReadableOptions)\b/;

// `/// <reference types="node" />` pulls @types/node ambient declarations into
// the file. Must be checked before stripping `//` comments since the directive
// looks like a comment.
const NODE_REFERENCE_RE = /\/\/\/\s*<reference\s+types\s*=\s*"node"\s*\/>/;

// Matches `import [type] {…} from '…'`, `import * as X from '…'`, `import X from '…'`,
// `import '…'`, and the corresponding `export … from '…'` re-export forms.
const importRegex = /(?:^|\s)(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;

const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// Resolve a relative import target. Tries `<spec>`, then `<spec without .js> + .d.ts`,
// then `<spec> + .d.ts` so the walker can recurse from a .d.ts into another .d.ts
// when only the type-level file exists.
const resolveRelative = (fromAbs, spec) => {
  const base = resolve(dirname(fromAbs), spec);
  const candidates = [base];
  if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.d.ts');
  candidates.push(base + '.d.ts');
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
};

const walkImports = (entryPath, visited, violations, opts = {}) => {
  const abs = resolve(entryPath);
  if (visited.has(abs)) return violations;
  visited.add(abs);
  let raw;
  try {
    raw = readFileSync(abs, 'utf-8');
  } catch (e) {
    violations.push({file: abs, error: `cannot read: ${e.message}`});
    return violations;
  }

  // `/// <reference>` lives in lines that look like comments — check before strip.
  if (NODE_REFERENCE_RE.test(raw)) {
    violations.push({file: abs, forbidden: '/// <reference types="node" />'});
  }

  const source = stripComments(raw);

  // Type-level extends checks only apply to .d.ts files.
  if (abs.endsWith('.d.ts')) {
    const m = source.match(NODE_TYPE_EXTENDS_RE);
    if (m) violations.push({file: abs, forbidden: `extends ${m[1]}`});
  }

  importRegex.lastIndex = 0;
  let match;
  while ((match = importRegex.exec(source))) {
    const spec = match[1];
    if (spec.startsWith('node:')) {
      violations.push({file: abs, forbidden: spec});
    } else if (NODE_BUILTINS.has(spec)) {
      violations.push({file: abs, forbidden: spec});
    } else if (spec.startsWith('.')) {
      const target = resolveRelative(abs, spec);
      if (target) walkImports(target, visited, violations, opts);
    } else if (opts.allowedBareSpecifiers && !opts.allowedBareSpecifiers.has(spec)) {
      // Bare specifier outside the substrate-agnostic allowlist. Flag for review:
      // may pull `node:*` transitively via the dep's Node-only subpath.
      violations.push({file: abs, forbidden: spec, kind: 'bare-specifier'});
    }
  }
  return violations;
};

const collectFiles = (root, exts, out = []) => {
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, exts, out);
    } else if (exts.some(e => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
};

test('browser-safety: /core .js + .d.ts have no node:* / builtin imports, no DuplexOptions extends, no /// <reference types="node" />', t => {
  const entries = collectFiles(resolve(__dirname, '../../src/core'), ['.js', '.d.ts']);
  const violations = [];
  const visited = new Set();
  for (const entry of entries) walkImports(entry, visited, violations);
  if (violations.length) console.error('Violations:', JSON.stringify(violations, null, 2));
  t.equal(violations.length, 0, 'no Node leaks reachable from /core (runtime or type-level)');
});

test('browser-safety: /core bare specifiers must be on the substrate-agnostic allowlist', t => {
  const entries = collectFiles(resolve(__dirname, '../../src/core'), ['.js', '.d.ts']);
  const violations = [];
  const visited = new Set();
  for (const entry of entries) walkImports(entry, visited, violations, {allowedBareSpecifiers: CORE_ALLOWED_BARE_SPECIFIERS});
  const bare = violations.filter(v => v.kind === 'bare-specifier');
  if (bare.length) console.error('Bare-specifier violations:', JSON.stringify(bare, null, 2));
  t.equal(bare.length, 0, `every bare specifier in /core is on the known-portable allowlist (${[...CORE_ALLOWED_BARE_SPECIFIERS].join(', ')})`);
});

test('browser-safety: /web .js + .d.ts have no node:* / builtin imports, no DuplexOptions extends, no /// <reference types="node" />', t => {
  const entries = collectFiles(resolve(__dirname, '../../src/web'), ['.js', '.d.ts']);
  const violations = [];
  const visited = new Set();
  for (const entry of entries) walkImports(entry, visited, violations);
  if (violations.length) console.error('Violations:', JSON.stringify(violations, null, 2));
  t.equal(violations.length, 0, 'no Node leaks reachable from /web (runtime or type-level)');
});
