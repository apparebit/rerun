import { EOL } from 'os';
import { toWebAssembly, toWebAssemblyText } from './js/compile.js';

const { isTTY } = process.stdout;
const SGR = {
  BOLD1: isTTY ? '\x1b[1m' : '',
  BOLD0: isTTY ? '\x1b[22m' : '',
};

/**
 * Extract command line options. This function only recognizes `--name`
 * and `--no-name` for setting the `name` option to `true` and `false`,
 * respectively.
 */
function getOptions(args) {
  let options = {};

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
  if (rerun.length === 0) rerun = ['665'];

  // Compile rerun code to WASM via textual assembly.
  const wat = toWebAssemblyText(rerun);
  const wasm = await toWebAssembly(wat, options);

  // Compile WASM to native code and run it.
  const { instance } = await WebAssembly.instantiate(wasm);
  const result = instance.exports.compute(665, 1);

  // Print the result.
  console.log(`${SGR.BOLD1}rerun ${rerun.join(' ')} --> ${result}${SGR.BOLD0}`);
})();
