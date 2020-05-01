import { fileURLToPath } from 'url';
import { join } from 'path';
import { readFile, unlink, writeFile } from 'fs/promises';
import spawn from './spawn.js';

const tmp = fileURLToPath(new URL('../tmp/', import.meta.url));

const scaffold = (body) => `
(module
  (func $compute (param $p1 i32) (param $p2 i32) (result i32)
    ${body})
  (export "compute" (func $compute))
)`;

/** Translate from the tokens of the rerun language to WAT. */
export function toWebAssemblyText(tokens) {
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
export async function toWebAssembly(assembly, { cleanup = true } = {}) {
  // The process number is a quick and evil hack to ensure that concurrently
  // running reruns don't interfere with each other.
  const stem = `rerun${process.pid}`;
  const wat = join(tmp, `${stem}.wat`);
  const wasm = join(tmp, `${stem}.wasm`);

  try {
    await writeFile(wat, assembly, 'utf8');
    await spawn(`wat2wasm`, [wat, '-o', wasm], { cwd: tmp });
    return await readFile(wasm);
  } finally {
    if (cleanup) {
      await unlink(wat);
      await unlink(wasm);
    }
  }
}
