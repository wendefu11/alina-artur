#requires -Version 5.1
<#
  Алина · Артур — деплой на GitHub Pages в один клик.

  ИСПОЛЬЗОВАНИЕ:
    1. Открой PowerShell в этой папке (c:\alina).
    2. Запусти:  .\deploy.ps1
    3. Следуй подсказкам.

  Что делает скрипт:
    - Проверяет git и gh CLI (если нет — даёт ссылки)
    - Логинит тебя в GitHub через браузер
    - Создаёт публичный репозиторий (или использует существующий)
    - Пушит код
    - Включает GitHub Pages
    - Печатает финальную ссылку
#>

$ErrorActionPreference = "Stop"

function Has-Cmd($name) {
  try { Get-Command $name -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

Write-Host ""
Write-Host "==== Алина · Артур → GitHub Pages ====" -ForegroundColor Magenta
Write-Host ""

# ── git ──────────────────────────────────────────────────────
if (-not (Has-Cmd "git")) {
  Write-Host "Git не найден. Поставь с https://git-scm.com/download/win и перезапусти PowerShell." -ForegroundColor Red
  exit 1
}

# ── gh ───────────────────────────────────────────────────────
$ghPath = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $ghPath)) {
  if (Has-Cmd "gh") { $ghPath = "gh" }
  else {
    Write-Host "GitHub CLI не найден. Ставлю через winget..." -ForegroundColor Yellow
    winget install --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements
    if (-not (Test-Path "C:\Program Files\GitHub CLI\gh.exe")) {
      Write-Host "Не удалось установить gh. Поставь вручную: https://cli.github.com/" -ForegroundColor Red
      exit 1
    }
    $ghPath = "C:\Program Files\GitHub CLI\gh.exe"
  }
}

# ── login ────────────────────────────────────────────────────
& $ghPath auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Сейчас откроется браузер для входа в GitHub." -ForegroundColor Cyan
  Write-Host "Скопируй код, который покажет терминал, и вставь его в браузере." -ForegroundColor Cyan
  Write-Host ""
  & $ghPath auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { Write-Host "Авторизация не прошла."; exit 1 }
}

# ── repo info ────────────────────────────────────────────────
$user = (& $ghPath api user --jq ".login").Trim()
if (-not $user) { Write-Host "Не удалось получить логин."; exit 1 }
Write-Host "Логин: $user" -ForegroundColor Green

$defaultRepo = "alina-artur"
$repoName = Read-Host "Имя репозитория (по умолчанию '$defaultRepo')"
if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = $defaultRepo }

# ── ensure git repo ──────────────────────────────────────────
if (-not (Test-Path ".git")) {
  git init -b main | Out-Null
  git config --local user.name "$user"
  git config --local user.email "$user@users.noreply.github.com"
  git add . | Out-Null
  git commit -m "init" | Out-Null
} else {
  $changes = git status --porcelain
  if ($changes) {
    git add . | Out-Null
    git commit -m "update" | Out-Null
  }
}

# ── create or use existing remote ────────────────────────────
$exists = $false
try {
  & $ghPath repo view "$user/$repoName" 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $exists = $true }
} catch { $exists = $false }

if (-not $exists) {
  Write-Host "Создаю репозиторий $user/$repoName ..." -ForegroundColor Cyan
  & $ghPath repo create "$user/$repoName" --public --source "." --remote origin --push
  if ($LASTEXITCODE -ne 0) { Write-Host "Не удалось создать репо."; exit 1 }
} else {
  Write-Host "Репозиторий $user/$repoName уже существует — пушу туда." -ForegroundColor Cyan
  git remote remove origin 2>$null
  git remote add origin "https://github.com/$user/$repoName.git"
  git branch -M main
  git push -u origin main --force
}

# ── enable Pages ─────────────────────────────────────────────
Write-Host "Включаю GitHub Pages..." -ForegroundColor Cyan
$body = '{"source":{"branch":"main","path":"/"}}'
& $ghPath api -X POST "repos/$user/$repoName/pages" -H "Accept: application/vnd.github+json" --input - <<< $body 2>$null
if ($LASTEXITCODE -ne 0) {
  # already enabled — try PUT to update
  & $ghPath api -X PUT "repos/$user/$repoName/pages" -H "Accept: application/vnd.github+json" -f "source[branch]=main" -f "source[path]=/" 2>$null | Out-Null
}

$pagesUrl = "https://$user.github.io/$repoName/"
Write-Host ""
Write-Host "  ГОТОВО!" -ForegroundColor Green
Write-Host ""
Write-Host "  Репозиторий: https://github.com/$user/$repoName" -ForegroundColor White
Write-Host "  Сайт: $pagesUrl" -ForegroundColor Magenta
Write-Host ""
Write-Host "  (Pages обычно поднимает страницу за 1–3 минуты после первого пуша.)" -ForegroundColor DarkGray
Write-Host ""

try { Start-Process $pagesUrl } catch {}
