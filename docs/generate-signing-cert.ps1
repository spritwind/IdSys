# ============================================
# UC Capital IdentityServer 簽名憑證產生腳本
# ============================================
#
# 執行前請確認已安裝 OpenSSL:
#   - Windows: choco install openssl 或從 https://slproweb.com/products/Win32OpenSSL.html 下載
#   - 或使用 Git Bash 內建的 OpenSSL
#
# 使用方式:
#   powershell -ExecutionPolicy Bypass -File generate-signing-cert.ps1
# ============================================

$ErrorActionPreference = "Stop"

# 設定參數
$CertPassword = "YourSecurePassword123!"  # 請更換為安全密碼
$OutputDir = "..\src\Skoruba.Duende.IdentityServer.STS.Identity\certs"
$ValidDays = 3650  # 10年有效期

# 建立輸出目錄
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "已建立目錄: $OutputDir" -ForegroundColor Green
}

# 產生私鑰
Write-Host "`n[1/4] 產生 RSA 私鑰 (4096 bits)..." -ForegroundColor Cyan
openssl genrsa -out "$OutputDir\signing.key" 4096

# 產生自簽憑證請求 (CSR)
Write-Host "`n[2/4] 產生憑證簽名請求 (CSR)..." -ForegroundColor Cyan
openssl req -new -key "$OutputDir\signing.key" -out "$OutputDir\signing.csr" -subj "/CN=UC Capital IdentityServer/O=UC Capital/C=TW"

# 產生自簽憑證
Write-Host "`n[3/4] 產生自簽憑證 (有效期 $ValidDays 天)..." -ForegroundColor Cyan
openssl x509 -req -days $ValidDays -in "$OutputDir\signing.csr" -signkey "$OutputDir\signing.key" -out "$OutputDir\signing.crt"

# 匯出為 PFX 格式 (Windows/IIS 使用)
Write-Host "`n[4/4] 匯出 PFX 檔案..." -ForegroundColor Cyan
openssl pkcs12 -export -out "$OutputDir\signing.pfx" -inkey "$OutputDir\signing.key" -in "$OutputDir\signing.crt" -password pass:$CertPassword

# 清理中繼檔案 (可選)
Remove-Item "$OutputDir\signing.csr" -Force
# 保留 .key 和 .crt 作為備份，或取消下面註解來刪除
# Remove-Item "$OutputDir\signing.key" -Force
# Remove-Item "$OutputDir\signing.crt" -Force

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "憑證產生完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "檔案位置:" -ForegroundColor Yellow
Write-Host "  - PFX: $OutputDir\signing.pfx"
Write-Host "  - 私鑰: $OutputDir\signing.key"
Write-Host "  - 憑證: $OutputDir\signing.crt"
Write-Host ""
Write-Host "PFX 密碼: $CertPassword" -ForegroundColor Yellow
Write-Host ""
Write-Host "重要提醒:" -ForegroundColor Red
Write-Host "  1. 請將密碼更新到 appsettings.Production.json"
Write-Host "  2. 請妥善保管私鑰檔案"
Write-Host "  3. 建議將密碼儲存在安全的密碼管理器中"
Write-Host ""
