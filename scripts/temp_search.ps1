Get-ChildItem -Path "." -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.sql,*.json | Select-String -Pattern "feature_snapshots" | ForEach-Object { $_.Filename + ":" + $_.LineNumber + ":" + $_.Line.Trim() }
