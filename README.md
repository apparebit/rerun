# _rerun_ (remote run)

This repository contains a proof of concept for using WASM as the execution
substrate for remote code execution. To be somewhat realistic, the PoC has two
ways of generating WASM, i.e., it relies on `rustc` to compile code ahead of
time and it implements its own template-based translation scheme to compile code
at runtime. It instantiates both WASM modules, linking them with each other, and
then runs the code.

To run it yourself, your computer should have [Homebrew](https://brew.sh)
installed.

You pull in other necessary dependencies by executing `init.sh`. That script
uses Homebrew to update or install [Node.js](https://nodejs.org/en/), the
[WABT](https://github.com/WebAssembly/wabt) and
[Binaryen](https://github.com/WebAssembly/binaryen) WebAssembly toolkits, and
[Yarn](https://classic.yarnpkg.com/lang/en/). It directly installs
[Rust](https://www.rust-lang.org) and relies on `rustup` for installing Rust's
WASM target, assuming that neither has been installed already.

After successful installation, `init.sh` builds _relib_, rerun's Rust-based
standard library. You can also build _relib_ by executing `build.sh`. Either
way, the resulting _relib_ binary is in `wasm/relib.wasm`.

```console
$ ./init.sh
INFO  Upgrading Homebrew
INFO  Checking Node.js
INFO  Checking WABT
INFO  Checking Binaryen
INFO  Checking Yarn
INFO  Checking Rust
INFO  Checking Rust WASM Target
INFO  Building Relib
INFO  Happy, happy, joy, joy!
```

To run _rerun_ code, you invoke `node` on this repository's `main.js` script and
provide the _rerun_ code as command line arguments. Since the script has the
necessary shebang comment and file permission, you can even omit the `node`
command, e.g., `./main.js 665`.

Intermediate `.wat` and `.wasm` files are written into the `wasm` directory and,
by default, also deleted again. You can prevent their deletion by adding the
`--no-cleanup` command line option between script name and the first _rerun_
instruction, e.g., `./main.js --no-cleanup 665`.

```console
$ ./main.js p1 p2 add
rerun p1 p2 add --> 666
$ ./main.js p1 p2 add 3 div
rerun p1 p2 add 3 div --> 222
$ ./main.js p1 p2 add 3 div 2 div 3 4 add mul
rerun p1 p2 add 3 div 2 div 3 4 add mul --> 777
$ ./main.js 2 3 cpow
rerun 2 3 cpow --> 8
```

## The Big Picture

This project explores essential building blocks for secure remote code
execution, even when hosts are located in completely different organizations.

 1. Code is written in a high-level language with domain-specific extensions.
    Requests for remote execution include the code in the same format.

    Here: _rerun_, a contrived stack-based language for uint32 computations.

 2. The gate-keeping API authenticates the sender of a request, verifies that
    the code meets higher-level security constraints, possibly adds enforcement
    actions into the program, and then compiles it down to WASM. WebAssembly is
    an attractive execution substrate because it runs at close to native speeds
    yet by design preserves memory safety and enforces isolation.

    Here: _rerun_ is compiled to _wat_ by `toWebAssemblyText()` through template
    instantiation and then _wat_ is compiled to _wasm_ by `toWebAssembly()` with
    help of WABT.

 3. The resulting module is then handed off to a worker that loads the WASM,
    compiles it down to native code, links the native code, and runs the native
    code. The linking step is noteworthy because it determines what resources
    beyond memory and computation the code will be able to access. In other
    words, linking becomes an opportunity to enforce security constraints. In
    that, WebAssembly's design reflects best-practices capability-based designs.

    Here: _wasm_ compiled from _rerun_ is linked with another WASM module
    compiled from Rust.


## The Details: The _rerun_ Language

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
  * A token starting with a `c` and followed by at least one more letter results
    in a call to the eponymous rerun standard library function. The library
    specification currently includes a single function `pow`. It is implemented
    in Rust by a function `exponentiate`.

The stack must consist of exactly one value when the _rerun_ program has no
more instruction to execute. That value becomes the result of the computation.


## Things That Are Missing

This repository contains a basic proof of concept, focusing only on the
interplay between high-level scripting language, dynamically compiled
application-specific language, and ahead-of-time compiled library code written
in a systems language. Obviously, a real system would offer quite a few more
features, including:

  * API over HTTPS
  * Authentication, authorization
  * Richer source language
  * Resource controls
  * Persistent storage
  * Remote messaging

The last point is particularly interesting because it requires some way of
naming other locations and nodes. It's easy enough to follow web naming
conventions, i.e., utilize URLs with a new protocol prefix. Nonetheless, naming
is one of the hardest things to get right and there are subtle challenges here
as well. For example, `http` and `https` URLs name specific resources at
specific locations. That makes them relatively easy to create and resolve, but
also means that the named resources may just vanish at any moment. A more
persistent naming scheme typically requires a level of indirection and thereby
becomes more heavyweight in all aspects, including name registration, name
maintenance, and name resolution.

Both approaches assume that names are resolved per session. Not surprisingly,
that also is HTTP's model, with connections lasting for some time. But for
connecting computer services that may just fail or migrate, _late binding_ of
messages has been a more successful model and usually is provided by some kind
of "event bus" or "publish/subscribe" facility. Apple's Bonjour née Rendezvous
aka mDNS has some of the same properties.


## Getting Started with WebAssembly

### Documentation

I found [MDN's WebAssembly
guides](https://developer.mozilla.org/en-US/docs/WebAssembly) helpful in
learning how to use the JavaScript API and getting started writing WebAssembly
Text (WAT) code. Rust's [`wasm-bindgen`
Guide](https://rustwasm.github.io/docs/wasm-bindgen/) and particularly the
section on its [internal
design](https://rustwasm.github.io/docs/wasm-bindgen/contributing/design/index.html)
helped deepen my understanding of how JavaScript and Rust-generated WASM
interact in the current MVP (which only has four numeric types as value types
and cannot pass references between WASM modules themselves and from/to
JavaScript).

I also found the code of the
[rust-webpack-template](https://github.com/rustwasm/rust-webpack-template) and
the [Minimal Rust & WebAssembly
example](https://www.hellorust.com/demos/add/index.html) helpful.


### Tooling

`rustc` adds very large custom sections with debug information to the generated
WASM despite being invoked with `-C debuginfo=0`. While I immediately suspected
something like this, actually validating that hypothesis was a tad harder:

  * Running `wasm2wat` on a WASM file does not print custom sections unless
    invoked with `-v`. In that case, the tool prints SAX-like events while
    parsing the WASM.
  * Running `wasm-objdump -h` on the WASM file is the more suitable alternative,
    as it prints all sections including those with debug information.
  * Running `wasm-opt --strip-debug` on the WASM file removes all custom
    sections with debug information.
  * LTO is not enabled by default but also makes a big difference for file size.

Note that `wasm2wat`, `wat2wasm`, and `wasm-objdump` are shipped with WABT,
whereas `wasm-opt` is part of Binaryen. In short, if you are targeting WASM, you
probably want both toolkits installed.
