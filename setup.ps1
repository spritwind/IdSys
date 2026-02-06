#Requires -RunAsAdministrator
<#
.SYNOPSIS
    PRS 身份認證管理系統 - 首次環境設定腳本
.DESCRIPTION
    在部署環境首次安裝所需軟體並 Clone 專案
.EXAMPLE
    .\setup.ps1
#>

param(
    [string]$InstallPath = "C:\Source\PRS",
    [string]$GitRepo = "https://github.com/spritwind/IdSys.git",
    [string]$GitBranch = "main"
)

$ErrorActionPreference = "Stop"

# ============================================
# 函式區
# ============================================

function Write-Title {
    param([string]$Text)
    Write-Host "`n$("=" * 60)" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "$("=" * 60)" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host "`n>> $Text" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Text)
    Write-Host "   [OK] $Text" -ForegroundColor Green
}

function Write-Info {
    param([string]$Text)
    Write-Host "   $Text" -ForegroundColor Gray
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Install-Chocolatey {
    Write-Step "檢查 Chocolatey"

    if (Test-Command "choco") {
        Write-Success "Chocolatey 已安裝"
        return
    }

    Write-Info "安裝 Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    # 重新載入 PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Success "Chocolatey 安裝完成"
}

function Install-Git {
    Write-Step "檢查 Git"

    if (Test-Command "git") {
        $version = git --version
        Write-Success "Git 已安裝: $version"
        return
    }

    Write-Info "安裝 Git..."
    choco install git -y --no-progress

    # 重新載入 PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Success "Git 安裝完成"
}

function Install-DotNet {
    Write-Step "檢查 .NET SDK"

    if (Test-Command "dotnet") {
        $version = dotnet --version
        Write-Success ".NET SDK 已安裝: $version"

        # 檢查是否為 .NET 9
        if ($version -match "^9\.") {
            return
        }
        Write-Info "需要 .NET 9，將安裝..."
    }

    Write-Info "安裝 .NET 9 SDK..."
    choco install dotnet-sdk --version=9.0.100 -y --no-progress

    # 重新載入 PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Success ".NET SDK 安裝完成"
}

function Install-NodeJS {
    Write-Step "檢查 Node.js"

    if (Test-Command "node") {
        $version = node --version
        Write-Success "Node.js 已安裝: $version"
        return
    }

    Write-Info "安裝 Node.js LTS..."
    choco install nodejs-lts -y --no-progress

    # 重新載入 PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Success "Node.js 安裝完成"
}

function Clone-Repository {
    Write-Step "Clone 專案"

    $parentPath = Split-Path $InstallPath -Parent
    $folderName = Split-Path $InstallPath -Leaf

    # 建立父目錄
    if (-not (Test-Path $parentPath)) {
        New-Item -ItemType Directory -Path $parentPath -Force | Out-Null
        Write-Info "建立目錄: $parentPath"
    }

    # 檢查專案是否已存在
    if (Test-Path $InstallPath) {
        Write-Info "專案目錄已存在，執行 git pull..."
        Push-Location $InstallPath
        try {
            git fetch origin
            git checkout $GitBranch
            git pull origin $GitBranch
            Write-Success "已更新至最新版本"
        }
        finally {
            Pop-Location
        }
        return
    }

    # Clone 專案
    Write-Info "Clone 從 $GitRepo ..."
    Push-Location $parentPath
    try {
        git clone $GitRepo $folderName

        # 切換分支
        Set-Location $InstallPath
        git checkout $GitBranch

        Write-Success "Clone 完成: $InstallPath"
    }
    finally {
        Pop-Location
    }
}

function Setup-GitCredential {
    Write-Step "設定 Git 認證管理"

    git config --global credential.helper manager
    Write-Success "已設定 Windows 認證管理員"
}

function Restore-Dependencies {
    Write-Step "還原相依套件"

    Push-Location $InstallPath
    try {
        # .NET 套件
        Write-Info "還原 NuGet 套件..."
        dotnet restore --verbosity quiet
        Write-Success "NuGet 套件還原完成"

        # npm 套件
        Write-Info "還原 npm 套件..."
        Push-Location "TwFrontEnd"
        npm install --silent
        Pop-Location
        Write-Success "npm 套件還原完成"
    }
    finally {
        Pop-Location
    }
}

function Update-DeployScript {
    Write-Step "更新部署腳本路徑"

    $deployScript = Join-Path $InstallPath "deploy.ps1"

    if (Test-Path $deployScript) {
        $content = Get-Content $deployScript -Raw

        # 更新 SourceRoot 路徑
        $content = $content -replace '\$SourceRoot = "C:\\Users\\User\\SideProject\\Duende\.IdentityServer\.Admin"', "`$SourceRoot = `"$($InstallPath -replace '\\', '\\')`""

        $content | Set-Content $deployScript -NoNewline
        Write-Success "已更新 deploy.ps1 中的路徑"
    }
}

function Test-Build {
    Write-Step "測試建置"

    $confirm = Read-Host "是否執行測試建置？(Y/n)"
    if ($confirm -eq "n") {
        Write-Info "跳過測試建置"
        return
    }

    Push-Location $InstallPath
    try {
        Write-Info "建置後端..."
        dotnet build --verbosity quiet
        Write-Success "後端建置成功"

        Write-Info "建置前端..."
        Push-Location "TwFrontEnd"
        npm run build
        Pop-Location
        Write-Success "前端建置成功"
    }
    finally {
        Pop-Location
    }
}

function Show-Summary {
    Write-Title "設定完成"

    Write-Host "`n已安裝的軟體：" -ForegroundColor White

    if (Test-Command "git") {
        Write-Host "  Git:     $(git --version)" -ForegroundColor Green
    }
    if (Test-Command "dotnet") {
        Write-Host "  .NET:    $(dotnet --version)" -ForegroundColor Green
    }
    if (Test-Command "node") {
        Write-Host "  Node.js: $(node --version)" -ForegroundColor Green
    }
    if (Test-Command "npm") {
        Write-Host "  npm:     $(npm --version)" -ForegroundColor Green
    }

    Write-Host "`n專案位置：" -ForegroundColor White
    Write-Host "  $InstallPath" -ForegroundColor Cyan

    Write-Host "`n下一步：" -ForegroundColor White
    Write-Host "  cd $InstallPath" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1" -ForegroundColor Gray

    Write-Host "`n部署目標：" -ForegroundColor White
    Write-Host "  Admin      -> C:\Workspace\PRSWeb\Admin" -ForegroundColor Gray
    Write-Host "  AdminApi   -> C:\Workspace\PRSWeb\admin-api" -ForegroundColor Gray
    Write-Host "  STS        -> C:\Workspace\PRSWeb\STS" -ForegroundColor Gray
    Write-Host "  TwFrontEnd -> C:\Workspace\PRSWeb\TwFrontEnd" -ForegroundColor Gray
}

# ============================================
# 主程式
# ============================================

Write-Title "PRS 身份認證管理系統 - 首次環境設定"
Write-Host "安裝路徑: $InstallPath" -ForegroundColor Gray
Write-Host "Git 倉庫: $GitRepo" -ForegroundColor Gray
Write-Host "分支:     $GitBranch" -ForegroundColor Gray

$confirm = Read-Host "`n開始設定？(Y/n)"
if ($confirm -eq "n") {
    Write-Host "已取消。" -ForegroundColor Yellow
    exit 0
}

try {
    # 1. 安裝必要軟體
    Install-Chocolatey
    Install-Git
    Install-DotNet
    Install-NodeJS

    # 2. 設定 Git
    Setup-GitCredential

    # 3. Clone 專案
    Clone-Repository

    # 4. 還原相依套件
    Restore-Dependencies

    # 5. 更新部署腳本
    Update-DeployScript

    # 6. 測試建置
    Test-Build

    # 7. 顯示摘要
    Show-Summary
}
catch {
    Write-Host "`n[ERROR] 設定失敗: $_" -ForegroundColor Red
    exit 1
}
