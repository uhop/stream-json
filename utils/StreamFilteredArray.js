"use strict";


var util = require("util");
var Transform = require("stream").Transform;

var Assembler = require("./Assembler");

var Parser   = require("../Parser");
var Streamer = require("../Streamer");
var Packer   = require("../Packer");


function defaultObjectFilter () {}


function StreamFilteredArray(options){
	Transform.call(this, options);
	this._writableState.objectMode = true;
	this._readableState.objectMode = true;

	if(options && typeof options.objectFilter == "function"){
		this.objectFilter = options.objectFilter;
	}else{
		this.objectFilter = defaultObjectFilter;
	}
	this._processChunk = this._doCheck;
	this.subObjectCounter = 0;

	this.assembler = null;
	this.counter = 0;
}
util.inherits(StreamFilteredArray, Transform);

StreamFilteredArray.prototype.setObjectFilter = function setObjectFilter(newObjectFilter){
	if(typeof newObjectFilter != "function"){
		newObjectFilter = defaultObjectFilter;
	}
	this.objectFilter = newObjectFilter;
};

StreamFilteredArray.prototype._transform = function transform(chunk, encoding, callback){
	if(this.assembler){
		this._processChunk(chunk);
	}else{
		// first chunk should open an array
		if(chunk.name !== "startArray"){
			callback(new Error("Top-level object should be an array."));
			return;
		}
		this.assembler = new Assembler();
		this.assembler[chunk.name] && this.assembler[chunk.name](chunk.value);
	}
	callback();
};

StreamFilteredArray.prototype._doCheck = function doCheck(chunk){
	if(!this.assembler[chunk.name]){
		return;
	}

	this.assembler[chunk.name](chunk.value);

	if(!this.assembler.stack.length){
		if(this.assembler.current.length){
			this.push({index: this.counter++, value: this.assembler.current.pop()});
		}
		return;
	}

	if(this.assembler.key === null && this.assembler.stack.length){
		var result = this.objectFilter(this.assembler);
		if(result){
			this._processChunk = this._skipCheck;
		}else if(result === false){
			this._processChunk = this._skipObject;
		}
	}
};

StreamFilteredArray.prototype._skipCheck = function skipCheck(chunk){
	if(!this.assembler[chunk.name]){
		return;
	}

	this.assembler[chunk.name](chunk.value);

	if(!this.assembler.stack.length && this.assembler.current.length){
		this.push({index: this.counter++, value: this.assembler.current.pop()});
		this._processChunk = this._doCheck;
	}
};

StreamFilteredArray.prototype._skipObject = function skipObject(chunk){
	switch(chunk.name){
		case "startArray":
		case "startObject":
			++this.subObjectCounter;
			return;
		case "endArray":
		case "endObject":
			break;
		default:
			return;
	}
	if(this.subObjectCounter){
		--this.subObjectCounter;
		return;
	}

	this.assembler[chunk.name] && this.assembler[chunk.name](chunk.value);

	if(!this.assembler.stack.length && this.assembler.current.length){
		++this.counter;
		this.assembler.current.pop();
		this._processChunk = this._doCheck;
	}
};

StreamFilteredArray.make = function make(options){
	var streams = [new Parser(options), new Streamer(options)];

	var o = options ? Object.create(options) : {};
	o.packKeys = o.packStrings = o.packNumbers = true;

	streams.push(new Packer(o), new StreamFilteredArray(options));

	// connect pipes
	var input = streams[0], output = input;
	streams.forEach(function(stream, index){
		if(index){
			output = output.pipe(stream);
		}
	});

	return {streams: streams, input: input, output: output};
};

module.exports = StreamFilteredArray;
