param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "../.."))
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$menuDir = Join-Path $Root "public/content/02_ユアタイム/01_リッチメニュー"
$backgroundPath = Join-Path $Root "public/content/01_すわぷよ/03_背景/01_村_昼.png"

$background = [Drawing.Image]::FromFile($backgroundPath)

$areas = @(
  [Drawing.Rectangle]::new(0, 0, 1000, 1686),
  [Drawing.Rectangle]::new(1000, 0, 750, 843),
  [Drawing.Rectangle]::new(1750, 0, 750, 843),
  [Drawing.Rectangle]::new(1000, 843, 750, 843),
  [Drawing.Rectangle]::new(1750, 843, 750, 843)
)

function Draw-CoverImage($graphics, $image, $destination) {
  $sourceRatio = $image.Width / $image.Height
  $destinationRatio = $destination.Width / $destination.Height
  if ($sourceRatio -gt $destinationRatio) {
    $sourceHeight = $image.Height
    $sourceWidth = [int]($sourceHeight * $destinationRatio)
    $sourceX = [int](($image.Width - $sourceWidth) / 2)
    $sourceY = 0
  } else {
    $sourceWidth = $image.Width
    $sourceHeight = [int]($sourceWidth / $destinationRatio)
    $sourceX = 0
    $sourceY = [Math]::Max(0, [int](($image.Height - $sourceHeight) * 0.62))
  }
  $graphics.DrawImage($image, $destination, $sourceX, $sourceY, $sourceWidth, $sourceHeight, [Drawing.GraphicsUnit]::Pixel)
}

function Draw-ContainedImage($graphics, $image, $box) {
  $scale = [Math]::Min($box.Width / $image.Width, $box.Height / $image.Height)
  $width = [int]($image.Width * $scale)
  $height = [int]($image.Height * $scale)
  $x = [int]($box.X + (($box.Width - $width) / 2))
  $y = [int]($box.Y + (($box.Height - $height) / 2))
  $graphics.DrawImage($image, $x, $y, $width, $height)
}

