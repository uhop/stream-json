"use strict";


var util = require("util");
var Transform = require("stream").Transform;


function Filter(options){
	Transform.call(this, options);
	this._writableState.objectMode = true;
	this._readableState.objectMode = true;

	var f = options.filter;
	if(typeof f == "function"){
		this._func = f;
	}else if(f instanceof RegExp){
		this._regexp = f;
		this._func = this._pattern;
	}else{
		this._func = this._allowAll;
	}
	this._separator = options.separator || ".";

	this._previous = [];
	this._stack = [];
	this._collectKey = false;
	this._key = "";
}
util.inherits(Filter, Transform);

Filter.prototype._transform = function transform(chunk, encoding, callback){
	// skip keys
	if(this._collectKey){
		if(chunk.name === "endKey"){
			this._collectKey = false;
			this._stack.pop();
			this._stack.push(this._key);
			this._key = "";
		}else{
			this._key += chunk.value;
		}
		callback();
		return;
	}

	switch(chunk.name){
		case "startKey":
			this._collectKey = true;
			// intentional fall down
		case "keyValue":
			callback();
			return;
		case "endObject":
		case "endArray":
			this._stack.pop();
			break;
	}

	// check if the chunk should be outputted
	if(this._func(this._stack, chunk)){
		switch(chunk.name){
			case "startObject":
				this._stack.push(true);
				this._sync();
				break;
			case "startArray":
				this._stack.push(0);
				this._sync();
				break;
			case "endObject":
			case "endArray":
				this._sync();
				break;
			default:
				this._sync();
				this.push(chunk);
				break;
		}
	}

	// update stack
	switch(chunk.name){
		case "endObject":
		case "endArray":
		case "endString":
		case "endNumber":
		case "nullValue":
		case "trueValue":
		case "falseValue":
			// update array's index
			var index = this._stack.pop();
			this._stack.push(typeof index == "number" ? index + 1 : index);
			break;
	}
	callback();
};

Filter.prototype._flush = function flush(callback){
	this._stack = [];
	this._sync();
	callback();
}

Filter.prototype._sync = function sync(){
	var p = this._previous, pl = p.length,
		s = this._stack, sl = s.length,
		n = Math.min(pl, sl), i, j, value;
	for(i = 0; i < n && p[i] === s[i]; ++i);
	if(pl === sl && i >= n){
		return;
	}
	for(j = pl - 1; j > i; --j){
		value = p[j];
		this.push({name: typeof value == "number" ? "endArray" : "endObject"});
	}
	if(pl <= i){
		value = s[i];
		this.push({name: typeof value == "number" ? "startArray" : "startObject"});
	}
	if(sl <= i){
		value = p[i];
		this.push({name: typeof value == "number" ? "endArray" : "endObject"});
	}
	if(i < sl){
		value = s[i];
		if(typeof value == "string"){
			this.push({name: "startKey"});
			this.push({name: "stringChunk", value: value});
			this.push({name: "endKey"});
			this.push({name: "keyValue", value: value});
		}
		for(j = i + 1; j < sl; ++j){
			value = s[j];
			if(typeof value == "string"){
				this.push({name: "startObject"});
				this.push({name: "startKey"});
				this.push({name: "stringChunk", value: value});
				this.push({name: "endKey"});
				this.push({name: "keyValue", value: value});
			}else if(typeof value == "boolean"){
				this.push({name: "startObject"});
			}else{
				this.push({name: "startArray"});
			}
		}
	}
	this._previous = s.slice(0);
};

Filter.prototype._pattern = function pattern(path){
	return this._regexp.test(path.join(this._separator));
};

Filter.prototype._allowAll = function allowAll(){
	return true;
};


module.exports = Filter;
