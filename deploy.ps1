$env:PATH = "C:\Program Files\nodejs;C:\Program Files\Git\bin;C:\Program Files\Git\cmd;$env:PATH"
$firebase = "C:\Users\nixek\AppData\Roaming\npm\node_modules\firebase-tools\lib\bin\firebase.js"
$vercel = "C:\Users\nixek\AppData\Roaming\npm\node_modules\vercel\dist\vc.js"
Set-Location "C:\Users\nixek\Documents\GitHub\headmate-mark-2"

Write-Host "=== Building ==="
& node node_modules/vite/bin/vite.js build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "=== Deploying to Firebase ==="
& node $firebase deploy --project headmate-mark-2 --only hosting

Write-Host "=== Deploying to Vercel ==="
& node $vercel --prod --yes