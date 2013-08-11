# stream-json [![Build Status](https://secure.travis-ci.org/uhop/stream-json.png?branch=master)](http://travis-ci.org/uhop/stream-json)

`stream-json` is a collection of node.js 0.10 stream components for creating custom standard-compliant JSON processors, which requires a minimal memory footprint. It can parse JSON files far exceeding available memory. Even individual data items are streamed piece-wise. Streaming SAX-inspired event-based API is included as well.

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

The test file for `Parser` can be found in `tests/test_parser.js`. Actually all test files in `tests/` use `Parser`.

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

The test file for `Streamer` can be found in `tests/test_streamer.js`.

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

### Emitter

`Emitter` is a writeable stream, which consumes a stream of events, and emits them on itself.

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

fs.createReadStream(fname).
    pipe(parser).pipe(streamer).pipe(packer).pipe(emitter);
```

`options` can contain some technical parameters, and it is rarely needs to be specified. You can find it thoroughly documented in [node.js' Stream documentation](http://nodejs.org/api/stream.html).

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

The test file for `Filter` can be found in `tests/test_filter.js`.

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

`Source` is a convenience object. It connects individual streams with pipes, and attaches itself to the end emitting all events on itself (just like `Emitter`).

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

The test file for `Source` can be found in `tests/test_source.js`.

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

The test files for `Source` are `tests/test_main.js`, and `tests/test_chunk.js`.

## Advanced use

The whole library is organized as set of small components, which can be combined to produce the most effective pipeline. All components are based on node.js 0.10 [streams](http://nodejs.org/api/stream.html), and [events](http://nodejs.org/api/events.html). It is easy to add your own components to solve your unique tasks.

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

* `ws`: white spaces, usually ignored.
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
