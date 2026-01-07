# ============================================
# UC Capital IdentityServer 正式環境發布腳本
# ============================================
#
# 使用方式:
#   powershell -ExecutionPolicy Bypass -File publish-production.ps1
#
# 發布完成後將產生:
#   - publish/Admin - Admin UI 網站
#   - publish/STS - STS Identity 網站
# ============================================

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$PublishDir = "$ProjectRoot\publish"
$AdminProject = "$ProjectRoot\src\Skoruba.Duende.IdentityServer.Admin\Skoruba.Duende.IdentityServer.Admin.csproj"
$STSProject = "$ProjectRoot\src\Skoruba.Duende.IdentityServer.STS.Identity\Skoruba.Duende.IdentityServer.STS.Identity.csproj"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "UC Capital IdentityServer 正式環境發布" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 清理舊的發布目錄
if (Test-Path $PublishDir) {
    Write-Host "[1/5] 清理舊的發布目錄..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $PublishDir
}

# 建立發布目錄
New-Item -ItemType Directory -Path "$PublishDir\Admin" -Force | Out-Null
New-Item -ItemType Directory -Path "$PublishDir\STS" -Force | Out-Null

# 建置 Admin UI
Write-Host ""
Write-Host "[2/5] 建置 Admin UI 前端資源..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\src\Skoruba.Duende.IdentityServer.Admin.UI"
npm install --silent 2>$null
npx gulp build

# 發布 Admin
Write-Host ""
Write-Host "[3/5] 發布 Admin UI..." -ForegroundColor Yellow
Set-Location $ProjectRoot
dotnet publish $AdminProject -c Release -o "$PublishDir\Admin" --no-restore

# 建置 STS 前端資源
Write-Host ""
Write-Host "[4/5] 建置 STS 前端資源..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\src\Skoruba.Duende.IdentityServer.STS.Identity"
npm install --silent 2>$null
npx gulp build

# 發布 STS
Write-Host ""
Write-Host "[5/7] 發布 STS Identity..." -ForegroundColor Yellow
Set-Location $ProjectRoot
dotnet publish $STSProject -c Release -o "$PublishDir\STS" --no-restore

# 建置 React 前端 (TwFrontEnd)
Write-Host ""
Write-Host "[6/7] 建置 React 前端 (TwFrontEnd)..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\TwFrontEnd"
npm install --silent 2>$null
npm run build

# 複製 React 前端到發布目錄
Write-Host ""
Write-Host "[7/7] 複製 React 前端到發布目錄..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$PublishDir\Admin\app" -Force | Out-Null
Copy-Item -Path "$ProjectRoot\TwFrontEnd\dist\*" -Destination "$PublishDir\Admin\app" -Recurse -Force

# 建立 certs 目錄
Write-Host ""
Write-Host "建立憑證目錄..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$PublishDir\STS\certs" -Force | Out-Null

# 複製 Production 設定檔
Write-Host "複製 Production 設定檔..." -ForegroundColor Yellow
Copy-Item "$ProjectRoot\src\Skoruba.Duende.IdentityServer.Admin\appsettings.Production.json" "$PublishDir\Admin\"
Copy-Item "$ProjectRoot\src\Skoruba.Duende.IdentityServer.STS.Identity\appsettings.Production.json" "$PublishDir\STS\"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "發布完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "發布目錄:" -ForegroundColor Yellow
Write-Host "  Admin UI: $PublishDir\Admin"
Write-Host "  STS:      $PublishDir\STS"
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "IIS 部署步驟:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 在 IIS 建立應用程式集區 (Application Pool):" -ForegroundColor White
Write-Host "   - 名稱: UCCapitalIdentity"
Write-Host "   - .NET CLR 版本: No Managed Code"
Write-Host "   - 管線模式: Integrated"
Write-Host ""
Write-Host "2. 建立網站:" -ForegroundColor White
Write-Host "   - 主網站 (Admin UI):"
Write-Host "     網站名稱: UCCapitalAdmin"
Write-Host "     實體路徑: $PublishDir\Admin"
Write-Host "     繫結: https://Prs.Uccapital.com:443"
Write-Host ""
Write-Host "   - 子應用程式 (STS):"
Write-Host "     在 UCCapitalAdmin 下新增應用程式"
Write-Host "     別名: sts"
Write-Host "     實體路徑: $PublishDir\STS"
Write-Host ""
Write-Host "   - React 前端 (/app):"
Write-Host "     已自動複製到: $PublishDir\Admin\app"
Write-Host "     確保 IIS URL Rewrite 規則已設定"
Write-Host ""
Write-Host "3. 產生簽名憑證:" -ForegroundColor White
Write-Host "   執行: docs\generate-signing-cert.ps1"
Write-Host "   複製 signing.pfx 到: $PublishDir\STS\certs\"
Write-Host ""
Write-Host "4. 更新資料庫 Client URLs:" -ForegroundColor White
Write-Host "   執行 SQL: docs\update-production-urls.sql"
Write-Host ""
Write-Host "5. 設定環境變數 (在 IIS 或 web.config):" -ForegroundColor White
Write-Host "   ASPNETCORE_ENVIRONMENT=Production"
Write-Host ""

Set-Location $ProjectRoot
