#Requires -RunAsAdministrator
<#
.SYNOPSIS
    PRS - First-time Environment Setup Script
.DESCRIPTION
    Install required software and clone project on deployment server
.EXAMPLE
    .\setup.ps1
#>

param(
    [string]$InstallPath = "C:\Workspace\PRSSource",
    [string]$GitRepo = "https://github.com/spritwind/IdSys.git",
    [string]$GitBranch = "main"
)

$ErrorActionPreference = "Stop"

function Write-Title {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host ">> $Text" -ForegroundColor Yellow
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

function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = $machinePath + ";" + $userPath
}

function Install-Chocolatey {
    Write-Step "Check Chocolatey"

    if (Test-Command "choco") {
        Write-Success "Chocolatey already installed"
        return
    }

    Write-Info "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    Refresh-Path
    Write-Success "Chocolatey installed"
}

function Install-Git {
    Write-Step "Check Git"

    if (Test-Command "git") {
        $version = git --version
        Write-Success "Git already installed: $version"
        return
    }

    Write-Info "Installing Git..."
    choco install git -y --no-progress

    Refresh-Path
    Write-Success "Git installed"
}

function Install-DotNet {
    Write-Step "Check .NET SDK"

    if (Test-Command "dotnet") {
        $version = dotnet --version
        Write-Success ".NET SDK already installed: $version"

        if ($version -match "^9\.") {
            return
        }
        Write-Info "Need .NET 9, installing..."
    }

    Write-Info "Installing .NET 9 SDK..."
    choco install dotnet-sdk --version=9.0.100 -y --no-progress

    Refresh-Path
    Write-Success ".NET SDK installed"
}

function Install-NodeJS {
    Write-Step "Check Node.js"

    if (Test-Command "node") {
        $version = node --version
        Write-Success "Node.js already installed: $version"
        return
    }

    Write-Info "Installing Node.js LTS..."
    choco install nodejs-lts -y --no-progress

    Refresh-Path
    Write-Success "Node.js installed"
}

function Clone-Repository {
    Write-Step "Clone Project"

    $parentPath = Split-Path $InstallPath -Parent
    $folderName = Split-Path $InstallPath -Leaf

    if (-not (Test-Path $parentPath)) {
        New-Item -ItemType Directory -Path $parentPath -Force | Out-Null
        Write-Info "Created directory: $parentPath"
    }

    if (Test-Path $InstallPath) {
        Write-Info "Project directory exists, running git pull..."
        Push-Location $InstallPath
        try {
            git fetch origin
            git checkout $GitBranch
            git pull origin $GitBranch
            Write-Success "Updated to latest version"
        }
        finally {
            Pop-Location
        }
        return
    }

    Write-Info "Cloning from $GitRepo ..."
    Push-Location $parentPath
    try {
        git clone $GitRepo $folderName
        Set-Location $InstallPath
        git checkout $GitBranch
        Write-Success "Clone completed: $InstallPath"
    }
    finally {
        Pop-Location
    }
}

function Setup-GitCredential {
    Write-Step "Setup Git Credential Manager"
    git config --global credential.helper manager
    Write-Success "Windows Credential Manager configured"
}

function Restore-Dependencies {
    Write-Step "Restore Dependencies"

    Push-Location $InstallPath
    try {
        Write-Info "Restoring NuGet packages..."
        dotnet restore --verbosity quiet
        Write-Success "NuGet packages restored"

        Write-Info "Restoring npm packages..."
        Push-Location "TwFrontEnd"
        npm install --silent
        Pop-Location
        Write-Success "npm packages restored"
    }
    finally {
        Pop-Location
    }
}

function Update-DeployScript {
    Write-Step "Update Deploy Script Path"

    $deployScript = Join-Path $InstallPath "deploy.ps1"

    if (Test-Path $deployScript) {
        $content = Get-Content $deployScript -Raw
        $escapedPath = $InstallPath -replace "\\", "\\"
        $content = $content -replace '\$SourceRoot = "C:\\Users\\User\\SideProject\\Duende\.IdentityServer\.Admin"', "`$SourceRoot = `"$escapedPath`""
        $content | Set-Content $deployScript -NoNewline
        Write-Success "Updated deploy.ps1 path"
    }
}

function Test-Build {
    Write-Step "Test Build"

    $confirm = Read-Host "Run test build? (Y/n)"
    if ($confirm -eq "n") {
        Write-Info "Skipped test build"
        return
    }

    Push-Location $InstallPath
    try {
        Write-Info "Building backend..."
        dotnet build --verbosity quiet
        Write-Success "Backend build succeeded"

        Write-Info "Building frontend..."
        Push-Location "TwFrontEnd"
        npm run build
        Pop-Location
        Write-Success "Frontend build succeeded"
    }
    finally {
        Pop-Location
    }
}

function Show-Summary {
    Write-Title "Setup Complete"

    Write-Host ""
    Write-Host "Installed Software:" -ForegroundColor White

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

    Write-Host ""
    Write-Host "Project Location:" -ForegroundColor White
    Write-Host "  $InstallPath" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor White
    Write-Host "  cd $InstallPath" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1" -ForegroundColor Gray

    Write-Host ""
    Write-Host "Deploy Targets:" -ForegroundColor White
    Write-Host "  Admin      -> C:\Workspace\PRSWeb\Admin" -ForegroundColor Gray
    Write-Host "  AdminApi   -> C:\Workspace\PRSWeb\admin-api" -ForegroundColor Gray
    Write-Host "  STS        -> C:\Workspace\PRSWeb\STS" -ForegroundColor Gray
    Write-Host "  TwFrontEnd -> C:\Workspace\PRSWeb\TwFrontEnd" -ForegroundColor Gray
}

# ============================================
# Main
# ============================================

Write-Title "PRS Identity Admin - First-time Setup"
Write-Host "Install Path: $InstallPath" -ForegroundColor Gray
Write-Host "Git Repo:     $GitRepo" -ForegroundColor Gray
Write-Host "Branch:       $GitBranch" -ForegroundColor Gray

$confirm = Read-Host "Start setup? (Y/n)"
if ($confirm -eq "n") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

try {
    Install-Chocolatey
    Install-Git
    Install-DotNet
    Install-NodeJS
    Setup-GitCredential
    Clone-Repository
    Restore-Dependencies
    Update-DeployScript
    Test-Build
    Show-Summary
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Setup failed: $_" -ForegroundColor Red
    exit 1
}
