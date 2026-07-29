[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute ano-hon-fuda $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param([int]$Numerator, [int]$Denominator)
    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Seekers = [int]$Row.seekers
$Cases = [int]$Row.cases_created
$Answered = [int]$Row.cases_with_suggestions
$Solved = [int]$Row.solved_cases

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "ano-hon-fuda"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        seekers = $Seekers
        cases_created = $Cases
        links_copied = [int]$Row.links_copied
        owner_opened = [int]$Row.owner_opened
        suggestions = [int]$Row.suggestions
        responders = [int]$Row.responders
        cases_with_suggestions = $Answered
        cases_with_3_responders = [int]$Row.cases_with_3_responders
        solved_cases = $Solved
        correct_suggestions = [int]$Row.correct_suggestions
        repeat_seekers = [int]$Row.repeat_seekers
        returned = [int]$Row.returned
        users_7d = [int]$Row.users_7d
        cases_7d = [int]$Row.cases_7d
    }
    rates = [ordered]@{
        creation_percent = Get-Percent $Cases $Users
        answered_percent = Get-Percent $Answered $Cases
        solved_percent = Get-Percent $Solved $Answered
        repeat_seeker_percent = Get-Percent ([int]$Row.repeat_seekers) $Seekers
    }
} | ConvertTo-Json -Depth 4
