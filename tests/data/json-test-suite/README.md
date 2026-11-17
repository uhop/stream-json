These files are the `test_parsing` and `test_transform` appendices to Nicolas Seriot's article [Parsing JSON is a Minefield](https://seriot.ch/security/parsing_json.html). They come from [JSONTestSuite](https://github.com/nst/JSONTestSuite) at commit `1ef36fa01286573e846ac449e8683f8833c5b26a`. See `LICENSE` for the MIT license notice.

The `test_parsing` filenames begin with `y_`, `n_`, or `i_`. These prefixes mean that the input is expected to be valid JSON, invalid JSON, or of an implementation-defined status, respectively. The tests use the prefixes to select the expected parser and verifier outcomes.

The 22 `test_transform` files have no expected answers. The tests parse each input, stringify the parsed values, parse and stringify that output again, and check that the second output matches the first.

The files are byte-exact. Many contain malformed data on purpose, including invalid UTF-8, NUL bytes, and UTF-16 encodings. Do not format or re-encode them. `.prettierignore` lists both data directories to prevent formatting changes.

The upstream `parsers/`, `results/`, `run_tests.py`, and `article/` contents are not included. This checkout includes only the `test_parsing` and `test_transform` input directories.

To refresh the files from a newer upstream commit, replace these two directories from that commit while preserving their bytes. From the stream-json repository root, run `git -C /path/to/JSONTestSuite archive <commit> test_parsing test_transform | tar -x -C tests/data/json-test-suite`, replacing `<commit>` with the desired full commit ID. Update the commit recorded above and check that `.prettierignore` still lists both directories.
