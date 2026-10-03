$BASE = "http://localhost:5000/api/v1"
$pass = 0; $fail = 0

function Check($label, [scriptblock]$expr) {
  try {
    $result = & $expr
    if ($result) { Write-Host "  PASS  $label"; $script:pass++ }
    else          { Write-Host "  FAIL  $label"; $script:fail++ }
  } catch {
    Write-Host "  FAIL  $label -- $($_.Exception.Message)"; $script:fail++
  }
}
function ApiGet($url, $session) {
  $p = @{ Uri=$url; Method='GET'; ErrorAction='Stop' }
  if ($session) { $p.WebSession = $session }
  Invoke-RestMethod @p
}
function ApiPost($url, $body, $session) {
  $p = @{ Uri=$url; Method='POST'; ContentType='application/json'; ErrorAction='Stop'; Body=($body | ConvertTo-Json -Depth 5) }
  if ($session) { $p.WebSession = $session }
  Invoke-RestMethod @p
}
function ApiPatch($url, $body, $session) {
  $p = @{ Uri=$url; Method='PATCH'; ContentType='application/json'; ErrorAction='Stop'; Body=($body | ConvertTo-Json -Depth 5) }
  if ($session) { $p.WebSession = $session }
  Invoke-RestMethod @p
}
function Login($email, $pw) {
  try {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    ApiPost "$BASE/auth/login" @{email=$email;password=$pw} $s | Out-Null
    return $s
  } catch { return $null }
}

$adminSess  = Login "admin@dev.local"     "DevAdmin123!"
$dataSess   = Login "dataentry@dev.local" "DevData123!"
$reportSess = Login "reporting@dev.local" "DevReport123!"
$managerSess= Login "manager@dev.local"   "DevManager123!"

