// Browser-safe shim for `node:string_decoder` used by stream-chain's
// `fixUtf8Stream`. The shim adapts `TextDecoder` (Web platform) to the
// `write` / `end` shape the original Node API provides. Wired in via the
// `tape6.importmap` entry in package.json so browser tests can resolve the
// node: specifier when running outside Node.

export class StringDecoder {
  constructor(encoding = 'utf-8') {
    this.decoder = new TextDecoder(encoding);
  }
  write(chunk) {
    if (typeof chunk === 'string') return chunk;
    return this.decoder.decode(chunk, {stream: true});
  }
  end(chunk) {
    if (chunk == null) return this.decoder.decode();
    if (typeof chunk === 'string') return chunk;
    return this.decoder.decode(chunk);
  }
}

export default {StringDecoder};
