import { spawn as doSpawn } from 'child_process';

const { create } = Object;

/** Runt the given command with arguments and options. */
export default function spawn(command, args = [], options = {}) {
  if (!options.stdio) options.stdio = `inherit`;

  let resolve, reject;
  const promise = new Promise((yay, nay) => {
    resolve = yay;
    reject = nay;
  });

  const child = doSpawn(command, args);
  child.on('error', reject);
  child.on('exit', (code, signal) => {
    if (!code && !signal) {
      resolve(create(null));
    } else if (signal) {
      reject(new Error(`${command} terminated with signal ${signal}`));
    } else {
      reject(new Error(`${command} terminated with exit code ${code}`));
    }
  });

  return promise;
}
