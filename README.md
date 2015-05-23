# stream-json

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]


`stream-json` is a collection of node.js stream components for creating custom standard-compliant JSON processors, which requires a minimal memory footprint. It can parse JSON files far exceeding available memory. Even individual data items are streamed piece-wise. Streaming SAX-inspired event-based API is included as well.

Available components:

* Streaming JSON `Parser` based on [parser-toolkit](http://github.com/uhop/parser-toolkit).
* `Streamer`, which converts tokens into SAX-like event stream.
* `Packer`, which can assemble numbers, strings, and object keys from individual chunks. It is useful, when user knows that individual data items can fit the available memory. Overall, it makes the API simpler.
* `Filter`, which is a flexible tool to select only important sub-objects using either a regular expression, or a function.
* `Emitter`, which converts an event stream into events by bridging `stream.Writable` with `EventEmitter`.
* `Source`, which is a helper that connects streams using `pipe()` and converts an event stream on the end of pipe into events, similar to `Emitter`.

Additionally a helper function is available in the main file, which creates a `Source` object with a default set of stream components.

This toolkit is distributed under New BSD license.

See the full documentation below.

## Introduction

The simplest example (streaming from a file):

```js
var createSource = require("stream-json");

var fs = require("fs");

var source = createSource();

var objectCounter = 0;

source.on("startObject", function(){ ++objectCounter; });

source.on("end", function(){
    console.log("Found ", objectCounter, " objects.");
});

fs.createReadStream("sample.json").pipe(source.input);

```

## Installation

```
npm install stream-json
```

## Documentation

### Parser

This is the workhorse of the package. It is a transform stream, which consumes text, and produces a stream of tokens. It is always the first in a pipe chain being directly fed with a text from a file, a socket, the standard input, or any other text stream.

Its `Writeable` part operates in a buffer mode, while its `Readable` part operates in an [objectMode](http://nodejs.org/api/stream.html#stream_object_mode).

```js
var Parser = require("stream-json/Parser");
var parser = new Parser(options);

// Example of use:
var next = fs.createReadStream(fname).pipe(parser);
```

`options` can contain some technical parameters, and it is rarely needs to be specified. You can find it thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html).

The test files for `Parser`: `tests/test_parser.js`, `tests\manual\test_parser.js`. Actually all test files in `tests/` use `Parser`.

If you want to catch parsing errors, attach an error listener directly to a parser component &mdash; unlike data errors do not travel through stream pipes.

### Streamer

`Streamer` is a transform stream, which consumes a stream of tokens, and produces a stream of events. It is always the second in a pipe chain after the `Parser`. It knows JSON semantics and produces actionable events.

It operates in an [objectMode](http://nodejs.org/api/stream.html#stream_object_mode).

```js
var Streamer = require("stream-json/Streamer");
var streamer = new Streamer(options);

// Example of use:
var next = fs.createReadStream(fname).
                pipe(parser).pipe(streamer);
```

`options` can contain some technical parameters, and it is rarely needs to be specified. You can find it thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html).

Following is a list of all event objects produced by `Streamer`:

```js
{name: "startObject"};
{name: "endObject"};

{name: "startArray"};
{name: "endArray"};

{name: "startKey"};
{name: "stringChunk", value: "actual string value"};
{name: "endKey"};

{name: "startString"};
{name: "stringChunk", value: "actual string value"};
{name: "endString"};

{name: "startNumber"};
{name: "numberChunk", value: "actual string value"};
{name: "endNumber"};

{name: "nullValue", value: null};
{name: "trueValue", value: true};
{name: "falseValue", value: false};

```

The event stream is well-formed:

* All `startXXX` are balanced with `endXXX`.
* Between `startKey` and `endKey` can be zero or more `stringChunk` events. No other event are allowed.
* Between `startString` and `endString` can be zero or more `stringChunk` events. No other event are allowed.
* Between `startNumber` and `endNumber` can be one or more `numberChunk` events. No other event are allowed.
  * All number chunks combined constitute a valid number value.
  * Number chunk values are strings, not numbers!
* After `startObject` optional key-value pairs emitted in a strict pattern: a key-related events, a value, and this cycle can be continued until all key-value pairs are streamed.

The test files for `Streamer`: `tests/test_streamer.js` and `tests/manual/test_streamer.js`.

### Packer

`Packer` is a transform stream, which passes through a stream of events, optionally assembles keys, strings, and/or numbers from chunks, and adds new events with assembled values. It is a companion  for `Streamer`, which frees users from implementing the assembling logic, when it is known that keys, strings, and/or numbers will fit in the available memory.

It operates in an [objectMode](http://nodejs.org/api/stream.html#stream_object_mode).

```js
var Packer = require("stream-json/Packer");
var packer = new Packer(options);

// Example of use:
var next = fs.createReadStream(fname).
                pipe(parser).pipe(streamer).pipe(packer);
```

`options` contains some important parameters, and should be specified. It can contain some technical properties thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html). Additionally it recognizes following flags:

* `packKeys` can be `true` or `false`. If `true`, a key value is returned as a new event:

  ```js
  {name: "keyValue", value: "assembled key value"}
  ```

  `keyValue` event always follows `endKey`.
* `packStrings` can be `true` or `false`. If `true`, a string value is returned as a new event:

  ```js
  {name: "stringValue", value: "assembled string value"}
  ```

  `stringValue` event always follows `endString`.
* `packNumbers` can be `true` or `false`. If `true`, a number value is returned as a new event:

  ```js
  {name: "numberValue", value: "assembled number value"}
  ```

  `numberValue` event always follows `endNumber`.
  `value` of this event is a string, not a number. If user wants to convert it to a number, they can do it themselves. The simplest way to do it (assuming your platform and JavaScript can handle it), is to force it to a number:

  ```js
  var n = +event.value;
  ```

The test files for `Packer`: `tests/test_packer.js` and `tests/manual/test_packer.js`.

### Emitter

`Emitter` is a writeable stream, which consumes a stream of events, and emits them on itself. The standard `finish` event is used to indicate the end of a stream.

It operates in an [objectMode](http://nodejs.org/api/stream.html#stream_object_mode).

```js
var Emitter = require("stream-json/Emitter");
var emitter = new Emitter(options);

// Example of use:

emitter.on("startArray", function(){
    console.log("array!");
});
emitter.on("numberValue", function(value){
    console.log("number:", value);
});
emitter.on("finish", function(){
    console.log("done");
});

fs.createReadStream(fname).
    pipe(parser).pipe(streamer).pipe(packer).pipe(emitter);
```

`options` can contain some technical parameters, and it is rarely needs to be specified. You can find it thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html).

The test file for `Emitter`: `tests/test_emitter.js`.

### Filter

`Filter` is an advance selector for sub-objects from a stream of events.

It operates in an [objectMode](http://nodejs.org/api/stream.html#stream_object_mode).

```js
var Filter = require("stream-json/Filter");
var filter = new Filter(options);

// Example of use:
var next = fs.createReadStream(fname).
                pipe(parser).pipe(streamer).pipe(filter);
```

`options` contains some important parameters, and should be specified. It can contain some technical properties thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html). Additionally it recognizes following flags:

* `separator` is a string to use to separate key and index values forming a path in a current object. By default it is `.` (a dot).
* `filter` can be a regular expression, or a function. By default it allows all events.
  * If it is a function, this function is called in a context of a `Filter` object with two parameters:
    * `path`, which is an array of current key and index values. All keys are represented as strings, while all array indices are represented as numbers. It can be used to understand what kind of object we are dealing with.
    * `event` is an event object described above.
  The function should return a Boolean value, with `true` indicating that we are interested in this event, and it should be passed through.
  * If it is a regular expression, then a current `path` is joined be a `separator` and tested against the regular expression. If a match was found, it indicates that the event should be passed through. Otherwise it will be rejected.

`Filter` produces a well-formed event stream.

The test files for `Filter`: `tests/test_filter.js` and `tests/manual/test_filter.js`.

#### Path examples

Given a JSON object:

```js
{"a": [true, false, 0, null]}
```

The path of `false` as an array:

```js
["a", 1]
```

The same path converted to a string joined by a default separator `.`:

```js
"a.1"
```

### Source

`Source` is a convenience object. It connects individual streams with pipes, and attaches itself to the end emitting all events on itself (just like `Emitter`). The standard `end` event is used to indicate the end of a stream.

```js
var Source = require("stream-json/Source");
var source = new Source([parser, streamer, packer]);

// Example of use:

source.on("startArray", function(){
    console.log("array!");
});
source.on("numberValue", function(value){
    console.log("number:", value);
});

fs.createReadStream(fname).pipe(source.input);
```

The constructor of `Source` accepts one mandatory parameter:

* `streams` should be a non-empty array of pipeable streams. At the end the last stream should produce a stream of events.

When a stream ends, `Source` produces an event `end` without parameters.

The test files for `Source`: `tests/test_source.js` and `tests/manual/test_source.js`.

### main: createSource()

The main file contains a helper function, which creates a commonly used configuration of streams, and returns a `Source` object.

```js
var createSource = require("stream-json");
var source = createSource(options);

// Example of use:

source.on("startArray", function(){
    console.log("array!");
});
source.on("numberValue", function(value){
    console.log("number:", value);
});

fs.createReadStream(fname).pipe(source.input);
```

`options` can contain some technical parameters, and it is completely optional. You can find it thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html), and here. It is passed to `Parser`, `Streamer`, and `Packer`, so user can specify `options` documented for those objects.

