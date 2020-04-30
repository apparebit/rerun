import { readFile, unlink, writeFile } from 'fs/promises';
import { resolve } from 'path';
import spawn from './spawn.js';

const ARITH_OPS = {
  add: 2,
  sub: 2,
  mul: 2,
  div: 2,
};

const scaffold = (body) => `
(module
  (func $compute (param $p1 i32) (param $p2 i32) (result i32)
    ${body})
  (export "compute" (func $compute))
)`;

/** Translate from the tokens of the rerun language to WAT. */
export function toWebAssemblyText(tokens) {
  // A rerun program consists of tokens that correspond to WASM instructions:
  //         p1: load first i32 argument onto stack
  //         p2: load second i32 argument onto stack
  //        add: replace top two i32 values with sum
  //        sub: replace top two i32 values with difference
  //        mul: replace top two i32 values with product
  //        rem: replace top two i32 values with remainder
  //   <[0-9]+>: load literal value onto stack
  // All operations are _unsigned_.
  const instructions = [];
  const emit = (instruction) => instructions.push(`${instruction}\n    `);

  for (const token of tokens) {
    switch (token) {
      case `p1`:
      case `p2`:
        emit(`local.get $${token}`);
        break;

      case `add`:
      case `sub`:
      case `mul`:
        emit(`i32.${token}`);
        break;

      case `div`:
      case `rem`:
        emit(`i32.${token}_u`);
        break;

      default:
        if (/\d+/u.test(token)) {
          emit(`i32.const ${token}`);
        } else {
          throw new Error(`Invalid rerun token ${token}`);
        }
    }
  }

  return scaffold(instructions.join(``));
}

/**
 * Translate from WAT to WASM. This function may take a while because it defers
 * to an external tool.
 */
export async function toWebAssembly(assembly) {
  // The process number is a quick and evil hack to ensure that concurrently
  // running reruns don't interfere with each other.
  const stem = `rerun${process.pid}`;
  const wat = resolve(`${stem}.wat`);
  const wasm = resolve(`${stem}.wasm`);

  try {
    await writeFile(wat, assembly, 'utf8');
    await spawn(`wat2wasm`, [wat, '-o', wasm]);
    return await readFile(wasm);
  } finally {
    await unlink(wat);
    await unlink(wasm);
  }
}
