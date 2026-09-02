param(
  [int]$Port = 33881
)

$endpoint = "http://127.0.0.1:$Port/"
$deadline = (Get-Date).AddSeconds(90)

while ((Get-Date) -lt $deadline) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connected = $client.ConnectAsync('127.0.0.1', $Port).Wait(1000)
    if ($connected -and $client.Connected) {
      $client.Dispose()
      Start-Process $endpoint
      exit 0
    }
  }
  catch {
    # The server is still starting.
  }
  finally {
    $client.Dispose()
  }
  Start-Sleep -Milliseconds 400
}

exit 1
