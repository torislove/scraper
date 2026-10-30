# Generates desktop/build/icon.ico (BMP-format entries for maximum
# compatibility) plus icon-512.png for Store listings.
# Re-run after changing the brand palette: powershell -File make-icon.ps1

Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot 'icon.ico'
$pngOut = Join-Path $PSScriptRoot 'icon-512.png'
$sizes = @(256, 128, 64, 48, 32, 16)

function New-RoundRectPath([int]$w, [int]$h, [int]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($w - $d, 0, $d, $d, 270, 90)
  $path.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
  $path.AddArc(0, $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Render([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $scale = $size / 256.0
  $g.ScaleTransform($scale, $scale)

  $pad = 8
  $radius = 54
  $rect = New-Object System.Drawing.Rectangle($pad, $pad, (256 - $pad * 2), (256 - $pad * 2))
  $path = New-RoundRectPath $rect.Width $rect.Height $radius
  $g.TranslateTransform($pad, $pad)

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($rect.Width, $rect.Height)),
    [System.Drawing.Color]::FromArgb(255, 37, 99, 235),
    [System.Drawing.Color]::FromArgb(255, 13, 116, 144)
  )
  $g.FillPath($brush, $path)

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 191, 219, 254), 3)
  $g.DrawPath($pen, $path)

  $pinBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 240, 249, 255))
  $head = New-Object System.Drawing.Rectangle(78, 60, 100, 100)
  $g.FillEllipse($pinBrush, $head)

  $tri = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tri.AddPolygon(@(
    (New-Object System.Drawing.Point(96, 140)),
    (New-Object System.Drawing.Point(160, 140)),
    (New-Object System.Drawing.Point(128, 205))
  ))
  $g.FillPath($pinBrush, $tri)

  $hole = New-Object System.Drawing.Rectangle(112, 94, 32, 32)
  $holeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 47, 73))
  $g.FillEllipse($holeBrush, $hole)

  $g.ResetTransform()
  $g.Dispose()

  return $bmp
}

function Get-IconImageBytes([System.Drawing.Bitmap]$bmp) {
  $w = $bmp.Width
  $h = $bmp.Height

  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $locked = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $locked.Stride
  $pixels = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($locked.Scan0, $pixels, 0, $pixels.Length)
  $bmp.UnlockBits($locked)

  $maskRow = [int]([math]::Ceiling($w / 32.0) * 4)
  $maskSize = $maskRow * $h
  $xorSize = $w * $h * 4

  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter($ms)

  # BITMAPINFOHEADER
  $bw.Write([UInt32]40)
  $bw.Write([Int32]$w)
  $bw.Write([Int32]($h * 2))
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]0)
  $bw.Write([UInt32]($xorSize + $maskSize))
  $bw.Write([Int32]0)
  $bw.Write([Int32]0)
  $bw.Write([UInt32]0)
  $bw.Write([UInt32]0)

  # XOR bitmap, bottom-up (source is top-down)
  for ($y = $h - 1; $y -ge 0; $y--) {
    $bw.Write($pixels, ($y * $stride), ($w * 4))
  }

  # AND mask - all zero, alpha channel drives transparency
  $zero = New-Object byte[] $maskSize
  $bw.Write($zero, 0, $zero.Length)

  $bw.Flush()
  $bytes = $ms.ToArray()
  $bw.Close()
  $ms.Close()
  return ,$bytes
}

$images = @()
foreach ($s in $sizes) {
  $bmp = Render $s
  $images += ,(Get-IconImageBytes $bmp)
  $bmp.Dispose()
}

$fs = [System.IO.File]::Create($out)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)

$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $size = $sizes[$i]
  $data = $images[$i]
  $dim = if ($size -ge 256) { 0 } else { $size }
  $bw.Write([byte]$dim)
  $bw.Write([byte]$dim)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($data in $images) { $bw.Write($data) }
$bw.Flush(); $bw.Close(); $fs.Close()

# Large PNG for Microsoft Store / marketing
$big = Render 512
$big.Save($pngOut, [System.Drawing.Imaging.ImageFormat]::Png)
$big.Dispose()

Write-Output ("Wrote {0} ({1:N1} KB) and {2} ({3:N1} KB)" -f $out, ((Get-Item $out).Length / 1KB), $pngOut, ((Get-Item $pngOut).Length / 1KB))