function Draw-Label($graphics, $text, $rectangle, $fontSize, $color) {
  $font = [Drawing.Font]::new("Yu Gothic UI", $fontSize, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
  $brush = [Drawing.SolidBrush]::new($color)
  $format = [Drawing.StringFormat]::new()
  $format.Alignment = [Drawing.StringAlignment]::Center
  $format.LineAlignment = [Drawing.StringAlignment]::Center
  $graphics.DrawString($text, $font, $brush, $rectangle, $format)
  $format.Dispose()
  $brush.Dispose()
  $font.Dispose()
}

function Draw-RoundedCard($graphics, $rectangle, $tint) {
  $radius = 38
  $path = [Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($rectangle.X, $rectangle.Y, $radius, $radius, 180, 90)
  $path.AddArc($rectangle.Right - $radius, $rectangle.Y, $radius, $radius, 270, 90)
  $path.AddArc($rectangle.Right - $radius, $rectangle.Bottom - $radius, $radius, $radius, 0, 90)
  $path.AddArc($rectangle.X, $rectangle.Bottom - $radius, $radius, $radius, 90, 90)
  $path.CloseFigure()
  $fill = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(194, $tint.R, $tint.G, $tint.B))
  $graphics.FillPath($fill, $path)
  $fill.Dispose()
  $path.Dispose()
}

function Draw-MenuIcon($graphics, $kind, $box, $accent) {
  $pen = [Drawing.Pen]::new($accent, 16)
  $pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
  $fill = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(46, $accent.R, $accent.G, $accent.B))
  $x = $box.X; $y = $box.Y; $w = $box.Width; $h = $box.Height
  switch ($kind) {
    "game" { $graphics.FillEllipse($fill, $x + 65, $y + 65, $w - 130, $h - 130); $graphics.DrawEllipse($pen, $x + 65, $y + 65, $w - 130, $h - 130); $graphics.DrawLine($pen, $x + 125, $y + ($h / 2), $x + ($w / 2), $y + ($h / 2)); $graphics.DrawLine($pen, $x + ($w / 2), $y + 125, $x + ($w / 2), $y + ($h / 2)); $graphics.DrawEllipse($pen, $x + $w - 165, $y + 125, 35, 35); $graphics.DrawEllipse($pen, $x + $w - 165, $y + 195, 35, 35) }
    "booths" { $graphics.DrawRectangle($pen, $x + 75, $y + 150, $w - 150, $h - 210); for($i=0;$i -lt 4;$i++){ $graphics.DrawLine($pen, $x + 75 + ($i * (($w - 150)/3)), $y + 150, $x + 125 + ($i * (($w - 150)/3)), $y + 75) }; $graphics.DrawLine($pen, $x + 75, $y + 150, $x + $w - 75, $y + 150); $graphics.DrawLine($pen, $x + ($w/2), $y + 210, $x + ($w/2), $y + $h - 60) }
    "info" { $graphics.DrawRectangle($pen, $x + 80, $y + 100, $w - 160, $h - 160); $graphics.DrawLine($pen, $x + 80, $y + 190, $x + $w - 80, $y + 190); $graphics.DrawEllipse($pen, $x + 145, $y + 245, 55, 55); $graphics.DrawLine($pen, $x + 235, $y + 270, $x + $w - 135, $y + 270); $graphics.DrawLine($pen, $x + 145, $y + 360, $x + $w - 135, $y + 360) }
    "makers" { $graphics.DrawLine($pen, $x + 120, $y + $h - 95, $x + $w - 105, $y + 110); $graphics.DrawLine($pen, $x + 145, $y + $h - 65, $x + $w - 75, $y + 140); $graphics.DrawLine($pen, $x + $w - 155, $y + 70, $x + $w - 95, $y + 130); $graphics.DrawLine($pen, $x + $w - 125, $y + 40, $x + $w - 125, $y + 120) }
    "friends" { $graphics.DrawEllipse($pen, $x + 70, $y + 80, 115, 115); $graphics.DrawEllipse($pen, $x + $w - 185, $y + 80, 115, 115); $graphics.DrawEllipse($pen, $x + ($w/2) - 58, $y + 35, 116, 116); $graphics.DrawArc($pen, $x + 55, $y + 175, 165, 165, 195, 150); $graphics.DrawArc($pen, $x + $w - 220, $y + 175, 165, 165, 195, 150); $graphics.DrawArc($pen, $x + ($w/2) - 100, $y + 145, 200, 200, 195, 150) }
    "map" { $graphics.DrawLine($pen, $x + 75, $y + 85, $x + 75, $y + $h - 75); $graphics.DrawLine($pen, $x + ($w/2), $y + 125, $x + ($w/2), $y + $h - 115); $graphics.DrawLine($pen, $x + $w - 75, $y + 85, $x + $w - 75, $y + $h - 75); $graphics.DrawLine($pen, $x + 75, $y + 85, $x + ($w/2), $y + 125); $graphics.DrawLine($pen, $x + ($w/2), $y + 125, $x + $w - 75, $y + 85); $graphics.DrawLine($pen, $x + 75, $y + $h - 75, $x + ($w/2), $y + $h - 115); $graphics.DrawLine($pen, $x + ($w/2), $y + $h - 115, $x + $w - 75, $y + $h - 75) }
    "schedule" { $graphics.DrawRectangle($pen, $x + 80, $y + 100, $w - 160, $h - 160); $graphics.DrawLine($pen, $x + 80, $y + 205, $x + $w - 80, $y + 205); $graphics.DrawLine($pen, $x + 165, $y + 55, $x + 165, $y + 145); $graphics.DrawLine($pen, $x + $w - 165, $y + 55, $x + $w - 165, $y + 145); for($row=0;$row -lt 2;$row++){ for($col=0;$col -lt 3;$col++){ $graphics.FillEllipse($fill, $x + 145 + ($col*95), $y + 265 + ($row*85), 38, 38) } } }
    "help" { $graphics.DrawEllipse($pen, $x + 70, $y + 50, $w - 140, $h - 140); Draw-Label $graphics "?" ([Drawing.RectangleF]::new($x + 80, $y + 45, $w - 160, $h - 150)) 180 $accent }
    "memories" { $graphics.DrawRectangle($pen, $x + 65, $y + 95, $w - 130, $h - 160); $graphics.DrawLine($pen, $x + 130, $y + $h - 130, $x + ($w/2), $y + ($h/2)); $graphics.DrawLine($pen, $x + ($w/2), $y + ($h/2), $x + $w - 130, $y + $h - 130); $graphics.DrawEllipse($pen, $x + $w - 175, $y + 145, 60, 60) }
    "feedback" { $graphics.DrawRectangle($pen, $x + 70, $y + 90, $w - 140, $h - 180); $graphics.DrawLine($pen, $x + 180, $y + $h - 90, $x + 235, $y + $h - 180); $graphics.DrawLine($pen, $x + 235, $y + $h - 180, $x + 295, $y + $h - 90); Draw-Label $graphics "♡" ([Drawing.RectangleF]::new($x + 85, $y + 95, $w - 170, $h - 190)) 170 $accent }
    "instagram" { $graphics.DrawRectangle($pen, $x + 85, $y + 75, $w - 170, $h - 150); $graphics.DrawEllipse($pen, $x + 160, $y + 150, $w - 320, $h - 300); $graphics.FillEllipse($fill, $x + $w - 175, $y + 140, 34, 34) }
  }
  $fill.Dispose(); $pen.Dispose()
}

