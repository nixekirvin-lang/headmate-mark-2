const { execSync } = require('child_process');

const pathEnv = 'C:\\Program Files\\nodejs;C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem;';
const newEnv = { ...process.env, PATH: pathEnv + process.env.PATH, SystemRoot: 'C:\\Windows' };

// Run vite directly
const viteJs = 'C:\\Users\\nixek\\Documents\\GitHub\\headmate-mark-2\\node_modules\\vite\\bin\\vite.js';

console.log('=== Building ===');
try {
  execSync(`"C:\\Program Files\\nodejs\\node.exe" "${viteJs}" build`, { 
    env: newEnv, stdio: 'inherit', cwd: 'C:\\Users\\nixek\\Documents\\GitHub\\headmate-mark-2', shell: true 
  });
} catch (e) {
  console.log('Build failed:', e.message);
  process.exit(1);
}