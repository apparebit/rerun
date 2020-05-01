# _rerun_ (remote run)

To run the code in this repository, your computer should have
[Homebrew](https://brew.sh) installed. You pull in other necessary dependencies
by executing `init.sh`. That script updates or installs
[Node.js](https://nodejs.org/en/), the [WebAssembly Binary Toolkit
(WABT)](https://github.com/WebAssembly/wabt), and
[Yarn](https://classic.yarnpkg.com/lang/en/), all via Homebrew. It also installs
[Rust](https://www.rust-lang.org) if not already installed and Rust's WASM
target.

```console
$ ./init.sh
INFO  Upgrading Homebrew
INFO  Checking Node.js
INFO  Checking WABT
INFO  Checking Yarn
INFO  Checking Rust WASM Target
INFO  Happy, happy, joy, joy!
```

To run _rerun_ code, you invoke `node` with this repository's `main.js` script.
The _rerun_ code follows as command line arguments, e.g., `node main.js 665`.

Intermediate `.wat` and `.wasm` files are written into the `tmp` directory and,
by default, also deleted again. You can prevent their deletion by adding the
`--no-cleanup` command line option between script name and the first
_rerun_ token, e.g., `node main.js --no-cleanup 665`.

```console
$ node main.js p1 p2 add
rerun p1 p2 add --> 666
$ node main.js p1 p2 add 3 div
rerun p1 p2 add 3 div --> 222
$ node main.js p1 p2 add 3 div 2 div 3 4 add mul
rerun p1 p2 add 3 div 2 div 3 4 add mul --> 777
```

## The Big Picture

This project explores essential building blocks for secure remote code
execution, even when hosts are located in completely different organizations.

 1. Code is written in a high-level language with domain-specific extensions.
    Requests for remote execution include the code in the same format.

    Here: _rerun_, a novel stack-based language for uint32 computations.

 2. The gate-keeping API authenticates the sender of a request, verifies that
    the code meets higher-level security constraints, possibly adds enforcement
    actions into the program, and then compiles it down to WASM. WebAssembly is
    an attractive execution substrate because it runs at close to native speeds
    yet by design preserves memory safety and enforces isolation.

    Here: _rerun_ is compiled to _wat_ is compiled to _wasm_.

 3. The resulting module is then handed off to a worker that loads, compiles,
    links, and runs the program. The linking step is noteworthy here because it
    determines what resources beyond memory and computation the code will be
    able to access. As long as the security policy allows it, that may include
    (semistructured) storage as well as remote messaging. If the policy does not
    allow it, the linker provides an alternative implementation that simply
    errors.


## The _rerun_ Language

_rerun_ programs have no structure and consist of a stream of tokens. Each token
is a self-contained instruction that manipulates a runtime stack by pushing a
value onto the stack, by popping one or two values from the stack, or by doing
both. Valid tokens are:

  * `p1` and `p2` push the first and second argument respectively onto the
    stack. These so-called arguments appear to always be the same, namely `665`
    and `1`.
  * A token consisting of only digits pushes the equivalent uint32 value onto
    the stack.
  * `add`, `div`, `mul`, `rem`, and `sub` implement the binary arithmetic
    operations implied by their names by popping the top two values from the
    stack and thereafter pushing the result onto the stack.
  * __Not yet supported and subject to change__: A token starting with a `c` and
    followed by at least one more letter results in a call to the eponymous
    _rerun_ standard library function. Currently, the standard library is rather
    sparse and only supports `cpow`, which implements exponentiation.

The stack must consist of exactly one value when the _rerun_ program has no
more tokens to execute. That value becomes the result of the computation.


## Notes

Things a real system should have:

  * HTTPS
  * Authentication
  * Richer source language
  * Resource controls
  * Persistent storage
  * Message ports

The last one is interesting because it requires some naming scheme. It's easy
enough to reuse web naming conventions and, probably, not a bad start. But that
requires careful consideration of whether names should be specific to a
host/location or if they name some abstract resource, with automatic resolution.


## Acknowledgements

The [rust-webpack-template](https://github.com/rustwasm/rust-webpack-template)
certainly was helpful in getting Rust to play nice. So was the [Minimal Rust &
WebAssembly example](https://www.hellorust.com/demos/add/index.html).