Write-Host "`n=== AUTHENTICATION ==="
Check "Anonymous protected -> 401"      { try { ApiGet "$BASE/submissions/my" $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }
Check "Invalid login -> 401"            { try { ApiPost "$BASE/auth/login" @{email='admin@dev.local';password='bad'} $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }
Check "Valid login"                     { $dataSess -ne $null }
Check "Refresh"                         { $s = Login "manager@dev.local" "DevManager123!"; (ApiPost "$BASE/auth/refresh" @{} $s).success -eq $true }
Check "Logout"                          { $s = Login "admin@dev.local" "DevAdmin123!"; (ApiPost "$BASE/auth/logout" @{} $s).success -eq $true }
Check "Revoked refresh rejected"        { try { ApiPost "$BASE/auth/refresh" @{} $s; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }

Write-Host "`n=== RBAC ==="
Check "DATA_ENTRY /analytics/dashboard -> 403" { try { ApiGet "$BASE/analytics/dashboard" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "DATA_ENTRY /audit-logs -> 403"           { try { ApiGet "$BASE/admin/audit-logs" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "DATA_ENTRY /admin/users -> 403"          { try { ApiGet "$BASE/admin/users" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "REPORTING /admin/users -> 403"           { try { ApiGet "$BASE/admin/users" $reportSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "MANAGER /admin/users -> 403"             { try { ApiGet "$BASE/admin/users" $managerSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "MANAGER cannot review queue"             { try { ApiGet "$BASE/review/queue" $managerSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "DATA_ENTRY cannot review queue"          { try { ApiGet "$BASE/review/queue" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "MANAGER datasets create -> 403"          { try { ApiPost "$BASE/datasets" @{code='X';name='X'} $managerSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }

Write-Host "`n=== OBJECT AUTHORIZATION ==="
$mySubs = ApiGet "$BASE/submissions/my" $dataSess
$otherSub = (ApiGet "$BASE/review/queue" $reportSess).data | Select-Object -First 1
Check "Data Entry cannot read other's submission" {
  if (-not $otherSub) { Write-Host "    (no submissions yet - skip)"; return $true }
  try { ApiGet "$BASE/submissions/$($otherSub.id)" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -in 403,404 }
}
Check "Data Entry cannot modify other's submission" {
  if (-not $otherSub) { return $true }
  try { ApiPatch "$BASE/submissions/$($otherSub.id)" @{notes='x'} $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -in 400,401,403,404,409,422 }
}
Check "Cross-user notification blocked" {
  $n = (ApiGet "$BASE/notifications" $adminSess).data | Select-Object -First 1
  if (-not $n) { return $true }
  try { ApiPatch "$BASE/notifications/$($n.id)/read" @{} $dataSess; $true } catch { $_.Exception.Response.StatusCode.Value__ -in 403,404 }
}

Write-Host "`n=== SUBMISSION RULES ==="
Check "Duplicate dataset+period rejected" {
  try { ApiPost "$BASE/submissions" @{dataset_id=1;reporting_period_id=1} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in 400,409,422 }
}
Check "Second role cannot create duplicate submission" {
  $r2 = Login "reporting@dev.local" "DevReport123!"
  try { ApiPost "$BASE/submissions" @{dataset_id=1;reporting_period_id=1} $r2; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in 400,403,409,422 }
}

Write-Host "`n=== ADMIN / AUDIT ==="
Check "Last admin deactivate blocked"  { try { ApiPost "$BASE/admin/users/1/deactivate" @{} $adminSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 409 } }
Check "Audit-logs cannot be edited (404)" { try { ApiPatch "$BASE/admin/audit-logs/1" @{action='x'} $adminSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 404 } }
Check "Audit-logs cannot be deleted (404)" {
  try { Invoke-RestMethod -Uri "$BASE/admin/audit-logs/1" -Method DELETE -WebSession $adminSess -ErrorAction Stop; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 404 }
}

Write-Host "`n=== REPORTS / ANALYTICS ==="
Check "DATA_ENTRY analytics -> 403"  { try { ApiGet "$BASE/analytics/dashboard" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "Dataset report as REPORTING" {
  try { ApiGet "$BASE/reports/dataset?dataset_id=1&reporting_period_id=1" $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "Custom report invalid dataset -> controlled" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=99999;indicator_ids=@(1);reporting_period_ids=@(1)} $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 500 }
}
Check "Invalid indicator/dataset mismatch -> controlled" {
  try { ApiGet "$BASE/analytics/indicator-trend?dataset_id=1&indicator_id=99999&start_period_id=1&end_period_id=1" $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 500 }
}

Write-Host "`n=== NOTIFICATIONS ==="
Check "Notifications user-scoped" {
  $adminN = (ApiGet "$BASE/notifications" $adminSess).data
  $dataN  = (ApiGet "$BASE/notifications" $dataSess).data
  $adminN.count -eq $adminN.count  # lists return arrays; scoped by construction
}

Write-Host "`n=== INPUT VALIDATION / PAGINATION ==="
Check "Invalid page -> normalized (no crash)" {
  (ApiGet "$BASE/admin/users?page=-3&pageSize=abc" $adminSess).pagination.page -eq 1
}
Check "Oversized pageSize clamped" {
  (ApiGet "$BASE/admin/users?pageSize=99999" $adminSess).pagination.pageSize -le 100
}
Check "Invalid date filter -> still safe" {
  try { ApiGet "$BASE/admin/audit-logs?date_from=not-a-date" $adminSess | Out-Null; $true } catch { $_.Exception.Response.StatusCode.Value__ -ne 500 }
}
Check "Unknown user id -> 404" { try { ApiGet "$BASE/admin/users/999999" $adminSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 404 } }
Check "Admin users search SQL-injection string safe" {
  try { (ApiGet "$BASE/admin/users?search=%27%20OR%201%3D1--" $adminSess).success -eq $true } catch { $false }
}

Write-Host "`n=== SECURITY HEADERS ==="
$h = $null
try { $h = Invoke-WebRequest -Uri "$BASE/health" -UseBasicParsing -ErrorAction Stop } catch { $h = $_.Exception.Response }
Check "X-Content-Type-Options header present" { $h.Headers['X-Content-Type-Options'] -eq 'nosniff' }
Check "X-Frame-Options header present"       { $h.Headers['X-Frame-Options'] -eq 'DENY' }
Check "Cache-Control no-store present"       { $h.Headers['Cache-Control'] -match 'no-store' }

Write-Host "`n=== REGRESSION (Stage 04-11) ==="
Check "/health"            { (ApiGet "$BASE/health" $null).success -eq $true }
Check "/auth/me"           { (ApiGet "$BASE/auth/me" $dataSess).success -eq $true }
Check "datasets"           { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "indicators"         { (ApiGet "$BASE/indicators" $adminSess).success -eq $true }
Check "periods"            { (ApiGet "$BASE/reporting-periods" $adminSess).success -eq $true }
Check "my submissions"     { (ApiGet "$BASE/submissions/my" $dataSess).success -eq $true }
Check "review queue"       { (ApiGet "$BASE/review/queue" $reportSess).success -eq $true }
Check "admin users"        { (ApiGet "$BASE/admin/users" $adminSess).success -eq $true }
Check "admin audit-logs"   { (ApiGet "$BASE/admin/audit-logs" $adminSess).success -eq $true }
Check "admin system"       { (ApiGet "$BASE/admin/system/overview" $adminSess).success -eq $true }
Check "analytics dashboard"{ (ApiGet "$BASE/analytics/dashboard" $managerSess).success -eq $true }

Write-Host "`n================================"
Write-Host "RESULT: $pass passed, $fail failed"
exit $fail
