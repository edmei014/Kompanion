$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourceDir = Join-Path $PSScriptRoot "..\src-tauri\resources\images\amps"
$outputDir = Join-Path $PSScriptRoot "..\src-tauri\resources\images\amps-performance"
$maxWidth = 160
$maxHeight = 80

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$written = 0
Get-ChildItem -Path $sourceDir -File | ForEach-Object {
  $extension = $_.Extension.ToLowerInvariant()
  if ($extension -notin @(".png", ".jpg", ".jpeg")) {
    return
  }

  $image = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    $scale = [Math]::Min(1.0, [Math]::Min($maxWidth / $image.Width, $maxHeight / $image.Height))
    $newWidth = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $newHeight = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap $newWidth, $newHeight
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)
    } finally {
      $graphics.Dispose()
    }

    $outputPath = Join-Path $outputDir ($_.BaseName + ".png")
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    $written += 1
  } finally {
    $image.Dispose()
  }
}

Write-Output "Generated $written performance amp thumbnails in $outputDir."
