"use strict";


var EventStream = require("heya-events/EventStream");


function Filter(filter, separator){
	if(typeof filter == "function"){
		this.func = filter;
	}else if(filter instanceof RegExp){
		this.regexp = filter;
		this.func   = this.pattern;
	}else{
		this.func = this.allowAll;
	}
	this.separator = separator || ".";

	this.previous = [];
	this.stack = [];
	this.collectKey = false;
	this.key = "";
}

Filter.prototype = {
	callback: function(item, sink){
		// skip keys
		if(this.collectKey){
			if(item.name === "endKey"){
				this.collectKey = false;
				this.stack.pop();
				this.stack.push(this.key);
				this.key = "";
			}else{
				this.key += item.value;
			}
			return sink.noValue;
		}

		switch(item.name){
			case "startKey":
				this.collectKey = true;
				// intentional fall down
			case "keyValue":
				return sink.noValue;
			case "endObject":
			case "endArray":
				this.stack.pop();
				break;
		}

		// check if the item should be outputted
		if(this.func(this.stack, item)){
			switch(item.name){
				case "startObject":
					this.stack.push(true);
					this.sync(sink);
					break;
				case "startArray":
					this.stack.push(0);
					this.sync(sink);
					break;
				case "endObject":
				case "endArray":
					this.sync(sink);
					break;
				default:
					this.sync(sink);
					return item;
			}
		}

		// update stack
		switch(item.name){
			case "endObject":
			case "endArray":
			case "endString":
			case "endNumber":
			case "nullValue":
			case "trueValue":
			case "falseValue":
				// update array's index
				var index = this.stack.pop();
				this.stack.push(typeof index == "number" ? index + 1 : index);
				break;
		}
		return sink.noValue;
	},
	stopback: function(_, sink){
		this.stack = [];
		this.sync(sink);
		return sink.noValue;
	},
	sync: function(sink){
		var p = this.previous, pl = p.length,
			s = this.stack, sl = s.length,
			n = Math.min(pl, sl), i, j, value;
		for(i = 0; i < n && p[i] === s[i]; ++i);
		if(pl === sl && i >= n){
			return;
		}
		for(j = pl - 1; j > i; --j){
			value = p[j];
			sink.send({name: typeof value == "number" ? "endArray" : "endObject"});
		}
		if(pl <= i){
			value = s[i];
			sink.send({name: typeof value == "number" ? "startArray" : "startObject"});
		}
		if(sl <= i){
			value = p[i];
			sink.send({name: typeof value == "number" ? "endArray" : "endObject"});
		}
		if(i < sl){
			value = s[i];
			if(typeof value == "string"){
				sink.send({name: "startKey"});
				sink.send({name: "stringChunk", value: value});
				sink.send({name: "endKey"});
				sink.send({name: "keyValue", value: value});
			}
			for(j = i + 1; j < sl; ++j){
				value = s[j];
				if(typeof value == "string"){
					sink.send({name: "startObject"});
					sink.send({name: "startKey"});
					sink.send({name: "stringChunk", value: value});
					sink.send({name: "endKey"});
					sink.send({name: "keyValue", value: value});
				}else if(typeof value == "boolean"){
					sink.send({name: "startObject"});
				}else{
					sink.send({name: "startArray"});
				}
			}
		}
		this.previous = s.slice(0);
	},
	pattern: function(path){
		return this.regexp.test(path.join(this.separator));
	},
	allowAll: function allowAll(){
		return true;
	}
};

function flt(filter, separator){
	var f = new Filter(filter, separator);
	return new EventStream(f.callback.bind(f), null, f.stopback.bind(f));
}


module.exports = flt;
