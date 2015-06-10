"use strict";


var util = require("util");
var Transform = require("stream").Transform;

var Pipe = require("heya-pipe/Pipe");
var objectCompiler = require("heya-pipe/object");


function doNothing(){};

function Sink(parent){
	this._parent = parent;
}

Sink.prototype = {
	noValue:   {},
	stopValue: {},
	send: function(value){
		if(value === this.stopValue){
			return this.stop();
		}
		if(value !== this.noValue){
			this._parent.push(value);
		}
	},
	sendError: function(value){
		throw value;
	},
	stop: function(){
		this._parent._processStop();
	}
};


function PipeTransform(options){
	Transform.call(this, options);
	this._readableState.objectMode = true;

	if(options && options.pipeObject){
		this._pipeObject = options.pipeObject instanceof Pipe ?
			objectCompiler(options.pipeObject) : options.pipeObject;
	}

	if(this._pipeObject){
		this._sink = new Sink(this);
		this._pipeObject.start(this);
		this.on("end", (function(){
			if(!this._pipeObject.isStopped()){
				this._pipeObject.stop();
			}
		}).bind(this));
	}else{
		this.pushValue = this.push;
	}
}
util.inherits(PipeTransform, Transform);

PipeTransform.prototype.pushValue = function pushValue(value){
	value = this._pipeObject.process(value, this._sink);
	if(value === this._sink.stopValue){
		return this._parent._processStop();
	}
	if(value !== this._sink.noValue){
		this.push(value);
	}
};

PipeTransform.prototype._processStop = function processStop(){
	this.pushValue = doNothing;
	this.push(null);
	this._pipeObject.stop(this._sink);
};

PipeTransform.prototype.isStopped = function isStopped(){
	return !this._pipeObject || this._pipeObject.isStopped();
};

PipeTransform.prototype.getResult = function getResult(){
	return this._pipeObject && this._pipeObject.getResult();
};


module.exports = PipeTransform;