Algorithm:

1. `createSource()` creates instances of `Parser` and `Streamer`, and pipes them one after another.
2. Then it checks if either of `packKeys`, `packStrings`, or `packNumbers` are specified in options.
   1. If any of them are `true`, a `Packer` instance is created with `options`, and added to the pipe.
   2. If all of them are unspecified, all pack flags are assumed to be `true`, and a `Packer` is created and added.
   3. If any of them are specified, yet all are `false`, `Packer` is not added.

The most common use case is to call `createSource()` without parametrs. In this case instances of `Parser`, `Streamer`, and `Packer` are piped together. This scenario assumes that all key, string, and/or number values can be kept in memory, so user can use simplified events `keyValue`, `stringValue`, and `numberValue`.

The test files for `createSource()` are `tests/test_source.js`, `tests/manual/test_main.js`, and `tests/manual/test_chunk.js`.

### ClassicParser

It is a drop-in replacement for `Parser`, but it can emit whitespace, yet it is slower than the main parser.

The test file for `ClassicParser`: `tests/test_classic.js`.

### utils/Assembler

A helper class to convert a JSON stream to a fully assembled JS object. It can be used to assemble sub-objects.

```js
var createSource = require("stream-json");
var Assembler    = require("stream-json/utils/Assembler");

var source    = createSource(options),
    assembler = new Assembler();

// Example of use:

source.output.on("data", function(chunk){
  assembler[chunk.name] && assembler[chunk.name](chunk.value);
});
source.output.on("end", function(){
  // here is our fully assembled object:
  console.log(assembler.current);
});

fs.createReadStream(fname).pipe(source.input);
```

