$ErrorActionPreference = "Stop"

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host " Scraper.co.in — Firebase Multi-Site & GitHub Auto-CI/CD Setup" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

$ProjectId = "scraper-37c72"
$Repo = "torislove/scraper"
$GhExe = if (Get-Command gh -ErrorAction SilentlyContinue) { "gh" } else { "C:\Program Files\GitHub CLI\gh.exe" }

Write-Host "`n[1/4] Checking Firebase CLI authentication..." -ForegroundColor Yellow
$loginList = firebase login:list 2>&1 | Out-String
if ($loginList -match "No authorized accounts") {
  Write-Host "Signing in to Firebase via browser..." -ForegroundColor Yellow
  firebase login
} else {
  Write-Host "Firebase CLI already signed in." -ForegroundColor Green
}

Write-Host "`n[2/4] Ensuring Multi-Site Hosting targets exist in project $ProjectId..." -ForegroundColor Yellow
$sitesOutput = firebase hosting:sites:list --project $ProjectId 2>&1 | Out-String
foreach ($siteId in @("scraper-37c72-master", "scraper-37c72-admin")) {
  if ($sitesOutput -notmatch [regex]::Escape($siteId)) {
    Write-Host "Creating Firebase Hosting site: $siteId ..." -ForegroundColor Yellow
    firebase hosting:sites:create $siteId --project $ProjectId
  } else {
    Write-Host "Site $siteId already exists." -ForegroundColor Green
  }
}

Write-Host "`n[3/4] Generating Firebase CI token and saving FIREBASE_TOKEN to GitHub Secrets ($Repo)..." -ForegroundColor Yellow
$ciOut = firebase login:ci | Out-String
if ($ciOut -match "(1//[A-Za-z0-9_\-]+)") {
  $token = $Matches[1]
  $token | & $GhExe secret set FIREBASE_TOKEN --repo $Repo
  Write-Host "Saved FIREBASE_TOKEN to GitHub Actions secrets ($Repo)." -ForegroundColor Green
} else {
  Write-Warning "Could not auto-extract 1// token from output. Paste your token manually into:"
  Write-Host "  & `"$GhExe`" secret set FIREBASE_TOKEN --repo $Repo" -ForegroundColor Cyan
}

Write-Host "`n[4/4] Building & deploying Client, Master, and Admin live to Firebase Hosting..." -ForegroundColor Yellow
npm run deploy:web

Write-Host "`nAll 3 Firebase Hosting sites deployed and GitHub Auto-CI/CD is active!" -ForegroundColor Green
Write-Host "  Client + Landing : https://scraper-37c72.web.app  (-> scraper.co.in)" -ForegroundColor Cyan
Write-Host "  Master Fleet     : https://scraper-37c72-master.web.app (-> master.scraper.co.in)" -ForegroundColor Cyan
Write-Host "  Admin Console    : https://scraper-37c72-admin.web.app (-> admin.scraper.co.in)" -ForegroundColor Cyan
