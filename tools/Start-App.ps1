param([int]$Port = 4173, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$webRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\web'))
$listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch {
 Write-Host "Could not start port $Port. Try: powershell -File tools\Start-App.ps1 -Port 4174"
 throw
}
$url = "http://127.0.0.1:$Port/"
Write-Host "Bus Grammar is running at $url"
Write-Host 'Keep this window open. Close it or press Ctrl+C to stop.'
if (-not $NoBrowser) { Start-Process $url }
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.webmanifest'='application/manifest+json'; '.svg'='image/svg+xml'; '.png'='image/png'; '.pdf'='application/pdf' }
try {
 while ($true) {
  $client = $listener.AcceptTcpClient()
  $client.ReceiveTimeout = 5000
  $client.SendTimeout = 5000
  try {
   $stream = $client.GetStream()
   $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::ASCII)
   $first = $reader.ReadLine()
   if (-not $first) { continue }
   $parts = $first.Split(' ')
   $headerCount = 0
   while ($reader.ReadLine() -and $headerCount -lt 100) { $headerCount++ }
   $relative = [Uri]::UnescapeDataString(($parts[1] -split '\?')[0]).TrimStart('/')
   if (-not $relative) { $relative = 'index.html' }
   $filePath = [IO.Path]::GetFullPath((Join-Path $webRoot $relative))
   $status = '200 OK'
   $mime = 'text/plain; charset=utf-8'
   $bytes = [byte[]]@()
   if (-not $filePath.StartsWith($webRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $status = '403 Forbidden' }
   elseif (-not [IO.File]::Exists($filePath)) { $status = '404 Not Found' }
   elseif ($parts[0] -notin @('GET', 'HEAD')) { $status = '405 Method Not Allowed' }
   else {
    $extension = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $mime = if ($types.ContainsKey($extension)) { $types[$extension] } else { 'application/octet-stream' }
    $bytes = [IO.File]::ReadAllBytes($filePath)
   }
   $headers = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n")
   $stream.Write($headers, 0, $headers.Length)
   if ($parts[0] -ne 'HEAD' -and $bytes.Length) { $stream.Write($bytes, 0, $bytes.Length) }
   $stream.Flush()
  } catch { Write-Warning $_.Exception.Message } finally { $client.Close() }
 }
} finally { $listener.Stop() }
