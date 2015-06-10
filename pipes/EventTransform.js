"use strict";


var util = require("util");
var Transform = require("stream").Transform;

var EventStream = require("heya-events/EventStream");


function EventTransform(options){
	Transform.call(this, options);
	this._readableState.objectMode = true;

	if(options && options.begin && options.end){
		this._chain = options.begin;
		var self = this;
		options.end.on(function(value){
			self.push(value);
		},
		null,
		function(){
			self._processStop();
		});
	}else{
		this.pushValue = this.push;
	}
}
util.inherits(EventTransform, Transform);

EventTransform.prototype.pushValue = function pushValue(value){
	this._chain.send(value);
};

EventTransform.prototype._processStop = function processStop(){
	this.pushValue = doNothing;
	this.push(null);
};


module.exports = EventTransform;
