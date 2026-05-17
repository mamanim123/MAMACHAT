function Get-MamabotWslDistro {
  $raw = ((wsl -l -q 2>$null) -join [Environment]::NewLine).Replace([string][char]0, "")
  $distros = @(
    $raw -split "[\r\n]+" |
      Where-Object { $_.Trim() } |
      ForEach-Object { $_.Trim() }
  )

  if ($distros.Count -eq 0) {
    throw "WSL distro not found. Run: wsl -l -q"
  }

  $preferred = $distros | Where-Object { $_ -match "^Ubuntu" } | Select-Object -First 1
  if ($preferred) {
    return $preferred
  }

  return $distros[0]
}

function Invoke-MamabotWsl {
  param(
    [Parameter(Mandatory=$true)][string]$Command,
    [string]$Distro = ""
  )

  if (-not $Distro) {
    $Distro = Get-MamabotWslDistro
  }

  wsl -d $Distro -u root -e bash -lc $Command
}

function Convert-MamabotWinPathToWsl {
  param(
    [Parameter(Mandatory=$true)][string]$WindowsPath
  )

  $resolved = (Resolve-Path $WindowsPath).Path
  $drive = (Split-Path -Qualifier $resolved).TrimEnd(":")
  $driveLower = $drive.ToLower()
  $pathNoDrive = $resolved.Substring(2).TrimStart("\").Replace("\", "/")

  return "/mnt/" + $driveLower + "/" + $pathNoDrive
}