`Assembler` is a simple state machine with an explicit stack. It exposes three properties:

* `current` &mdash; an object we are working with at the moment. It can be either an object or an array.
  * Initial value is `null`.
  * If top-level object is a primitive value (`null`, `true`, `false`, a number, or a string), it will be placed in `current` too.
* `key` &mdash; is a key value (a string) for a currently processed value, or `null`, if not expected.
  * If `current` is an object, a primitive value will be added directly to it using a current value of `key`.
  * After use `key` is assigned `null` to prevent memory leaks.
  * If `current` is an array, a primitive value will be added directly to it by `push()`.
* `stack` &mdash; an array of parent objects.
  * `stack` always grows/shrinks by two items: a value of `current` and a value of `key`.
  * When an object or an array is closed, it is added to its parent, which is removed from the stack to become a current object again.
  * While adding to a parent a saved key is used if needed. Otherwise the second value is ignored.
  * When an object or an array is started, the `current` object and `key` are saved to `stack`.

Obviously `Assembler` should be used only when you are sure that the result will fit into memory. It automatically means that all primitive values (strings or numbers) are small enough to fit in memory too. As such `Assembler` is meant to be used after `Packer`, which reconstructs keys, strings, and numbers from possible chunks.

On the other hand, we use `stream-json` when JSON streams are big, and `JSON.parse()` is not an option. But we use `Assembler` to assemble sub-objects. One way to do it is to start directing calls to `Assembler` when we already selected a sub-object with `Filter`. Another way is shown in `StreamArray`.

The test file for `Assembler`: `tests/test_assembler.js`.

### utils/StreamArray

This utility deals with a frequent use case: our JSON is an array of various sub-objects. The assumption is that while individual array items fit in memory, the array itself does not. Such files are frequently produced by various database dump utilities, e.g., [Django's dumpdata](https://docs.djangoproject.com/en/1.8/ref/django-admin/#dumpdata-app-label-app-label-app-label-model).

`StreamArray` produces a stream of objects in following format:

```js
{index, value}
```

Where `index` is a numberic index in the array starting from 0, and `value` is a corresponding value. All objects are produced strictly sequentially.

```js
var createSource = require("stream-json");
var StreamArray  = require("stream-json/utils/StreamArray");

var source = createSource(options),
    stream = StreamArray.make();

// Example of use:

stream.output.on("data", function(object){
  console.log(object.index, object.value);
});
stream.output.on("end", function(){
  console.log("done");
});

fs.createReadStream(fname).pipe(stream.input);
```

`StreamArray` is a constructor, which optionally takes one object: `options`. `options` can contain some technical parameters, and it is rarely needs to be specified. You can find it thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html).

