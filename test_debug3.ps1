$BASE = "http://localhost:5000/api/v1"

# Login using HttpWebRequest (avoids PowerShell JSON escaping issue)
function DoLogin($email, $pw) {
  $s = New-Object System.Net.CookieContainer
  $req = [System.Net.HttpWebRequest]::Create("$BASE/auth/login")
  $req.Method = "POST"; $req.ContentType = "application/json"
  $req.CookieContainer = $s
  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes("{`"email`":`"$email`",`"password`":`"$pw`"}")
  $req.ContentLength = $bodyBytes.Length
  $st = $req.GetRequestStream(); $st.Write($bodyBytes,0,$bodyBytes.Length); $st.Close()
  $resp = $req.GetResponse(); $resp.Close()
  return $s
}

function DoGet($url, $cookies) {
  $req = [System.Net.HttpWebRequest]::Create($url)
  $req.Method = "GET"; $req.CookieContainer = $cookies
  try {
    $resp = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $body = $reader.ReadToEnd(); $resp.Close()
    return @{ status=200; body=$body }
  } catch [System.Net.WebException] {
    $status = [int]$_.Exception.Response.StatusCode
    $errReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errBody = $errReader.ReadToEnd()
    return @{ status=$status; body=$errBody }
  }
}

Write-Host "Logging in as DATA_ENTRY..."
$cookies = DoLogin "dataentry@dev.local" "DevData123!"
Write-Host "Cookie count: $($cookies.Count)"

Write-Host "Calling /auth/me..."
$me = DoGet "$BASE/auth/me" $cookies
Write-Host "me status=$($me.status) body=$($me.body.Substring(0, [Math]::Min(100,$me.body.Length)))"

Write-Host "Calling /analytics/data-entry-dashboard..."
$dash = DoGet "$BASE/analytics/data-entry-dashboard" $cookies
Write-Host "dash status=$($dash.status) body=$($dash.body.Substring(0, [Math]::Min(200,$dash.body.Length)))"
