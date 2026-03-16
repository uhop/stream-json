/// <reference types="node" />

import {Duplex} from 'node:stream';

declare function emit<T extends NodeJS.ReadableStream>(stream: T): T;

export = emit;
