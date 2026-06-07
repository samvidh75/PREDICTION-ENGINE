$BASE = "c:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE"
$SRC = Join-Path $BASE "src"

Write-Output "===== SRC DIRECTORIES ====="
Get-ChildItem -Path $SRC -Directory | ForEach-Object {
    $dir = $_.FullName
    $name = $_.Name
    $allFiles = Get-ChildItem -Path $dir -Recurse -File
    $total = $allFiles.Count
    $tsFiles = ($allFiles | Where-Object { $_.Extension -eq ".ts" }).Count
    $tsxFiles = ($allFiles | Where-Object { $_.Extension -eq ".tsx" }).Count
    $testFiles = ($allFiles | Where-Object { $_.Name -match "\.(test|spec)\.tsx?$" }).Count
    Write-Output "$name : total=$total ts=$tsFiles tsx=$tsxFiles test=$testFiles"
}

Write-Output ""
Write-Output "===== SCRIPTS ====="
$scriptsDir = Join-Path $BASE "scripts"
$cjs = (Get-ChildItem -Path $scriptsDir -Filter "*.cjs" -File).Count
$mjs = (Get-ChildItem -Path $scriptsDir -Filter "*.mjs" -File).Count
$tsScripts = (Get-ChildItem -Path $scriptsDir -Filter "*.ts" -File).Count
Write-Output ".cjs: $cjs"
Write-Output ".mjs: $mjs"
Write-Output ".ts: $tsScripts"

Write-Output ""
Write-Output "===== REPORTS ====="
$reportsDir = Join-Path $BASE "reports"
$subDirs = (Get-ChildItem -Path $reportsDir -Directory).Count
Write-Output "Subdirectories: $subDirs"