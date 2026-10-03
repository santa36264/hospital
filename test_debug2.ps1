$BASE = "http://localhost:5000/api/v1"
function ApiPost($url, $body, $sess) {
  $p = @{ Uri=$url; Method='POST'; ContentType='application/json'; ErrorAction='Stop'; Body=($body|ConvertTo-Json -Depth 5) }
  if ($sess) { $p.WebSession = $sess }; Invoke-RestMethod @p
}
function ApiGet($url, $sess) {
  $p = @{ Uri=$url; Method='GET'; ErrorAction='Stop' }
  if ($sess) { $p.WebSession = $sess }; Invoke-RestMethod @p
}
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
ApiPost "$BASE/auth/login" @{email="dataentry@dev.local";password="DevData123!"} $s | Out-Null
$me = ApiGet "$BASE/auth/me" $s
Write-Host "Role from /me: $($me.data.role)"

# Try the existing Stage 06 endpoint to confirm session works
$subs = ApiGet "$BASE/submissions/my" $s
Write-Host "Submissions success: $($subs.success)"

# Test the new endpoint
try {
  $d = ApiGet "$BASE/analytics/data-entry-dashboard" $s
  Write-Host "Dashboard: $($d.success), keys: $($d.data.stats.PSObject.Properties.Name -join ',')"
} catch {
  $errStream = $_.Exception.Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($errStream)
  Write-Host "Dashboard error $([int]$_.Exception.Response.StatusCode): $($reader.ReadToEnd())"
}
