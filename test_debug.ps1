$BASE = "http://localhost:5000/api/v1"

function ApiPost($url, $body, $sess) {
  $p = @{ Uri=$url; Method='POST'; ContentType='application/json'; ErrorAction='Stop'
          Body=($body | ConvertTo-Json -Depth 5) }
  if ($sess) { $p.WebSession = $sess }
  Invoke-RestMethod @p
}
function ApiGet($url, $sess) {
  $p = @{ Uri=$url; Method='GET'; ErrorAction='Stop' }
  if ($sess) { $p.WebSession = $sess }
  Invoke-RestMethod @p
}

$dataSess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = ApiPost "$BASE/auth/login" @{email="dataentry@dev.local";password="DevData123!"} $dataSess
Write-Host "Login success: $($r.success)"

$d = ApiGet "$BASE/analytics/data-entry-dashboard" $dataSess
Write-Host "Dashboard success: $($d.success)"
Write-Host "Stats keys: $(($d.data.stats.PSObject.Properties.Name) -join ', ')"
