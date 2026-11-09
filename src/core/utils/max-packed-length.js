// @ts-self-types="./max-packed-length.d.ts"

// below V8's string-length limit (536,870,888), so the error is the parser's on every runtime
const DEFAULT_MAX_PACKED_LENGTH = 2 ** 28;

export default DEFAULT_MAX_PACKED_LENGTH;
export {DEFAULT_MAX_PACKED_LENGTH};
