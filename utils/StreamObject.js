"use strict";

var util = require("util");
var Transform = require("stream").Transform;
var Assembler = require("./Assembler");
var Combo = require("../Combo");

function StreamObject(options){
	Transform.call(this, options);
	this._writableState.objectMode = true;
	this._readableState.objectMode = true;

	this._assembler = null;
	this._isInitial = true;
	this._depth = 0;
}
util.inherits(StreamObject, Transform);

StreamObject.prototype._transform = function transform(chunk, encoding, callback){
	// first chunk should open an object
	if(this._isInitial){
		if(chunk.name !== "startObject") {
			return callback(new Error("Top-level construct should be an object."));
		}
		this._assembler = new Assembler();
		this._isInitial = false;
	}

	switch(chunk.name){
		case "startObject":
		case "startArray":
			this._depth++;
			break;
		case "endObject":
		case "endArray":
			this._depth--;
			break;
		case "keyValue":
			if(this._depth === 1){
				this._currentKey = chunk.value;
			}
			break;
	}

	if(this._currentKey){
		this._assembler[chunk.name] && this._assembler[chunk.name](chunk.value);
	}

	if(this._depth === 1 && this._assembler.current){
		this.push({key: this._currentKey, value: this._assembler.current});
		this._assembler.current = this._currentKey = null;
	}

	callback();
};

StreamObject.make = function make(options){
	var o = options ? Object.create(options) : {};
	o.packKeys = o.packStrings = o.packNumbers = true;

	var streams = [new Combo(o), new StreamObject(options)];

	// connect pipes
	var input = streams[0], output = input;
	streams.forEach(function(stream, index){
		if(index){
			output = output.pipe(stream);
		}
	});

	return {streams: streams, input: input, output: output};
};

module.exports = StreamObject;
