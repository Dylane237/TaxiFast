# Signe un APK de release avec la vraie clé Taxi Fast (au lieu de la clé de débogage générique).
# Usage :
#   $env:TAXIFAST_KEYSTORE_PASSWORD = "<mot de passe>"   # voir LISEZ-MOI.txt à côté de la clé
#   .\scripts\signer-apk.ps1 -Apk chemin\app-release.apk -Sortie builds\TaxiFast.apk
# La clé et son mot de passe ne doivent jamais entrer dans git.
param(
  [Parameter(Mandatory = $true)][string]$Apk,
  [Parameter(Mandatory = $true)][string]$Sortie,
  [string]$Cle = "$env:USERPROFILE\taxifast-cles\taxifast-release.jks",
  [string]$Alias = "taxifast"
)
$ErrorActionPreference = "Stop"
if (-not $env:TAXIFAST_KEYSTORE_PASSWORD) { throw "Définissez TAXIFAST_KEYSTORE_PASSWORD (voir LISEZ-MOI.txt à côté de la clé)." }
if (-not (Test-Path $Cle)) { throw "Clé introuvable : $Cle" }

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$outils = Get-ChildItem "$sdk\build-tools" -Directory | Sort-Object { [version]($_.Name -replace '-.*$', '') } | Select-Object -Last 1
if (-not $outils) { throw "Android build-tools introuvables dans $sdk" }

$aligne = [System.IO.Path]::ChangeExtension($Sortie, ".aligne.apk")
& "$($outils.FullName)\zipalign.exe" -f -p 4 $Apk $aligne
if ($LASTEXITCODE -ne 0) { throw "zipalign a échoué" }
& "$($outils.FullName)\apksigner.bat" sign --ks $Cle --ks-key-alias $Alias --ks-pass env:TAXIFAST_KEYSTORE_PASSWORD --key-pass env:TAXIFAST_KEYSTORE_PASSWORD --out $Sortie $aligne
if ($LASTEXITCODE -ne 0) { throw "apksigner a échoué" }
Remove-Item $aligne
& "$($outils.FullName)\apksigner.bat" verify --print-certs $Sortie | Select-String "SHA-1"
Write-Host "APK signé : $Sortie"
