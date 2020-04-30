import { toWebAssembly, toWebAssemblyText } from './src/compile.js';

async function main() {
  const args = process.argv.splice(2);
  const wat = toWebAssemblyText(args);
  const wasm = await toWebAssembly(wat);
  const { instance } = await WebAssembly.instantiate(wasm);
  const result = instance.exports.compute(665, 1);
  console.log(`rerun ${args.join(' ')} --> ${result}`);
}

main();
