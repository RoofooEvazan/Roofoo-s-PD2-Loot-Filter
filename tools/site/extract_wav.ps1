# Extracts files from Diablo II / PD2 MPQ archives using the game's own StormLib.dll.
# StormLib.dll is 32-bit, so run this with the 32-bit PowerShell:
#   C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe -File extract_wav.ps1 -Manifest m.txt -GameDir "C:\Program Files\Diablo II"
# Manifest lines: <path inside mpq>|<output file>
param([string]$Manifest,[string]$GameDir)
$dll = Join-Path $GameDir 'ProjectD2\StormLib.dll'
$src = @"
using System; using System.Runtime.InteropServices;
public static class S {
 [DllImport(@"$dll", CharSet=CharSet.Ansi)] public static extern bool SFileOpenArchive(string n, uint p, uint f, out IntPtr h);
 [DllImport(@"$dll", CharSet=CharSet.Ansi)] public static extern bool SFileExtractFile(IntPtr h, string toExtract, string extracted, uint scope);
 [DllImport(@"$dll")] public static extern bool SFileCloseArchive(IntPtr h);
}
"@
Add-Type -TypeDefinition $src
# Highest priority first: PD2 overrides vanilla.
$names = 'ProjectD2\pd2assets.mpq','ProjectD2\pd2data.mpq','patch_d2.mpq','d2xtalk.mpq','d2exp.mpq','d2speech.mpq','d2sfx.mpq','d2data.mpq'
$archives = @()
foreach ($n in $names) {
  $h = [IntPtr]::Zero
  if ([S]::SFileOpenArchive((Join-Path $GameDir $n), 0, 0, [ref]$h)) { $archives += $h } else { Write-Output "skip $n" }
}
foreach ($line in Get-Content $Manifest) {
  $inner, $out = $line.Split('|')
  $ok = $false
  foreach ($h in $archives) { # PD2 archives can hold empty stubs for vanilla files, so require real output.
    if ([S]::SFileExtractFile($h, $inner, $out, 0) -and (Test-Path $out) -and (Get-Item $out).Length -gt 44) { $ok = $true; break } }
  if (-not $ok) { Write-Output "MISSING $inner" }
}
foreach ($h in $archives) { [S]::SFileCloseArchive($h) | Out-Null }
