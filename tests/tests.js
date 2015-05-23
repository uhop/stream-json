"use strict";


var unit = require("heya-unit");

require("./test_classic.js");
require("./test_parser.js");
require("./test_streamer.js");
require("./test_packer.js");
require("./test_filter.js");
require("./test_escaped.js");
require("./test_source.js");
require("./test_emitter.js");
require("./test_assembler.js");
require("./test_array.js");


unit.run();
