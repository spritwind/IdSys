#Requires -RunAsAdministrator
<#
.SYNOPSIS
    PRS 身份認證管理系統 - 自動部署腳本
.DESCRIPTION
    從 Git 拉取最新版本並部署到正式環境
.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -All
    .\deploy.ps1 -Projects Admin,STS
#>

param(
    [switch]$All,
    [string[]]$Projects,
    [switch]$SkipGitPull,
    [switch]$SkipBuild,
    [switch]$SkipIISRecycle,
    [string]$GitBranch = "main"
)

# ============================================
# 設定區
# ============================================
$ErrorActionPreference = "Stop"

# 來源路徑（Git 倉庫）
$SourceRoot = "C:\Users\User\SideProject\Duende.IdentityServer.Admin"

# 部署目標路徑
$DeployPaths = @{
    "Admin"       = "C:\Workspace\PRSWeb\Admin"
    "AdminApi"    = "C:\Workspace\PRSWeb\admin-api"
    "STS"         = "C:\Workspace\PRSWeb\STS"
    "TwFrontEnd"  = "C:\Workspace\PRSWeb\TwFrontEnd"
}

# 專案對應
$ProjectConfigs = @{
    "Admin" = @{
        SourceProject = "src\Skoruba.Duende.IdentityServer.Admin"
        PublishPath   = "publish\Admin"
        IISAppPool    = "Prs.Uccapital.com"
        Type          = "dotnet"
    }
    "AdminApi" = @{
        SourceProject = "src\Skoruba.Duende.IdentityServer.Admin.Api"
        PublishPath   = "publish\Admin.Api"
        IISAppPool    = "adminapi"
        Type          = "dotnet"
    }
    "STS" = @{
        SourceProject = "src\Skoruba.Duende.IdentityServer.STS.Identity"
        PublishPath   = "publish\STS.Identity"
        IISAppPool    = "UCCapitalSTS"
        Type          = "dotnet"
    }
    "TwFrontEnd" = @{
        SourceProject = "TwFrontEnd"
        PublishPath   = "TwFrontEnd\dist"
        IISAppPool    = $null  # 靜態檔案不需要 App Pool
        Type          = "npm"
    }
}

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

function Write-Error2 {
    param([string]$Text)
    Write-Host "   [ERROR] $Text" -ForegroundColor Red
}

function Show-Menu {
    Write-Title "PRS 部署腳本 - 選擇要部署的專案"

    Write-Host "`n可用專案：" -ForegroundColor White
    Write-Host "  [1] Admin       - Admin MVC 管理介面" -ForegroundColor Gray
    Write-Host "  [2] AdminApi    - Admin REST API" -ForegroundColor Gray
    Write-Host "  [3] STS         - Security Token Service" -ForegroundColor Gray
    Write-Host "  [4] TwFrontEnd  - React 前端" -ForegroundColor Gray
    Write-Host "  [5] Backend All - Admin + AdminApi + STS" -ForegroundColor Gray
    Write-Host "  [6] All         - 全部專案" -ForegroundColor Gray
    Write-Host "  [0] Exit        - 離開" -ForegroundColor Gray
    Write-Host ""

    $choice = Read-Host "請選擇 (可多選，用逗號分隔，例如: 1,2,4)"

    if ($choice -eq "0") {
        Write-Host "已取消部署。" -ForegroundColor Yellow
        exit 0
    }

    $selected = @()
    $choices = $choice -split "," | ForEach-Object { $_.Trim() }

    foreach ($c in $choices) {
        switch ($c) {
            "1" { $selected += "Admin" }
            "2" { $selected += "AdminApi" }
            "3" { $selected += "STS" }
            "4" { $selected += "TwFrontEnd" }
            "5" { $selected += @("Admin", "AdminApi", "STS") }
            "6" { $selected += @("Admin", "AdminApi", "STS", "TwFrontEnd") }
        }
    }

    return $selected | Select-Object -Unique
}

function Invoke-GitPull {
    Write-Step "從 Git 拉取最新版本 ($GitBranch)"

    Push-Location $SourceRoot
    try {
        # 檢查是否有未提交的變更
        $status = git status --porcelain
        if ($status) {
            Write-Host "   警告：有未提交的變更" -ForegroundColor Yellow
            $confirm = Read-Host "   是否繼續？(y/N)"
            if ($confirm -ne "y") {
                throw "使用者取消操作"
            }
        }

        git fetch origin
        git checkout $GitBranch
        git pull origin $GitBranch

        $lastCommit = git log -1 --pretty=format:"%h - %s (%cr)"
        Write-Success "已更新至: $lastCommit"
    }
    finally {
        Pop-Location
    }
}

function Invoke-DotnetBuild {
    param([string]$ProjectName)

    $config = $ProjectConfigs[$ProjectName]
    $projectPath = Join-Path $SourceRoot $config.SourceProject
    $publishPath = Join-Path $SourceRoot $config.PublishPath

    Write-Step "建置 $ProjectName"

    Push-Location $SourceRoot
    try {
        dotnet publish $projectPath -c Release -o $publishPath --no-restore
        Write-Success "建置完成: $publishPath"
    }
    finally {
        Pop-Location
    }
}

