import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { promisify } from 'util';
import { readFile, unlink, writeFile } from 'fs/promises';

const exec = promisify(execFile);
const { instantiate } = WebAssembly;
const wasmDirectory = fileURLToPath(new URL('../wasm/', import.meta.url));

const scaffold = (body) => `
(module
  (import "stdlib" "pow" (func $pow (param i32 i32) (result i32)))
  (func $compute (param $p1 i32) (param $p2 i32) (result i32)
    ${body})
  (export "compute" (func $compute))
)`;

// Translate from rerun language to WAT, while tracking each rerun instruction's
// stack depth to detect malformed source code before even compiling to WASM.
const toWebAssemblyText = (tokens) => {
  const instructions = [];
  let stack = 0;

  // Helper functions.
  const emit = (instruction) => instructions.push(`${instruction}\n    `);
  const id = (index, token) => `Rerun instruction #${index + 1} "${token}"`;
  const checkGet = () => (stack += 1);
  const checkBinaryOp = (index, token) => {
    if (stack < 2) {
      throw new Error(
        id(index, token) +
          ` requires two values on stack but there ` +
          (stack === 1 ? `is only one.` : `are none.`)
      );
    } else {
      stack -= 1;
    }
  };

  // The translation loop.
  for (const [index, token] of tokens.entries()) {
    switch (token) {
      case `p1`:
      case `p2`:
        emit(`local.get $${token}`);
        checkGet(index, token);
        break;

      case `add`:
      case `sub`:
      case `mul`:
        emit(`i32.${token}`);
        checkBinaryOp(index, token);
        break;

      case `div`:
      case `rem`:
        emit(`i32.${token}_u`);
        checkBinaryOp(index, token);
        break;

      case `cpow`:
        emit(`call $pow`);
        checkBinaryOp(index, token);
        break;

      default:
        if (/\d+/u.test(token)) {
          emit(`i32.const ${token}`);
          checkGet(index, token);
        } else {
          throw new Error(id(index, token) + ` is invalid.`);
        }
    }
  }

  if (stack !== 1) {
    throw new Error(
      `Rerun code leaves ${stack} value(s) on stack instead of just one.`
    );
  }
  return scaffold(instructions.join(``));
};

// Translate WAT to WASM with help of Web Assembly Binary Toolkit.
const toWebAssembly = async (assembly, { cleanup = true } = {}) => {
  // The process ID prevents concurrent runs from interfering with each other.
  const stem = `rerun${process.pid}`;
  const wat = join(wasmDirectory, `${stem}.wat`);
  const wasm = join(wasmDirectory, `${stem}.wasm`);

  try {
    // Write out WAT.
    try {
      await writeFile(wat, assembly, 'utf8');
    } catch (x) {
      throw new Error(`Unable to write ${wat} (x.message)`);
    }

    // Translate WAT to WASM.
    try {
      await exec(`wat2wasm`, [wat, '-o', wasm], { cwd: wasmDirectory });
    } catch (x) {
      throw new Error(x.stderr);
    }

    // Read in WASM.
    try {
      return await readFile(wasm);
    } catch (x) {
      throw new Error(`Unable to read ${wasm} (x.message)`);
    }
  } finally {
    if (cleanup) {
      try {
        await unlink(wat);
        await unlink(wasm);
      } catch {
        // If there is no file to delete something went wrong in outer
        // try/catch. Don't hide that error behind uninformative ENOENT error.
      }
    }
  }
};

/** Prepare for running rerun by creating and importing WASM module instance. */
export default async function importWebAssembly(rerun, options) {
  // First translate to WAT since that function also checks for rerun errors.
  const wat = toWebAssemblyText(rerun);

  // Import the standard library and create view with correct names.
  const relibWasm = await readFile(join(wasmDirectory, 'relib.wasm'));
  const relibModule = (await instantiate(relibWasm)).instance;
  const relib = { stdlib: { pow: relibModule.exports.exponentiate } };

  // Translate WAT to WASM and instantiate while linking against relib.
  const wasm = await toWebAssembly(wat, options);
  return (await instantiate(wasm, relib)).instance;
}
