# Publish GitHub Release for current package.json version.
# Prerequisite: gh auth login (once per machine)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$pkg = Get-Content (Join-Path $Root "package.json") -Raw | ConvertFrom-Json
$version = $pkg.version
$tag = "v$version"
$exe = Join-Path $Root "release\moyu-novel-reader-$version-portable.exe"
$notes = Join-Path $Root "RELEASE_NOTES.md"

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
    $ghCmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($ghCmd) { $gh = $ghCmd.Source } else { throw "GitHub CLI not found. Install: winget install GitHub.cli" }
}

if (-not (Test-Path $exe)) {
    throw "Portable exe missing. Run: npm run dist`nExpected: $exe"
}

& $gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Not logged in. Run once: gh auth login"
}

$existing = & $gh release view $tag --repo JoChiho/moyu-novel-reader 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Release $tag exists; uploading asset..."
    & $gh release upload $tag $exe --repo JoChiho/moyu-novel-reader --clobber
} else {
    Write-Host "Creating release $tag..."
    & $gh release create $tag `
        --repo JoChiho/moyu-novel-reader `
        --title $tag `
        --notes-file $notes `
        $exe
}

if ($LASTEXITCODE -ne 0) { throw "gh release failed (exit $LASTEXITCODE)" }
Write-Host "Done: https://github.com/JoChiho/moyu-novel-reader/releases/tag/$tag"