function Invoke-NpmBuild {
    param([string]$ProjectName)

    $config = $ProjectConfigs[$ProjectName]
    $projectPath = Join-Path $SourceRoot $config.SourceProject

    Write-Step "建置 $ProjectName (npm)"

    Push-Location $projectPath
    try {
        npm install --silent
        npm run build
        Write-Success "建置完成: $projectPath\dist"
    }
    finally {
        Pop-Location
    }
}

function Stop-IISAppPool {
    param([string]$AppPoolName)

    if (-not $AppPoolName) { return }

    try {
        $pool = Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
        if ($pool -and $pool.State -eq "Started") {
            Stop-WebAppPool -Name $AppPoolName
            Write-Success "已停止 App Pool: $AppPoolName"
            Start-Sleep -Seconds 2
        }
    }
    catch {
        Write-Host "   警告：無法停止 App Pool $AppPoolName - $_" -ForegroundColor Yellow
    }
}

function Start-IISAppPool {
    param([string]$AppPoolName)

    if (-not $AppPoolName) { return }

    try {
        $pool = Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
        if ($pool -and $pool.State -eq "Stopped") {
            Start-WebAppPool -Name $AppPoolName
            Write-Success "已啟動 App Pool: $AppPoolName"
        }
    }
    catch {
        Write-Host "   警告：無法啟動 App Pool $AppPoolName - $_" -ForegroundColor Yellow
    }
}

function Copy-ProjectFiles {
    param([string]$ProjectName)

    $config = $ProjectConfigs[$ProjectName]
    $sourcePath = Join-Path $SourceRoot $config.PublishPath
    $targetPath = $DeployPaths[$ProjectName]

    Write-Step "部署 $ProjectName 到 $targetPath"

    if (-not (Test-Path $sourcePath)) {
        throw "來源路徑不存在: $sourcePath"
    }

    # 備份設定檔
    $configFiles = @("appsettings.json", "appsettings.Production.json", "web.config")
    $backupConfigs = @{}

    foreach ($file in $configFiles) {
        $filePath = Join-Path $targetPath $file
        if (Test-Path $filePath) {
            $backupConfigs[$file] = Get-Content $filePath -Raw
        }
    }

    # 複製檔案
    if ($config.Type -eq "npm") {
        # 前端只複製 dist 內容
        robocopy $sourcePath $targetPath /MIR /NFL /NDL /NJH /NJS /NC /NS
    }
    else {
        # 後端專案
        robocopy $sourcePath $targetPath /MIR /XF appsettings.json appsettings.Production.json /NFL /NDL /NJH /NJS /NC /NS
    }

    # 還原設定檔
    foreach ($file in $backupConfigs.Keys) {
        $filePath = Join-Path $targetPath $file
        $backupConfigs[$file] | Set-Content $filePath -NoNewline
    }

    Write-Success "檔案已複製"
}

function Deploy-Project {
    param([string]$ProjectName)

    $config = $ProjectConfigs[$ProjectName]

    Write-Title "部署 $ProjectName"

    # 停止 IIS App Pool
    if (-not $SkipIISRecycle -and $config.IISAppPool) {
        Stop-IISAppPool -AppPoolName $config.IISAppPool
    }

    # 建置
    if (-not $SkipBuild) {
        if ($config.Type -eq "dotnet") {
            Invoke-DotnetBuild -ProjectName $ProjectName
        }
        elseif ($config.Type -eq "npm") {
            Invoke-NpmBuild -ProjectName $ProjectName
        }
    }

    # 複製檔案
    Copy-ProjectFiles -ProjectName $ProjectName

    # 啟動 IIS App Pool
    if (-not $SkipIISRecycle -and $config.IISAppPool) {
        Start-IISAppPool -AppPoolName $config.IISAppPool
    }

    Write-Success "$ProjectName 部署完成！"
}

# ============================================
# 主程式
# ============================================

Write-Title "PRS 身份認證管理系統 - 自動部署"
Write-Host "來源: $SourceRoot" -ForegroundColor Gray
Write-Host "時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# 決定要部署的專案
$selectedProjects = @()

if ($All) {
    $selectedProjects = @("Admin", "AdminApi", "STS", "TwFrontEnd")
}
elseif ($Projects) {
    $selectedProjects = $Projects
}
else {
    $selectedProjects = Show-Menu
}

if ($selectedProjects.Count -eq 0) {
    Write-Host "`n未選擇任何專案。" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n將部署以下專案：" -ForegroundColor White
$selectedProjects | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }

$confirm = Read-Host "`n確認開始部署？(Y/n)"
if ($confirm -eq "n") {
    Write-Host "已取消部署。" -ForegroundColor Yellow
    exit 0
}

# Git Pull
if (-not $SkipGitPull) {
    Invoke-GitPull
}

# 部署各專案
foreach ($project in $selectedProjects) {
    try {
        Deploy-Project -ProjectName $project
    }
    catch {
        Write-Error2 "部署 $project 失敗: $_"
        $continue = Read-Host "是否繼續部署其他專案？(Y/n)"
        if ($continue -eq "n") {
            exit 1
        }
    }
}

Write-Title "部署完成"
Write-Host "`n所有選擇的專案已部署完成！" -ForegroundColor Green
Write-Host "請驗證各服務是否正常運作。" -ForegroundColor Gray
