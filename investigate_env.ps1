$ErrorActionPreference = 'Stop'
Write-Host "PWD=$(Get-Location)"
Write-Host "=== App execution aliases (verbose) ==="
$aliases = @('python.exe','python3.exe','py.exe','pip.exe','npm.exe','node.exe')
foreach ($a in $aliases) {
  $full = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps' $a
  if (Test-Path $full) {
    $target = (Get-Item $full).Target
    Write-Host "$a => target=$target"
  } else {
    Write-Host "$a => missing"
  }
}

Write-Host "=== Is it a reparse/redirect that actually execs? ==="
$exe = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\python.exe'
$item = Get-Item $exe -ErrorAction SilentlyContinue
if ($item) {
  Write-Host "Exists=$($item.Exists) Target=$($item.Target) ReparsePoint=$($item.ReparsePoint) Length=$($item.Length)"
}
Write-Host "=== Try raw exec (should open store) ==="
$proc3 = Start-Process -FilePath $exe -Wait -PassThru
Write-Host "exec_exit=$($proc3.ExitCode)"

Write-Host "=== git-bash file type on redirect ==="
bash -c "file '/c/Users/Nav/AppData/Local/Microsoft/WindowsApps/python.exe'"
bash -c "ls -la '/c/Users/Nav/AppData/Local/Microsoft/WindowsApps/python.exe' && xxd -l 64 '/c/Users/Nav/AppData/Local/Microsoft/WindowsApps/python.exe' | head -n 8"
