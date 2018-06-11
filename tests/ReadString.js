const {Readable} = require('stream');

class ReadString extends Readable {
  static readString(string, quant, options) {
    return new ReadString(string, quant, options);
  }

  constructor(string, quant, options) {
    super(options);
    this._string = string;
    this._quant = quant;
  }
  _read(size) {
    if (isNaN(this._quant)) {
      this.push(this._string, 'utf8');
    } else {
      for (let i = 0; i < this._string.length; i += this._quant) {
        this.push(this._string.substr(i, this._quant), 'utf8');
      }
    }
    this.push(null);
  }
}
ReadString.make = ReadString.readString;

module.exports = ReadString;
