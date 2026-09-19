# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, or discussions.**

Report privately through GitHub's **[Private Vulnerability Reporting](https://github.com/uhop/stream-json/security/advisories/new)**
(the "Report a vulnerability" button under the repository's **Security** tab). This opens a
confidential advisory visible only to the maintainers and you.

If GitHub reporting is unavailable to you, email the maintainer at
**eugene.lazutkin@gmail.com** with `SECURITY` in the subject line. Please do not disclose
details publicly until a fix is released.

When reporting, please include:

- the affected version(s) and runtime,
- the component and its options &mdash; which entry point, which filter or rule, which parser flags,
- a description of the issue and its impact,
- steps to reproduce: a document fed through a documented pipeline, with the timings or the
  observed value,
- any suggested remediation.

## Scope

`stream-json` turns JSON and JSONC text into a token stream and back. It opens no network
connections, spawns no processes, and touches no files except through the explicit file
components under `stream-json/file/`, which read the path your code hands them. Application code
assembles every pipeline and supplies its input.

**Intended input is data you own or trust** &mdash; database dumps, exports, logs, files your own
systems produce. The library is not designed for JSON or JSONC from the open internet or from
untrusted users, and the documentation says so.

That contract does not make hardening pointless, and two classes are in scope:

- **Disproportionate cost.** A crafted document that makes a documented component spend
  materially more than the bytes it carries &mdash; work that grows faster than the input does.
  Quadratic re-scans and per-token path joins have been fixed on these grounds.
- **A contract violation.** A documented component producing a value its contract forbids, or
  performing an operation its caller did not ask for. An assembled object whose prototype differs
  from what `JSON.parse` would produce was fixed on these grounds.

## Out of scope

**Calling the API in a loop.** A proof of concept that drives a component's methods directly, or
feeds it a document it was asked to process, and then reports that _n_ operations take _n_ units
of time describes cost, not a vulnerability. The caller chose the work. A report needs an attacker
model: who supplies the bytes, through which documented entry point, under what configuration, and
what the attacker gains that the caller did not already have.

**Memory proportional to the input.** Streaming bounds what the library holds at once; it does not
bound what your service accepts. A document that occupies memory because the client sent that many
bytes is your input limit's concern, not a defect here.

**Nesting past the documented cap.** Path filters (`pick`, `ignore`, `filter`, `replace`) and
`FlexAssembler` rules throw a `RangeError` beyond `maxDepth`, which defaults to `1024`. Passing
`Infinity` removes the cap and accepts the cost deliberately.

**`JSON.parse` parity.** A parsed object carrying an own `__proto__` property is what
`JSON.parse` produces, and matching it is deliberate. Prototype replacement is not: that was
fixed in 3.6.0.

## Scoring

The base score for this package uses **`AV:L`**. `stream-json` binds no network stack: a crafted
document reaches a component as a buffer or a file, and whether it arrived over a network is a
property of your deployment, which CVSS expresses through the consumer's environmental metrics
rather than the base vector. Published advisories here are scored that way, and a report submitted
with `AV:N` is rescored rather than rejected.

## Hardening already shipped

Read the [published advisories](https://github.com/uhop/stream-json/security/advisories) before
reporting a variant of a known issue:

- path filters cap nesting depth (3.5.0) and `FlexAssembler` rules do too (3.7.0), with matching
  now incremental rather than joining the path per check;
- assemblers create an own data property for a `__proto__` key, as `JSON.parse` does (3.6.0);
- JSONC comments stream instead of re-scanning from their opening on every chunk (3.6.0).

## Supported versions

Fixes are released against the latest published version. Please upgrade to the latest
`stream-json` release before reporting, and pin the fixed version once one is available.

## Disclosure process

- We aim to acknowledge a report within a few business days.
- We work to a coordinated-disclosure timeline (up to 90 days by default) and will keep you
  updated on progress toward a fix.
- With your permission, we credit reporters in the release notes and advisory. We are happy to
  coordinate a CVE through GitHub's CNA once a fix is validated.

Thank you for helping keep the ecosystem safe.
