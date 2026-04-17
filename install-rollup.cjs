const { execSync } = require('child_process');

console.log('Installing rollup native...');
const rollupNative = '@rollup/rollup-win32-x64-msvc';
try {
  execSync(`npm install ${rollupNative} --save-exact`, { 
    stdio: 'inherit', 
    cwd: 'C:\\Users\\nixek\\Documents\\GitHub\\headmate-mark-2',
    env: { ...process.env, PATH: 'C:\\Program Files\\nodejs;' + process.env.PATH }
  });
  console.log('Done');
} catch(e) {
  console.log('Failed:', e.message);
}