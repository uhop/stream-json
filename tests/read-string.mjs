'use strict';

import {Readable} from 'node:stream';

export const readString = (string, quant, options) =>
  new Readable(
    Object.assign({objectMode: true}, options, {
      read() {
        if (isNaN(quant)) {
          this.push(string, 'utf8');
        } else if (string instanceof Buffer) {
          for (let i = 0; i < string.length; i += quant) {
            this.push(string.subarray(i, i + quant));
          }
        } else {
          for (let i = 0; i < string.length; i += quant) {
            this.push(string.substring(i, i + quant), 'utf8');
          }
        }
        this.push(null);
      }
    })
  );

export default readString;
