$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & node tools/lint.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Local lint failed; package not created.' }

    [string[]]$files = Get-Content -LiteralPath 'tools/extension-files.json' -Raw | ConvertFrom-Json
    $manifest = Get-Content -LiteralPath 'manifest.json' -Raw | ConvertFrom-Json
    if ($manifest.version -notmatch '^\d+(\.\d+){0,3}$') { throw 'Unexpected package version.' }
    $destination = Join-Path $projectRoot "dist/privacy-monitor-$($manifest.version).zip"
    New-Item -ItemType Directory -Path (Join-Path $projectRoot 'dist') -Force | Out-Null
    Compress-Archive -LiteralPath $files -DestinationPath $destination -CompressionLevel Optimal -Force

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($destination)
    try {
        $difference = Compare-Object ($files | Sort-Object) ($archive.Entries.FullName | Sort-Object)
        if ($difference) { throw 'Package contents differ from the allowlist.' }
        foreach ($entry in $archive.Entries) {
            $stream = $entry.Open()
            $sha = [Security.Cryptography.SHA256]::Create()
            try {
                $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '')
                $expected = (Get-FileHash -LiteralPath $entry.FullName -Algorithm SHA256).Hash
                if ($actual -ne $expected) { throw "Package bytes differ: $($entry.FullName)" }
            } finally { $stream.Dispose(); $sha.Dispose() }
        }
    } finally { $archive.Dispose() }
    Write-Output "Verified package: $destination ($($files.Count) files; SHA-256 matches source)"
} finally { Pop-Location }
