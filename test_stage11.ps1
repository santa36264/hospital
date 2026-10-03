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

Write-Host "`n=== AUTHORIZATION ==="
Check "Anonymous -> 401"          { try { ApiGet "$BASE/admin/users" $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }
Check "DATA_ENTRY -> 403"         { try { ApiGet "$BASE/admin/users" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "REPORTING -> 403"          { try { ApiGet "$BASE/admin/audit-logs" $reportSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "MANAGER -> 403"            { try { ApiGet "$BASE/admin/system/overview" $managerSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "ADMIN -> 200 users"        { (ApiGet "$BASE/admin/users" $adminSess).success -eq $true }

Write-Host "`n=== USER MANAGEMENT ==="
Check "List users"                { (ApiGet "$BASE/admin/users" $adminSess).data.Count -ge 4 }
Check "Pagination present"        { (ApiGet "$BASE/admin/users?page=1&pageSize=2" $adminSess).pagination.totalPages -ge 2 }
Check "Search works"              { (ApiGet "$BASE/admin/users?search=admin@dev.local" $adminSess).data[0].email -eq 'admin@dev.local' }
Check "Role filter works"         { (ApiGet "$BASE/admin/users?role=MANAGER" $adminSess).data[0].role -eq 'MANAGER' }
Check "Status filter works"       { (ApiGet "$BASE/admin/users?status=ACTIVE" $adminSess).data.Count -ge 1 }

$createBody = @{ name='Test User'; email='testuser@dev.local'; role='MANAGER'; password='TestPassword123!' }
Check "Create user" {
  $r = ApiPost "$BASE/admin/users" $createBody $adminSess
  $r.success -eq $true -and $r.data.email -eq 'testuser@dev.local'
}
Check "Duplicate email -> 409" {
  try { ApiPost "$BASE/admin/users" $createBody $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}
$testUser = (ApiGet "$BASE/admin/users?search=testuser@dev.local" $adminSess).data[0]
Check "Get user / no password hash" {
  $u = ApiGet "$BASE/admin/users/$($testUser.id)" $adminSess
  ($u.data.email -eq 'testuser@dev.local') -and ($u.data.PSObject.Properties.Name -notcontains 'password_hash')
}
Check "Update user" {
  (ApiPatch "$BASE/admin/users/$($testUser.id)" @{ name='Test User 2' } $adminSess).data.name -eq 'Test User 2'
}
Check "Change role" {
  (ApiPatch "$BASE/admin/users/$($testUser.id)" @{ role='REPORTING' } $adminSess).data.role -eq 'REPORTING'
}
Check "Deactivate user" {
  (ApiPost "$BASE/admin/users/$($testUser.id)/deactivate" @{} $adminSess).data.status -eq 'INACTIVE'
}
Check "Activate user" {
  (ApiPost "$BASE/admin/users/$($testUser.id)/activate" @{} $adminSess).data.status -eq 'ACTIVE'
}

Write-Host "`n=== LAST ADMIN PROTECTION ==="
Check "Cannot deactivate last active ADMIN" {
  try { ApiPost "$BASE/admin/users/1/deactivate" @{} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}
Check "Cannot change last ADMIN role" {
  try { ApiPatch "$BASE/admin/users/1" @{ role='MANAGER' } $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

Write-Host "`n=== PASSWORD MANAGEMENT ==="
Check "Admin changes user password" {
  (ApiPost "$BASE/admin/users/$($testUser.id)/password" @{ password='NewSecret123!' } $adminSess).success -eq $true
}
Check "New login works with new password" {
  $s = Login 'testuser@dev.local' 'NewSecret123!'
  $s -ne $null
}
Check "Old password no longer works" {
  $s = Login 'testuser@dev.local' 'TestPassword123!'
  $s -eq $null
}
Check "Password change audit event exists" {
  $log = (ApiGet "$BASE/admin/audit-logs?action=USER_PASSWORD_CHANGED" $adminSess).data
  $log.Count -ge 1
}
Check "User created audit event exists" {
  $log = (ApiGet "$BASE/admin/audit-logs?action=USER_CREATED" $adminSess).data
  $log.Count -ge 1
}

Write-Host "`n=== AUDIT LOGS ==="
Check "Admin lists audit logs"       { (ApiGet "$BASE/admin/audit-logs" $adminSess).success -eq $true }
Check "Audit pagination present"     { (ApiGet "$BASE/admin/audit-logs?page=1&pageSize=5" $adminSess).pagination.pageSize -eq 5 }
Check "Action filter works"          { (ApiGet "$BASE/admin/audit-logs?action=USER_CREATED" $adminSess).data[0].action -eq 'USER_CREATED' }
Check "No password hashes in logs"   { ((ApiGet "$BASE/admin/audit-logs" $adminSess).data | ConvertTo-Json -Depth 5) -notmatch '\$2b\$' }

Write-Host "`n=== SYSTEM ==="
Check "System overview works"        { (ApiGet "$BASE/admin/system/overview" $adminSess).success -eq $true }
Check "Overview has no secrets"      { ((ApiGet "$BASE/admin/system/overview" $adminSess) | ConvertTo-Json -Depth 6) -notmatch 'JWT_|DATABASE_PASSWORD|secret' }

Write-Host "`n=== REGRESSION (Stage 04-10) ==="
Check "/health"                       { (ApiGet "$BASE/health" $null).success -eq $true }
Check "/auth/me"                      { (ApiGet "$BASE/auth/me" $dataSess).success -eq $true }
Check "datasets"                      { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "indicators"                    { (ApiGet "$BASE/indicators" $adminSess).success -eq $true }
Check "reporting-periods"             { (ApiGet "$BASE/reporting-periods" $adminSess).success -eq $true }
Check "my submissions"                { (ApiGet "$BASE/submissions/my" $dataSess).success -eq $true }
Check "review queue"                  { (ApiGet "$BASE/review/queue" $reportSess).success -eq $true }
Check "dataset report" {
  try { ApiGet "$BASE/reports/dataset?dataset_id=1&reporting_period_id=1" $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "custom report preview endpoint" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=99999;indicator_ids=@(1);reporting_period_ids=@(1)} $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "analytics dashboard"           { (ApiGet "$BASE/analytics/dashboard" $managerSess).success -eq $true }
Check "analytics indicator-trend" {
  try { ApiGet "$BASE/analytics/indicator-trend?dataset_id=1&indicator_id=1&start_period_id=1&end_period_id=1" $managerSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "analytics indicator-comparison" {
  try { ApiGet "$BASE/analytics/indicator-comparison?dataset_id=1&indicator_id=1&period_a=1&period_b=2" $managerSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}

Write-Host "`n================================"
Write-Host "RESULT: $pass passed, $fail failed"
exit $fail
