"use strict";


var util = require("util");
var Transform = require("stream").Transform;


function Parser(options){
	Transform.call(this, options);
	this._writableState.objectMode = false;
	this._readableState.objectMode = true;

	this._buffer = "";
	this._done   = false;
	this._expect = "value";
	this._stack  = [];
	this._parent = "";
}
util.inherits(Parser, Transform);

Parser.prototype._transform = function transform(chunk, encoding, callback){
	this._buffer += chunk.toString();
	this._processInput(callback);
};

Parser.prototype._flush = function flush(callback){
	this._done = true;
	this._processInput(callback);
};

var value1  = /^(?:[\"\{\[\]\-0-9]|true\b|false\b|null\b|\s{1,256})/,
	string  = /^(?:[^\"\\]{1,256}|\\[bfnrt\"\\\/]|\\u[0-9a-fA-F]{4}|\")/,
	number0 = /^[0-9]/,
	number1 = /^\d{0,256}/,
	number2 = /^[\.eE]/,
	number3 = number0,
	number4 = number1,
	number5 = /^[eE]/,
	number6 = /^[-+]/,
	number7 = number0,
	number8 = number1,
	key1    = /^(?:[\"\}]|\s{1,256})/,
	colon   = /^(?:\:|\s{1,256})/,
	comma   = /^(?:[\,\]\}]|\s{1,256})/,
	ws      = /^\s{1,256}/;

Parser.prototype._processInput = function(callback){
	try{
		var match, value;
		main: for(;;){
			switch(this._expect){
				case "value1":
				case "value":
					match = value1.exec(this._buffer);
					if(!match){
						if(this._buffer){
							if(this._done){
								throw Error("Parser cannot parse input: expected a value");
							}
						}
						if(this._done){
							throw Error("Parser has expected a value");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					switch(value){
						case "\"":
							this.push({id: value, value: value});
							this._expect = "string";
							break;
						case "{":
							this.push({id: value, value: value});
							this._stack.push(this._parent);
							this._parent = "object";
							this._expect = "key1";
							break;
						case "[":
							this.push({id: value, value: value});
							this._stack.push(this._parent);
							this._parent = "array";
							this._expect = "value1";
							break;
						case "]":
							if(this._expect !== "value1"){
								throw Error("Parser cannot parse input: unexpected token ']'");
							}
							this.push({id: value, value: value});
							this._parent = this._stack.pop();
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
							break;
						case "-":
							this.push({id: value, value: value});
							this._expect = "number0";
							break;
						case "0":
							this.push({id: value, value: value});
							this._expect = "number2";
							break;
						case "1":
						case "2":
						case "3":
						case "4":
						case "5":
						case "6":
						case "7":
						case "8":
						case "9":
							this.push({id: "nonZero", value: value});
							this._expect = "number1";
							break;
						case "true":
						case "false":
						case "null":
							if(this._buffer.length === value.length && !this._done){
								// wait for more input
								break main;
							}
							this.push({id: value, value: value});
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
							break;
						// default: // ws
					}
					this._buffer = this._buffer.substring(value.length);
					break;
				case "keyVal":
				case "string":
					match = string.exec(this._buffer);
					if(!match){
						if(this._buffer){
							if(this._done || this._buffer.length >= 6){
								throw Error("Parser cannot parse input: escaped characters");
							}
						}
						if(this._done){
							throw Error("Parser has expected a string value");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					if(value === "\""){
						this.push({id: value, value: value});
						if(this._expect === "keyVal"){
							this._expect = "colon";
						}else{
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
						}
					}else if(value.length > 1 && value.charAt(0) === "\\"){
						this.push({id: "escapedChars", value: value});
					}else{
						this.push({id: "plainChunk", value: value});
					}
					this._buffer = this._buffer.substring(value.length);
					break;
				// number chunks
				case "number0": // [0-9]
					match = number0.exec(this._buffer);
					if(!match){
						if(this._buffer || this._done){
							throw Error("Parser cannot parse input: expected a digit");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					if(value === "0"){
						this.push({id: value, value: value});
						this._expect = "number2";
					}else{
						this.push({id: "nonZero", value: value});
						this._expect = "number1";
					}
					this._buffer = this._buffer.substring(value.length);
					break;
				case "number1": // [0-9]*
					match = number1.exec(this._buffer);
					value = match[0];
					if(value){
						this.push({id: "numericChunk", value: value});
						this._buffer = this._buffer.substring(value.length);
					}else{
						if(this._buffer){
							this._expect = "number2";
							break;
						}
						if(this._done){
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
							break;
						}
						// wait for more input
						break main;
					}
					break;
				case "number2": // [\.eE]?
					match = number2.exec(this._buffer);
					if(!match){
						if(this._buffer || this._done){
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
							break;
						}
						// wait for more input
						break main;
					}
					value = match[0];
					if(value === "."){
						this.push({id: value, value: value});
						this._expect = "number3";
					}else{
						this.push({id: "exponent", value: value});
						this._expect = "number6";
					}
					this._buffer = this._buffer.substring(value.length);
					break;
				case "number3": // [0-9]
					match = number3.exec(this._buffer);
					if(!match){
						if(this._buffer || this._done){
							throw Error("Parser cannot parse input: expected a fractional part of a number");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					this.push({id: "numericChunk", value: value});
					this._expect = "number4";
					this._buffer = this._buffer.substring(value.length);
					break;
				case "number4": // [0-9]*
					match = number4.exec(this._buffer);
					value = match[0];
					if(value){
						this.push({id: "numericChunk", value: value});
						this._buffer = this._buffer.substring(value.length);
					}else{
						if(this._buffer){
							this._expect = "number5";
							break;
						}
						if(this._done){
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
							break;
						}
						// wait for more input
						break main;
					}
					break;
				case "number5": // [eE]?
					match = number5.exec(this._buffer);
					if(!match){
						if(this._buffer){
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
							break;
						}
						if(this._done){
							this._expect = "done";
							break;
						}
						// wait for more input
						break main;
					}
					value = match[0];
					this.push({id: "exponent", value: value});
					this._expect = "number6";
					this._buffer = this._buffer.substring(value.length);
					break;
				case "number6": // [-+]?
					match = number6.exec(this._buffer);
					if(!match){
						if(this._buffer){
							this._expect = "number7";
							break;
						}
						if(this._done){
							throw Error("Parser has expected an exponent value of a number");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					this.push({id: value, value: value});
					this._expect = "number7";
					this._buffer = this._buffer.substring(value.length);
					break;
				case "number7": // [0-9]
					match = number7.exec(this._buffer);
					if(!match){
						if(this._buffer || this._done){
							throw Error("Parser cannot parse input: expected an exponent part of a number");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					this.push({id: "numericChunk", value: value});
					this._expect = "number8";
					this._buffer = this._buffer.substring(value.length);
					break;
				case "number8": // [0-9]*
					match = number8.exec(this._buffer);
					value = match[0];
					if(value){
						this.push({id: "numericChunk", value: value});
						this._buffer = this._buffer.substring(value.length);
					}else{
						if(this._buffer || this._done){
							if(this._parent){
								this._expect = this._parent === "object" ? "oComma" : "aComma";
							}else{
								this._expect = "done";
							}
							break;
						}
						// wait for more input
						break main;
					}
					break;
				case "key1":
				case "key":
					match = key1.exec(this._buffer);
					if(!match){
						if(this._buffer || this._done){
							throw Error("Parser cannot parse input: expected an object key");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					if(value === "\""){
						this.push({id: value, value: value});
						this._expect = "keyVal";
					}else if(value === "}"){
						if(this._expect !== "key1"){
							throw Error("Parser cannot parse input: unexpected token '}'");
						}
						this.push({id: value, value: value});
						this._parent = this._stack.pop();
						if(this._parent){
							this._expect = this._parent === "object" ? "oComma" : "aComma";
						}else{
							this._expect = "done";
						}
					}
					this._buffer = this._buffer.substring(value.length);
					break;
				case "colon":
					match = colon.exec(this._buffer);
					if(!match){
						if(this._buffer || this._done){
							throw Error("Parser cannot parse input: expected ':'");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					if(value === ":"){
						this.push({id: value, value: value});
						this._expect = "value";
					}
					this._buffer = this._buffer.substring(value.length);
					break;
				case "aComma":
				case "oComma":
					match = comma.exec(this._buffer);
					if(!match){
						if(this._buffer || this._done){
							throw Error("Parser cannot parse input: expected ','");
						}
						// wait for more input
						break main;
					}
					value = match[0];
					if(value === ","){
						this.push({id: value, value: value});
						this._expect = this._expect === "aComma" ? "value" : "key";
					}else if(value === "}" || value === "]"){
						this.push({id: value, value: value});
						this._parent = this._stack.pop();
						if(this._parent){
							this._expect = this._parent === "object" ? "oComma" : "aComma";
						}else{
							this._expect = "done";
						}
					}
					this._buffer = this._buffer.substring(value.length);
					break;
				case "done":
					match = ws.exec(this._buffer);
					if(!match){
						if(this._buffer){
							throw Error("Parser cannot parse input: unexpected characters");
						}
						// wait for more input
						break main;
					}
					this._buffer = this._buffer.substring(match[0].length);
					break;
			}
		}
	}catch(err){
		callback(err);
		return;
	}
	callback();
}

module.exports = Parser;
