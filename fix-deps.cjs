const { execSync } = require('child_process');
process.env.PATH = 'C:\\Program Files\\nodejs;' + process.env.PATH;
process.env.SystemRoot = process.env.SystemRoot || 'C:\\Windows';

try {
  console.log('Installing rollup...');
  execSync('npm install @rollup/rollup-win32-x64-msvc --save-optional', { stdio: 'inherit' });
} catch (e) {
  console.log('Rollup install failed, trying esbuild...');
}

// Try to reinstall node_modules
console.log('Reinstalling node_modules...');
execSync('npm install', { stdio: 'inherit' });