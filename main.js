#!/usr/bin/env node

import { EOL } from 'os';
import importWebAssembly from './js/import-wasm.js';

const { create } = Object;

// ANSI escape codes for redder or bolder output.
const { isTTY } = process.stdout;
const err = isTTY ? (s) => `\x1b[31;1m${s}\x1b[39;22m` : (s) => s;
const info = isTTY ? (s) => `\x1b[1m${s}\x1b[22m` : (s) => s;

/**
 * Extract command line options. This function only recognizes `--name`
 * and `--no-name` for setting the `name` option to `true` and `false`,
 * respectively.
 */
function getOptions(args) {
  // `options` is indexed by keys from command line. Hence, make it a
  // prototype-free object to prevent poisoning attacks via `--__proto__`.
  let options = create(null);

  for (
    let index = 0;
    index < args.length && args[index].startsWith('--');
    index++
  ) {
    let key = args.shift().slice(2);
    let value = true;

    if (key === '') {
      break;
    } else if (key.startsWith('no-')) {
      key = key.slice(3);
      value = false;
    }

    options[key] = value;
  }

  return options;
}

/** Run this tool. */
(async function main() {
  // Separate options from rerun code.
  let rerun = process.argv.splice(2);
  const options = getOptions(rerun);

  try {
    // (1) Compile to and import web assembly. (2) Run code. (3) Print result.
    const wasm = await importWebAssembly(rerun, options);
    const result = wasm.exports.compute(665, 1);
    console.log(info(`rerun ${rerun.join(' ')} --> ${result}`));
  } catch (x) {
    console.error(err(x.message));
  }
})();
