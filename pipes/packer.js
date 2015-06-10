"use strict";


var EventStream = require("heya-events/EventStream");


function Packer(packKeys, packStrings, packNumbers){
	this.eventMap = {};
	this.buffer   = "";

	if(packKeys){
		this.eventMap.startKey    = "collectString";
		this.eventMap.endKey      = "sendKey";
	}
	if(packStrings){
		this.eventMap.startString = "collectString";
		this.eventMap.endString   = "sendString";
	}
	if(packNumbers){
		this.eventMap.startNumber = "collectNumber";
		this.eventMap.endNumber   = "sendNumber";
	}
}

Packer.prototype = {
	callback: function(item, sink){
		if(this.eventMap[item.name]){
			return this[this.eventMap[item.name]](item, sink);
		}
		return item;
	},
	addToBuffer: function(item, sink){
		this.buffer += item.value;
		return sink.noValue;
	},
	collectString: function(_, sink){
		this.eventMap.stringChunk = "addToBuffer";
		return sink.noValue;
	},
	collectNumber: function(_, sink){
		this.eventMap.numberChunk = "addToBuffer";
		return sink.noValue;
	},
	sendKey: function(_, sink){
		sink.send({name: "keyValue", value: this.buffer});
		this.buffer = "";
		this.eventMap.stringChunk = null;
		return sink.noValue;
	},
	sendString: function(_, sink){
		sink.send({name: "stringValue", value: this.buffer});
		this.buffer = "";
		this.eventMap.stringChunk = null;
		return sink.noValue;
	},
	sendNumber: function(_, sink){
		sink.send({name: "numberValue", value: this.buffer});
		this.buffer = "";
		this.eventMap.numberChunk = null;
		return sink.noValue;
	}
};

function packer(packKeys, packStrings, packNumbers){
	var p = new Packer(packKeys, packStrings, packNumbers);
	return new EventStream(p.callback.bind(p));
}



module.exports = packer;
