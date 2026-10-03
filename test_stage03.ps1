# test_stage03.ps1
# Stage 03 — Database schema, migrations, seeded roles, API health
# Tests the foundation: health endpoint, DB tables, seeded role data.

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

Write-Host "=== STAGE 03 — DATABASE FOUNDATION ==="

# ── Health endpoint ───────────────────────────────────────────────────────────
Write-Host "`n=== API Health ==="
Check "GET /health returns 200"          { (ApiGet "$BASE/health" $null).success -eq $true }
Check "Health response has success:true" {
  $h = ApiGet "$BASE/health" $null
  $h.success -eq $true
}

# ── Seeded roles exist (verified via login with all four dev users) ─────────
Write-Host "`n=== Seeded Roles (via dev users) ==="
$adminSess = Login "admin@dev.local" "DevAdmin123!"
Check "ADMIN role user exists and can log in"       { $null -ne $adminSess }

Start-Sleep -Milliseconds 600
$dataSess = Login "dataentry@dev.local" "DevData123!"
Check "DATA_ENTRY role user exists and can log in"  { $null -ne $dataSess }

Start-Sleep -Milliseconds 600
$reportSess = Login "reporting@dev.local" "DevReport123!"
Check "REPORTING role user exists and can log in"   { $null -ne $reportSess }

Start-Sleep -Milliseconds 600
$managerSess = Login "manager@dev.local" "DevManager123!"
Check "MANAGER role user exists and can log in"     { $null -ne $managerSess }

# ── Core tables accessible (validated indirectly via API responses) ────────
Write-Host "`n=== Core Tables (verified via authenticated endpoints) ==="

# datasets table — ADMIN can list (empty is OK)
Check "datasets table exists (list returns 200)"    {
  (ApiGet "$BASE/datasets" $adminSess).success -eq $true
}
# indicators table
Check "indicators table exists (list returns 200)"  {
  (ApiGet "$BASE/indicators" $adminSess).success -eq $true
}
# reporting_periods table
Check "reporting_periods table exists (list returns 200)" {
  (ApiGet "$BASE/reporting-periods" $adminSess).success -eq $true
}
# submissions table — DATA_ENTRY can list own (empty is OK)
Check "submissions table exists (my-list returns 200)" {
  (ApiGet "$BASE/submissions/my" $dataSess).success -eq $true
}
# users table — ADMIN can list users (Stage 11 endpoint)
Check "users table exists (admin users list returns 200)" {
  (ApiGet "$BASE/admin/users" $adminSess).success -eq $true
}
# notifications table — all users can list
Check "notifications table exists (list returns 200)" {
  (ApiGet "$BASE/notifications" $dataSess).success -eq $true
}
# audit_logs table — ADMIN audit endpoint exists
Check "audit_logs table exists (admin endpoint returns 200)" {
  (ApiGet "$BASE/admin/audit-logs" $adminSess).success -eq $true
}

# ── Unauthenticated requests are rejected ────────────────────────────────────
Write-Host "`n=== Unauthenticated Protection ==="
Check "Unauthenticated datasets -> 401" {
  try { ApiGet "$BASE/datasets" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "Unauthenticated submissions -> 401" {
  try { ApiGet "$BASE/submissions/my" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}

# ── Response envelope format ──────────────────────────────────────────────────
Write-Host "`n=== Response Envelope Format ==="
Check "Health response contains 'success' field"   {
  $h = ApiGet "$BASE/health" $null
  $h.PSObject.Properties.Name -contains 'success'
}
Check "Datasets response contains 'data' array"    {
  $r = ApiGet "$BASE/datasets" $adminSess
  $r.PSObject.Properties.Name -contains 'data'
}

Write-Host ""
Write-Host "======================================"
Write-Host "STAGE 03 RESULTS: $pass passed  /  $fail failed"
if ($fail -gt 0) { exit 1 } else { exit 0 }
