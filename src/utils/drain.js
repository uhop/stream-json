// @ts-self-types="./drain.d.ts"

// Deprecated re-export. `drain` is a generic stream-chain helper, not specific to
// JSON; import it from `stream-chain/utils/drain.js`. Kept here for back-compat;
// slated for removal in a future major.

import drain from 'stream-chain/utils/drain.js';

export default drain;
export * from 'stream-chain/utils/drain.js';
