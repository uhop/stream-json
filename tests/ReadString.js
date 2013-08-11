var util = require("util");
var Readable = require("stream").Readable;


function ReadString(string, options){
	Readable.call(this, options);
	this._string = string;
}
util.inherits(ReadString, Readable);

ReadString.prototype._read = function read(size){
	this.push(this._string, "utf8");
	this.push(null);
};


module.exports = ReadString;
