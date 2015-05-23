"use strict";


var unit = require("heya-unit");

var fs = require("fs"), path = require("path"), zlib = require("zlib");

var createSource = require("../main");


unit.add(module, [
	function test_source(t){
		var async = t.startAsync("x");

		var plainCounter  = new Counter(),
			streamCounter = new Counter(),
			source = createSource();

		source.on("startObject", function(){ ++streamCounter.objects; });
		source.on("keyValue",    function(){ ++streamCounter.keys; });
		source.on("startArray",  function(){ ++streamCounter.arrays; });
		source.on("nullValue",   function(){ ++streamCounter.nulls; });
		source.on("trueValue",   function(){ ++streamCounter.trues; });
		source.on("falseValue",  function(){ ++streamCounter.falses; });
		source.on("numberValue", function(){ ++streamCounter.numbers; });
		source.on("stringValue", function(){ ++streamCounter.strings; });

		source.on("end", function(){
			eval(t.TEST("t.unify(plainCounter, streamCounter)"));
			async.done();
		});

		fs.readFile(path.resolve(__dirname, "./sample.json.gz"), function(err, data){
			if(err){ throw err; }
			zlib.gunzip(data, function(err, data){
				if(err){ throw err; }

				var o = JSON.parse(data);
				walk(o, plainCounter);

				fs.createReadStream(path.resolve(__dirname, "./sample.json.gz")).
					pipe(zlib.createGunzip()).pipe(source.input);
			});
		});
	}
]);


function Counter(){
	this.objects = 0;
	this.keys    = 0;
	this.arrays  = 0;
	this.nulls   = 0;
	this.trues   = 0;
	this.falses  = 0;
	this.numbers = 0;
	this.strings = 0;
}

function walk(o, counter){
	switch(typeof o){
		case "string":
			++counter.strings;
			return;
		case "number":
			++counter.numbers;
			return;
		case "boolean":
			if(o){
				++counter.trues;
			}else{
				++counter.falses;
			}
			return;
	}
	if(o === null){
		++counter.nulls;
		return;
	}
	if(o instanceof Array){
		++counter.arrays;
		o.forEach(function(o){ walk(o, counter); });
		return;
	}
	++counter.objects;
	for(var key in o){
		if(o.hasOwnProperty(key)){
			++counter.keys;
			walk(o[key], counter);
		}
	}
}
