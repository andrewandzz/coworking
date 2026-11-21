import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { text } from 'node:stream/consumers';
import { createManagerPasswordHash, MAX_MANAGER_PASSWORD_LENGTH } from '../src/manager-auth/manager-password.ts';

async function readPassword() {
  if (!process.stdin.isTTY) return (await text(process.stdin)).replace(/\r?\n$/, '');

  const hiddenOutput = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const terminal = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true });
  const abort = new AbortController();
  terminal.once('SIGINT', () => abort.abort());
  terminal.once('close', () => abort.abort());
  process.stderr.write('Введіть пароль менеджера: ');

  try {
    return await terminal.question('', { signal: abort.signal });
  } finally {
    terminal.close();
    process.stderr.write('\n');
  }
}

try {
  const password = await readPassword();
  if (!password || password.length > MAX_MANAGER_PASSWORD_LENGTH) {
    console.error(`Пароль має містити від 1 до ${MAX_MANAGER_PASSWORD_LENGTH} символів.`);
    process.exitCode = 1;
  } else {
    console.log(`MANAGER_PASSWORD_HASH=${await createManagerPasswordHash(password)}`);
  }
} catch (error) {
  if (error.name !== 'AbortError') throw error;
  process.exitCode = 130;
}
