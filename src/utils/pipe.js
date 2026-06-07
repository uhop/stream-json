// @ts-self-types="./pipe.d.ts"

// Deprecated re-export. `pipe` is a generic stream-chain helper, not specific to
// JSON; import it from `stream-chain/utils/pipe.js`. Kept here for back-compat;
// slated for removal in a future major.

import pipe from 'stream-chain/utils/pipe.js';

export default pipe;
export * from 'stream-chain/utils/pipe.js';
