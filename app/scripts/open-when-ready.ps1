$endpoint = 'http://localhost:3000/'
$deadline = (Get-Date).AddSeconds(90)

while ((Get-Date) -lt $deadline) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connected = $client.ConnectAsync('127.0.0.1', 3000).Wait(1000)
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
