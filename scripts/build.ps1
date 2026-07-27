param(
  [string]$OutputDirectory = "dist"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot "manifest.json") | ConvertFrom-Json
$version = $manifest.version
$outputRoot = Join-Path $projectRoot $OutputDirectory
$stageRoot = Join-Path $outputRoot "package"
$archivePath = Join-Path $outputRoot "price-optimizer-$version.zip"

if (Test-Path -LiteralPath $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null

$files = @(
  "manifest.json", "background.js", "content.js", "content.css",
  "popup.html", "popup.js", "popup.css", "banners.json"
)
foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $stageRoot $file)
}
Copy-Item -LiteralPath (Join-Path $projectRoot "icons") -Destination (Join-Path $stageRoot "icons") -Recurse

Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $archivePath -CompressionLevel Optimal
Remove-Item -LiteralPath $stageRoot -Recurse -Force
Write-Output $archivePath
