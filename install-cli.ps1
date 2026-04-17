const { execSync } = require('child_process');
const path = 'C:\\Program Files\\nodejs;' + process.env.PATH;
execSync('npm i -g firebase-tools vercel', { 
  env: { ...process.env, PATH: path },
  stdio: 'inherit'
});