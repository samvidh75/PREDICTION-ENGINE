$searchDirs = @(
    'src/stockstory/engines',
    'src/stockstory/scoring',
    'src/stockstory/config',
    'src/predictions'
)

foreach ($dir in $searchDirs) {
    $files = Get-ChildItem -Path $dir -Filter '*.ts' -Recurse -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $matches = Select-String -Path $file.FullName -Pattern 'Math\.max|clamp|floor|baseline|neutral|default|50\b' -SimpleMatch
        foreach ($m in $matches) {
            $line = $m.Line.Trim()
            if ($line.Length -gt 120) { $line = $line.Substring(0, 120) + '...' }
            Write-Host "$($m.Filename):$($m.LineNumber): $line"
        }
    }
}
