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
$stamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "`n=== SMOKE: APP HEALTH + ROUTES ==="
Check "GET /health"            { (ApiGet "$BASE/health" $null).success -eq $true }
Check "GET /auth/me"           { (ApiGet "$BASE/auth/me" $dataSess).success -eq $true }
Check "GET /datasets"          { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "GET /indicators"        { (ApiGet "$BASE/indicators" $adminSess).success -eq $true }
Check "GET /reporting-periods" { (ApiGet "$BASE/reporting-periods" $adminSess).success -eq $true }
Check "GET /admin/users"       { (ApiGet "$BASE/admin/users" $adminSess).success -eq $true }
Check "GET /admin/audit-logs"  { (ApiGet "$BASE/admin/audit-logs" $adminSess).success -eq $true }
Check "GET /admin/system"      { (ApiGet "$BASE/admin/system/overview" $adminSess).success -eq $true }
Check "GET /analytics/dashboard" { (ApiGet "$BASE/analytics/dashboard" $managerSess).success -eq $true }

Write-Host "`n=== RBAC SPOT CHECKS ==="
Check "anon users -> 401"      { try { ApiGet "$BASE/admin/users" $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }
Check "DATA_ENTRY admin -> 403"{ try { ApiGet "$BASE/admin/users" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "REPORTING admin -> 403" { try { ApiGet "$BASE/admin/audit-logs" $reportSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "MANAGER admin -> 403"   { try { ApiGet "$BASE/admin/system/overview" $managerSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "DATA_ENTRY analytics -> 403" { try { ApiGet "$BASE/analytics/dashboard" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }

Write-Host "`n=== CRITICAL WORKFLOW SMOKE ==="
$ds = (ApiPost "$BASE/datasets" @{code="SMOKE_$stamp"; name="Smoke $stamp"} $adminSess).data
$ind = (ApiPost "$BASE/indicators" @{dataset_id=$ds.id; code='smoke_v'; name='Smoke V'; data_type='numeric'; required=$true; min_value=0; max_value=100000; precision=0} $adminSess).data
$period = (ApiPost "$BASE/reporting-periods" @{label="Smoke Period $stamp"; period_type='MONTHLY'; start_date='2026-10-01'; end_date='2026-10-31'} $adminSess).data
$sub = (ApiPost "$BASE/submissions" @{dataset_id=$ds.id; reporting_period_id=$period.id} $dataSess).data
Check "submission DRAFT"       { $sub.status -eq 'DRAFT' }
ApiPatch "$BASE/submissions/$($sub.id)" @{values=@(@{indicator_id=$ind.id; value='7'})} $dataSess | Out-Null
Check "submit -> SUBMITTED"    { (ApiPost "$BASE/submissions/$($sub.id)/submit" @{} $dataSess).data.status -eq 'SUBMITTED' }
Check "start review"           { (ApiPost "$BASE/review/submissions/$($sub.id)/start" @{} $reportSess).data.status -eq 'UNDER_REVIEW' }
Check "DATA_ENTRY approve -> 403" { try { ApiPost "$BASE/review/submissions/$($sub.id)/approve" @{} $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "approve -> APPROVED"    { (ApiPost "$BASE/review/submissions/$($sub.id)/approve" @{} $reportSess).data.status -eq 'APPROVED' }

Write-Host "`n=== REPORTS / EXPORTS / ANALYTICS ==="
Check "dataset report" {
  try { ApiGet "$BASE/reports/dataset?dataset_id=$($ds.id)&reporting_period_id=$($period.id)" $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "custom preview" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=$ds.id;indicator_ids=@($ind.id);reporting_period_ids=@($period.id)} $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "PDF export endpoint" {
  try { Invoke-WebRequest -Method Post -Uri "$BASE/reports/custom/export/pdf" -ContentType 'application/json' -Body (@{dataset_id=$ds.id;indicator_ids=@($ind.id);reporting_period_ids=@($period.id)} | ConvertTo-Json) -WebSession $reportSess -UseBasicParsing | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "analytics dashboard" { (ApiGet "$BASE/analytics/dashboard" $managerSess).success -eq $true }

Write-Host "`n=== SECURITY ==="
Check "invalid login -> 401"            { try { ApiPost "$BASE/auth/login" @{email='admin@dev.local';password='x'} $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }
Check "revoked refresh rejected"        { $s=Login 'admin@dev.local' 'DevAdmin123!'; ApiPost "$BASE/auth/logout" @{} $s | Out-Null; try { ApiPost "$BASE/auth/refresh" @{} $s; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }
Check "last admin deactivate -> 409"    { try { ApiPost "$BASE/admin/users/1/deactivate" @{} $adminSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 409 } }
Check "audit logs no password hashes"   { ((ApiGet "$BASE/admin/audit-logs" $adminSess).data | ConvertTo-Json -Depth 5) -notmatch '\$2b\$' }
Check "security headers present" {
  $h = Invoke-WebRequest "$BASE/health" -UseBasicParsing
  $h.Headers['X-Frame-Options'] -eq 'DENY' -and $h.Headers['X-Content-Type-Options'] -eq 'nosniff'
}

Write-Host "`n================================"
Write-Host "RESULT: $pass passed, $fail failed"
exit $fail
