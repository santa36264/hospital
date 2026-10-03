# test_stage04.ps1
# Stage 04 — Authentication, JWT sessions, RBAC
# Tests login, token refresh, logout, session expiry, role enforcement.

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
  $p = @{ Uri=$url; Method='POST'; ContentType='application/json'; ErrorAction='Stop'
          Body=($body | ConvertTo-Json -Depth 5) }
  if ($session) { $p.WebSession = $session }
  Invoke-RestMethod @p
}
function Login($email, $pw) {
  try {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    ApiPost "$BASE/auth/login" @{email=$email;password=$pw} $s | Out-Null
    return $s
  } catch {
    Write-Host "  WARN  login failed: $email -- $($_.Exception.Message)"
    return $null
  }
}

Write-Host "=== STAGE 04 - AUTHENTICATION AND RBAC ==="

# ── Login success ─────────────────────────────────────────────────────────────
Write-Host "`n=== Login ==="
$adminSess = Login "admin@dev.local" "DevAdmin123!"
Check "Admin login succeeds"       { $null -ne $adminSess }

Start-Sleep -Milliseconds 600
$dataSess = Login "dataentry@dev.local" "DevData123!"
Check "Data entry login succeeds"  { $null -ne $dataSess }

Start-Sleep -Milliseconds 600
$reportSess = Login "reporting@dev.local" "DevReport123!"
Check "Reporting login succeeds"   { $null -ne $reportSess }

# ── /auth/me returns authenticated user ──────────────────────────────────────
Write-Host "`n=== /auth/me ==="
$me = ApiGet "$BASE/auth/me" $adminSess
Check "/auth/me returns user data"       { $me.success -eq $true }
Check "/auth/me has email field"         { $null -ne $me.data.email }
Check "/auth/me does not expose password_hash" {
  $null -eq $me.data.password_hash
}
Check "/auth/me role is ADMIN"           { $me.data.role -eq 'ADMIN' }

$meData = ApiGet "$BASE/auth/me" $dataSess
Check "Data entry /auth/me role is DATA_ENTRY" { $meData.data.role -eq 'DATA_ENTRY' }

# ── Invalid credentials ───────────────────────────────────────────────────────
Write-Host "`n=== Invalid Credentials ==="
Check "Wrong password -> 401" {
  try { ApiPost "$BASE/auth/login" @{email="admin@dev.local";password="WrongPass999!"} $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "Unknown email -> 401" {
  try { ApiPost "$BASE/auth/login" @{email="nobody@nowhere.com";password="Whatever123"} $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "Missing email -> 400" {
  try { ApiPost "$BASE/auth/login" @{password="Whatever123"} $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in @(400, 422) }
}
Check "Missing password -> 400" {
  try { ApiPost "$BASE/auth/login" @{email="admin@dev.local"} $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in @(400, 422) }
}

# ── Unauthenticated requests rejected ────────────────────────────────────────
Write-Host "`n=== Unauthenticated Rejection ==="
Check "Anonymous /auth/me -> 401" {
  try { ApiGet "$BASE/auth/me" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "Anonymous /datasets -> 401" {
  try { ApiGet "$BASE/datasets" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "Anonymous /submissions/my -> 401" {
  try { ApiGet "$BASE/submissions/my" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}

# ── RBAC role enforcement ─────────────────────────────────────────────────────
Write-Host "`n=== RBAC Role Enforcement ==="
# ADMIN-only endpoints
Check "DATA_ENTRY cannot create dataset (403)" {
  try { Invoke-RestMethod -Uri "$BASE/datasets" -Method POST -ContentType 'application/json' `
    -Body '{"code":"RBAC_TEST","name":"RBAC Test"}' -WebSession $dataSess -ErrorAction Stop; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "REPORTING cannot create indicator (403)" {
  try { Invoke-RestMethod -Uri "$BASE/indicators" -Method POST -ContentType 'application/json' `
    -Body '{"dataset_id":1,"code":"X","name":"X","data_type":"numeric"}' -WebSession $reportSess -ErrorAction Stop; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
# DATA_ENTRY-only endpoints
Check "ADMIN cannot use /submissions/my... well gets forbidden (403)" {
  try { Invoke-RestMethod -Uri "$BASE/submissions" -Method POST -ContentType 'application/json' `
    -Body '{"dataset_id":1,"reporting_period_id":1}' -WebSession $adminSess -ErrorAction Stop; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "REPORTING cannot create submission (403)" {
  try { Invoke-RestMethod -Uri "$BASE/submissions" -Method POST -ContentType 'application/json' `
    -Body '{"dataset_id":1,"reporting_period_id":1}' -WebSession $reportSess -ErrorAction Stop; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
# Review endpoints — REPORTING only
Check "DATA_ENTRY cannot access review queue (403)" {
  try { ApiGet "$BASE/review/queue" $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "ADMIN cannot access review queue (403)" {
  try { ApiGet "$BASE/review/queue" $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
# Analytics endpoints — MANAGER, REPORTING, ADMIN only
Check "DATA_ENTRY cannot access analytics dashboard (403)" {
  try { ApiGet "$BASE/analytics/dashboard" $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

# ── Refresh token ─────────────────────────────────────────────────────────────
Write-Host "`n=== Token Refresh ==="
$refreshSess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
ApiPost "$BASE/auth/login" @{email="dataentry@dev.local";password="DevData123!"} $refreshSess | Out-Null
$meBefore = ApiGet "$BASE/auth/me" $refreshSess
Check "Session is active before refresh"  { $meBefore.success -eq $true }

$refreshResult = ApiPost "$BASE/auth/refresh" @{} $refreshSess
Check "Refresh succeeds"                  { $refreshResult.success -eq $true }

$meAfter = ApiGet "$BASE/auth/me" $refreshSess
Check "Session still active after refresh" { $meAfter.success -eq $true }
Check "User identity preserved after refresh" { $meAfter.data.email -eq "dataentry@dev.local" }

# ── Logout ─────────────────────────────────────────────────────────────────────
Write-Host "`n=== Logout ==="
$logoutSess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
ApiPost "$BASE/auth/login" @{email="dataentry@dev.local";password="DevData123!"} $logoutSess | Out-Null
$preLogout = ApiGet "$BASE/auth/me" $logoutSess
Check "Authenticated before logout"  { $preLogout.success -eq $true }

ApiPost "$BASE/auth/logout" @{} $logoutSess | Out-Null
Check "Authenticated endpoint rejected after logout" {
  try { ApiGet "$BASE/auth/me" $logoutSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}

# ── Admin audit logging ────────────────────────────────────────────────────────
Write-Host "`n=== Audit Logging ==="
$auditLogs = ApiGet "$BASE/admin/audit-logs" $adminSess
Check "Audit log endpoint accessible by ADMIN"    { $auditLogs.success -eq $true }
Check "Audit log has data array"                  { $null -ne $auditLogs.data }
Check "Audit log has pagination meta"             {
  $null -ne $auditLogs.pagination -or $null -ne $auditLogs.meta
}
Check "Audit log entries have action field"       {
  @($auditLogs.data).Count -eq 0 -or $null -ne (@($auditLogs.data)[0]).action
}

Write-Host ""
Write-Host "======================================"
Write-Host "STAGE 04 RESULTS: $pass passed  /  $fail failed"
if ($fail -gt 0) { exit 1 } else { exit 0 }
