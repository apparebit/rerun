# rerun

```bash
$ ./init.sh
INFO  Upgrading Homebrew
INFO  Checking Node.js
INFO  Checking WABT
INFO  Checking Yarn
INFO  Happy, happy, joy, joy!
$ node src/main.js p1 p2 add
rerun p1 p2 add --> 666
$ node src/main.js p1 p2 add 3 div
rerun p1 p2 add 3 div --> 222
$ node src/main.js p1 p2 add 3 div 2 div 3 4 add mul
rerun p1 p2 add 3 div 2 div 3 4 add mul --> 777
```

## Remarks

For now I'm focusing on all aspects of WASM execution because it is the most
novel technology in play and therefore probably also the one causing the most
friction. Architecturally, I am assuming that each protection domain has its own
management process that accepts programs for execution and translates them down
to web assembly. For now, programs are written in __rerun__ (natch) and are
linear stream of tokens that manipulate a stack of int32 values. A well-formed
__rerun__ program starts with zero values on the stack and ends with one value
on the stack. Valid tokens are `add`, `div`, `mul`, `rem`, and `sub` for
arithmetic operations,  `$p1` and `$p2` to load the first or second argument
onto the stack, and any integer to load the literal value onto the stack. The
two arguments are 665 and 1.

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
