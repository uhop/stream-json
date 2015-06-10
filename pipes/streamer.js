"use strict";


var EventStream = require("heya-events/EventStream");


// utilities

// long hexadecimal codes: \uXXXX
function fromHex(s){
	return String.fromCharCode(parseInt(s.slice(2), 16));
}

// short codes: \b \f \n \r \t \" \\ \/
var codes = {b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\", "/": "/"};


// Streamer

function Streamer(){
	this.stack = [];
	this.state = "";
	this.counter = 0;
}

Streamer.prototype = {
	callback: function(token, sink){
		switch(token.id){
			case "{": // object starts
				this.pushState("object");
				return {name: "startObject"};
			case "}": // object ends
				if(this.state === "number"){
					this.popState();
					sink.send({name: "endNumber"});
				}
				this.popState();
				return {name: "endObject"};
			case "[": // array starts
				this.pushState("array");
				return {name: "startArray"};
			case "]": // array ends
				if(this.state === "number"){
					this.popState();
					sink.send({name: "endNumber"});
				}
				this.popState();
				return {name: "endArray"};
			case "\"": // string starts/ends
				if(this.state === "string"){
					this.popState();
					return {name: this.state === "object" &&
						this.counter % 2 ? "endKey" : "endString"};
				}
				var t = this.state === "object" &&
					!(this.counter % 2) ? "startKey" : "startString";
				this.pushState("string");
				return {name: t};
			case "null": // null
				++this.counter;
				return {name: "nullValue", value: null};
			case "true": // true
				++this.counter;
				return {name: "trueValue", value: true};
			case "false": // false
				++this.counter;
				return {name: "falseValue", value: false};
			case "0": // number and its fragments
			case "+":
			case "-":
			case ".":
			case "nonZero":
			case "numericChunk":
			case "exponent":
				if(this.state !== "number"){
					sink.send({name: "startNumber"});
					this.pushState("number");
				}
				return {name: "numberChunk", value: token.value};
			case "plainChunk": // string fragments
				return {name: "stringChunk", value: token.value};
			case "escapedChars":
				return {name: "stringChunk", value:
					token.value.length == 2 ? codes[token.value.charAt(1)] : fromHex(token.value)};
		}
		// white space, punctuations
		if(this.state === "number"){
			this.popState();
			return {name: "endNumber"};
		}
		return sink.noValue;
	},
	stopback: function(value, sink){
		return this.state === "number" ? {name: "endNumber"} : sink.noValue;
	},

	pushState: function(state){
		this.stack.push({state: this.state, counter: this.counter});
		this.state   = state;
		this.counter = 0;
	},
	popState: function(){
		var frame    = this.stack.pop();
		this.state   = frame.state;
		this.counter = frame.counter + 1;
	}
};

function streamer(){
	var s = new Streamer();
	return new EventStream(s.callback.bind(s), null, s.stopback.bind(s));
}


module.exports = streamer;