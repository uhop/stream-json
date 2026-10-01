/** A JSON number that keeps its exact decimal value. */
export class ExactNumber {
  /** @param text - A JSON number literal. */
  constructor(text: string);
  /** `true` if the value has no fractional part. */
  get isInteger(): boolean;
  /** The value as a canonical plain decimal: no exponent, no trailing fractional zeros, no negative zero. */
  toString(): string;
  /** The nearest `number`. */
  valueOf(): number;
  /** The integer value. Throws a `RangeError` if the value is not an integer. */
  toBigInt(): bigint;
}

/** Converts a number literal to a `bigint` if its value is an integer outside the safe range, otherwise to a `number`. */
export function toBigIntOrNumber(str: string): number | bigint;

/** Converts a number literal to an `ExactNumber`; `NaN`, `Infinity`, and `-Infinity` become the matching `number`. */
export function toExactOrNumber(str: string): number | ExactNumber;

/** Returns the converter for an assembler `numbers` mode, or `null` for the default `'double'` mode. */
export function numberConverter(mode: 'double' | 'bigint' | 'exact' | undefined): ((str: string) => number | bigint | ExactNumber) | null;
