var Parser   = require("./Parser");
var Streamer = require("./Streamer");
var Packer   = require("./Packer");
var Source   = require("./Source");


function createSource(options){
	var streams = [new Parser(options), new Streamer(options)];
	if(options && ("packKeys" in options || "packStrings" in options || "packNumbers" in options)){
		if(options.packKeys || options.packStrings || options.packNumbers){
			streams.push(new Packer(options));
		}
	}else{
		var o = options ? Object.create(options) : {};
		o.packKeys = o.packStrings = o.packNumbers = true;
		streams.push(new Packer(o));
	}
	return new Source(streams);
}


module.exports = createSource;
