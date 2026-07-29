[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PagesPath = Join-Path $RepoRoot "src\ui\pages.tsx"
$ProductPath = Join-Path $RepoRoot "src\config\product.ts"
$WorkerPath = Join-Path $RepoRoot "src\worker.tsx"
$MigrationPath = Join-Path $RepoRoot "migrations\0001_cases.sql"
$PublicDirectory = Join-Path $RepoRoot "public"
$Pages = Get-Content -Raw -LiteralPath $PagesPath
$Product = Get-Content -Raw -LiteralPath $ProductPath
$Worker = Get-Content -Raw -LiteralPath $WorkerPath
$Migration = Get-Content -Raw -LiteralPath $MigrationPath

if ($Pages.Contains('data-template-surface="replace-before-release"')) {
    throw "Replace the starter workspace before release"
}
if ($Pages.Contains('class="hero"') -or $Pages.Contains('class="product-flow"')) {
    throw "Text-led hero and generic product-flow sections are not releaseable"
}
if (-not $Pages.Contains('class="clue-stage"') -or
    -not $Pages.Contains('class="memory-slips"') -or
    -not $Pages.Contains('"candidate-shelf"')) {
    throw "Expected the memory-to-lens-to-candidate-shelf visualization"
}
if (-not $Pages.Contains('id="create-form"') -or
    -not $Pages.Contains('id="case-app"') -or
    -not $Pages.Contains('id="manage-app"')) {
    throw "Expected the creation, shared case, and private management workspaces"
}
if ($Pages -match '(?i)public validation|success criteria|experiment|仮説|成功条件') {
    throw "Research copy must not appear on the product surface"
}
if (-not $Pages.Contains('id="suggestion-form"') -or
    -not $Pages.Contains('id="manage-suggestions"')) {
    throw "Expected the candidate submission and verdict surfaces"
}
if (-not $Worker.Contains('suggestions: await getSuggestions') -or
    $Worker.Contains('sessionId: row.session_id')) {
    throw "Public case API must expose candidates without responder identity"
}
if (-not $Worker.Contains('parseEvidenceUrl(source.evidenceUrl)') -or
    -not $Worker.Contains('url.protocol !== "https:"')) {
    throw "Evidence URL must pass the public HTTPS validator"
}
if ($Migration -match '(?i)seeker_name|responder_name|email|image_url|upload') {
    throw "Names, email, and image uploads are outside the product boundary"
}
if ($Product.Contains('"pon-hakushu"') -or $Product.Contains('"ぽん拍手"')) {
    throw "Replace the previous product identity before release"
}

$OgPath = Join-Path $PublicDirectory "og.svg"
if (-not (Test-Path -LiteralPath $OgPath) -or (Get-Item -LiteralPath $OgPath).Length -lt 3000) {
    throw "Expected a product-specific OG SVG larger than 3 KB"
}

$KeyFiles = @(
    Get-ChildItem -LiteralPath $PublicDirectory -File |
        Where-Object { $_.Name -match "^[a-zA-Z0-9-]{8,128}\.txt$" }
)
if ($KeyFiles.Count -ne 1) {
    throw "Expected exactly one generated IndexNow key file, found $($KeyFiles.Count)"
}
$Key = (Get-Content -Raw -LiteralPath $KeyFiles[0].FullName).Trim()
if ($Key -ne $KeyFiles[0].BaseName) {
    throw "IndexNow key file name and content do not match"
}

Write-Output "Product release contract is satisfied"
