'use strict';

const unit = require('heya-unit');

require('./test_parser');
require('./test_main');
require('./test_filter');
require('./test_escaped');
require('./test_emitter');
require('./test_assembler');
require('./test_stringer');
require('./test_primitives');
require('./test_sliding');
require('./test_array');
require('./test_object');
require('./test_values');
require('./test_pick');
require('./test_replace');
require('./test_ignore');
require('./test_disassembler');
require('./test_verifier');
require('./test_batch');

unit.run();