Directly on `StreamArray` there is a class-level helper function `make()`, which helps to construct a proper pipeline. It is similar to `createSource()` and takes the same argument `options`. Internally it creates and connects `Parser`, `Streamer`, `Packer`, and `StreamArray`, and returns an object with three properties:

* `streams` &mdash; an array of streams so you can inspect them individually, if needed. They are connected sequentially in the array order.
* `input` &mdash; the beginning of a pipeline, which should be used as an input for a JSON stream.
* `output` &mdash; the end of a pipeline, which can be used for events, or to pipe the resulting stream of objects for futher processing.

The test file for `StreamArray`: `tests/test_array.js`.

## Advanced use

The whole library is organized as set of small components, which can be combined to produce the most effective pipeline. All components are based on node.js [streams](http://nodejs.org/api/stream.html), and [events](http://nodejs.org/api/events.html). It is easy to add your own components to solve your unique tasks.

The code of all components are compact and simple. Please take a look at their source code to see how things are implemented, so you can produce your own components in no time.

Obviously, if a bug is found, or a way to simplify existing components, or new generic components are created, which can be reused in a variety of projects, don't hesitate to open a ticket, and/or create a pull request.

## Credits

The test file `tests/sample.json.gz` is copied as is from an open source project [json-simple](https://code.google.com/p/json-simple/) under Apache License 2.0 and compressed with gzip.

## Apendix A: tokens

`Parser` produces a stream of tokens cortesy of [parser-toolkit](http://github.com/uhop/parser-toolkit). While normally user should use `Streamer` to convert them to a much simpler JSON-aware event stream, in some cases it can be advantageous to deal with raw tokens.

Each token is an object with following properties:

* `id` is a string, which uniquely identifies a token.
* `value` is a string, which corresponds to this token, and was actually matched.
* `line` is a line number, where this token was found. All lines are counted from 1.
* `pos` is a position number inside a line (in characters, so `\t` is one character). Position is counted from 1.

JSON grammar is defined in `Grammar.js`. It is taken almost verbatim from [JSON.org](http://json.org/).

Following tokens are produced (listed by `id`):

* `ws`: white spaces, usually ignored. (Produced only by `ClassicParser`.)
* `-`: a unary negation used in a negative number either to start a number, or as an exponent sign.
* `+`: used as an exponent sign.
* `0`: zero, as is - '0'.
* `nonZero`: non-zero digit - `/[1-9]/`.
* `.`: a decimal point used in a number.
* `exponent`: 'e' or 'E' as an exponent symbol in a number written in scientific notation.
* `numericChunk`: a string of digits.
* `"`: a double quote, used to open and close a string.
* `plainChunk`: a string of non-escaped characters, used inside a string.
* `escapedChars`: an escaped character, used inside a string.
* `true`: represents a literal `true`.
* `false`: represents a literal `false`.
* `null`: represents a literal `null`.
* `{`: starts an object literal.
* `}`: closes an object literal.
* `[`: starts an array literal.
* `]`: closes an array literal.
* `,`: separates components of an array, or an object.
* `:`: separates a key and its value in an object literal.

## Release History

- 0.2.0 *new faster parser, formal unit tests, added utilities to assemble objects on the fly.*
- 0.1.0 *bug fixes, more documentation.*
- 0.0.5 *bug fixes.*
- 0.0.4 *improved grammar.*
- 0.0.3 *the technical release.*
- 0.0.2 *bug fixes.*
- 0.0.1 *the initial release.*

[npm-image]:      https://img.shields.io/npm/v/stream-json.svg
[npm-url]:        https://npmjs.org/package/stream-json
[deps-image]:     https://img.shields.io/david/uhop/stream-json.svg
[deps-url]:       https://david-dm.org/uhop/stream-json
[dev-deps-image]: https://img.shields.io/david/dev/uhop/stream-json.svg
[dev-deps-url]:   https://david-dm.org/uhop/stream-json#info=devDependencies
[travis-image]:   https://img.shields.io/travis/uhop/stream-json.svg
[travis-url]:     https://travis-ci.org/uhop/stream-json