function Render-Menu($fileName, $labels, $accent, $mainIcon, $rightIcons) {
  $bitmap = [Drawing.Bitmap]::new(2500, 1686)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  Draw-CoverImage $graphics $background ([Drawing.Rectangle]::new(0, 0, 2500, 1686))

  $tints = @(
    [Drawing.Color]::FromArgb(255, 248, 225),
    [Drawing.Color]::FromArgb(232, 249, 241),
    [Drawing.Color]::FromArgb(255, 244, 221),
    [Drawing.Color]::FromArgb(244, 239, 255),
    [Drawing.Color]::FromArgb(255, 235, 240)
  )
  $wash = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(84, 255, 255, 255))
  $graphics.FillRectangle($wash, 0, 0, 2500, 1686)
  $wash.Dispose()
  for ($index = 1; $index -lt $areas.Count; $index++) {
    $area = $areas[$index]
    $card = [Drawing.Rectangle]::new($area.X + 24, $area.Y + 24, $area.Width - 48, $area.Height - 48)
    Draw-RoundedCard $graphics $card $tints[$index]
  }

  Draw-Label $graphics $labels[0] ([Drawing.RectangleF]::new(65, 115, 870, 165)) 86 ([Drawing.Color]::FromArgb(41, 68, 63))

  Draw-MenuIcon $graphics $mainIcon ([Drawing.Rectangle]::new(245, 420, 510, 510)) $accent
  $accentLine = [Drawing.Pen]::new($accent, 12)
  $graphics.DrawLine($accentLine, 315, 310, 685, 310)
  $accentLine.Dispose()

  for ($index = 1; $index -lt 5; $index++) {
    $area = $areas[$index]
    $labelTop = $area.Y + 75
    $labelHeight = 145
    Draw-Label $graphics $labels[$index] ([Drawing.RectangleF]::new($area.X + 55, $labelTop, $area.Width - 110, $labelHeight)) 51 ([Drawing.Color]::FromArgb(41, 68, 63))
    Draw-MenuIcon $graphics $rightIcons[$index - 1] ([Drawing.Rectangle]::new($area.X + 215, $area.Y + 270, 320, 390)) $accent
  }

  $codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $parameters = [Drawing.Imaging.EncoderParameters]::new(1)
  $parameters.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, 80L)
  $bitmap.Save((Join-Path $menuDir $fileName), $codec, $parameters)
  $parameters.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Render-Menu "01_開催前_案v3.jpg" @(
  "すわぷよで遊ぶ", "出展ブース", "YourTIME.`n日時・アクセス", "すわぷよの作り手", "なかまたち"
) ([Drawing.Color]::FromArgb(28, 133, 112)) "game" @("booths", "info", "makers", "friends")

Render-Menu "02_開催中_案v2.jpg" @(
  "会場マップ", "ブースを探す", "すわぷよ", "タイムテーブル", "困ったとき"
) ([Drawing.Color]::FromArgb(220, 118, 35)) "map" @("booths", "game", "schedule", "help")

Render-Menu "03_開催後_案v2.jpg" @(
  "すわぷよ", "出展者を`nもう一度見る", "イベントの思い出", "感想を送る", "次回・Instagram"
) ([Drawing.Color]::FromArgb(174, 76, 128)) "game" @("booths", "memories", "feedback", "instagram")

$background.Dispose()
