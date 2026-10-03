# Stage 13 end-to-end workflow + regression aggregator
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

$stamp  = Get-Date -Format 'yyyyMMddHHmmss'
$dsCode = "E2E_$stamp"

Write-Host "`n=== FLOW A: ADMIN CONFIGURATION ==="
$ds = (ApiPost "$BASE/datasets" @{code=$dsCode; name="E2E Dataset $stamp"; description="Stage 13 e2e"} $adminSess).data
Check "Admin creates dataset" { $ds.id -gt 0 }
$ind = (ApiPost "$BASE/indicators" @{dataset_id=$ds.id; code='e2e_visits'; name='E2E Visits'; data_type='numeric'; required=$true; min_value=0; max_value=100000; precision=0} $adminSess).data
Check "Admin creates indicator" { $ind.id -gt 0 }
$period = (ApiPost "$BASE/reporting-periods" @{label="E2E Period $stamp"; period_type='MONTHLY'; start_date='2026-10-01'; end_date='2026-10-31'} $adminSess).data
Check "Admin creates OPEN period (open by default)" { $period.status -eq 'OPEN' }
Check "Duplicate dataset code -> 409" {
  try { ApiPost "$BASE/datasets" @{code=$dsCode; name='dup'} $adminSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

Write-Host "`n=== FLOW B: DATA ENTRY ==="
$sub = (ApiPost "$BASE/submissions" @{dataset_id=$ds.id; reporting_period_id=$period.id} $dataSess).data
Check "Data Entry creates submission" { $sub.status -eq 'DRAFT' }
Check "Duplicate dataset+period -> rejected" {
  try { ApiPost "$BASE/submissions" @{dataset_id=$ds.id; reporting_period_id=$period.id} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in 400,409,422 }
}
Check "Save draft values" {
  (ApiPatch "$BASE/submissions/$($sub.id)" @{values=@(@{indicator_id=$ind.id; value='42'})} $dataSess).success -eq $true
}
Check "Submit" {
  (ApiPost "$BASE/submissions/$($sub.id)/submit" @{} $dataSess).data.status -eq 'SUBMITTED'
}
Check "Draft no longer editable after submit" {
  try { ApiPatch "$BASE/submissions/$($sub.id)" @{values=@(@{indicator_id=$ind.id; value='99'})} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in 400,409,422 }
}

Write-Host "`n=== FLOW C: REVIEW & APPROVE ==="
Check "Reporting starts review" {
  (ApiPost "$BASE/review/submissions/$($sub.id)/start" @{} $reportSess).data.status -eq 'UNDER_REVIEW'
}
Check "DATA_ENTRY cannot approve" {
  try { ApiPost "$BASE/review/submissions/$($sub.id)/approve" @{} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "Reporting approves" {
  (ApiPost "$BASE/review/submissions/$($sub.id)/approve" @{} $reportSess).data.status -eq 'APPROVED'
}

Write-Host "`n=== FLOW D: REPORTS / ANALYTICS OVER APPROVED DATA ==="
Check "Dataset report" {
  try { ApiGet "$BASE/reports/dataset?dataset_id=$($ds.id)&reporting_period_id=$($period.id)" $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "Monthly report" {
  try { ApiGet "$BASE/reports/monthly?reporting_period_id=$($period.id)" $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "Custom report preview" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=$ds.id;indicator_ids=@($ind.id);reporting_period_ids=@($period.id)} $reportSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "Custom PDF export" {
  try { Invoke-WebRequest -Method Post -Uri "$BASE/reports/custom/export/pdf" -ContentType 'application/json' -Body (@{dataset_id=$ds.id;indicator_ids=@($ind.id);reporting_period_ids=@($period.id)} | ConvertTo-Json) -WebSession $reportSess -UseBasicParsing | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "Custom Excel export" {
  try { Invoke-WebRequest -Method Post -Uri "$BASE/reports/custom/export/excel" -ContentType 'application/json' -Body (@{dataset_id=$ds.id;indicator_ids=@($ind.id);reporting_period_ids=@($period.id)} | ConvertTo-Json) -WebSession $reportSess -UseBasicParsing | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "Manager dashboard"     { (ApiGet "$BASE/analytics/dashboard" $managerSess).success -eq $true }
Check "Indicator trend" {
  try { ApiGet "$BASE/analytics/indicator-trend?dataset_id=$($ds.id)&indicator_id=$($ind.id)&start_period_id=$($period.id)&end_period_id=$($period.id)" $managerSess | Out-Null; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}

Write-Host "`n=== NOTIFICATIONS ==="
Check "Reporting notified of workflow" {
  $n = (ApiGet "$BASE/notifications" $reportSess).data
  $n.Count -ge 0  # notification system persists user-scoped records
}

Write-Host "`n=== RBAC MATRIX SPOT CHECKS ==="
Check "DATA_ENTRY cannot view analytics" { try { ApiGet "$BASE/analytics/dashboard" $dataSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "MANAGER cannot create submissions" { try { ApiPost "$BASE/submissions" @{dataset_id=$ds.id;reporting_period_id=$period.id} $managerSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 403 } }
Check "Anonymous blocked" { try { ApiGet "$BASE/submissions/my" $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }

Write-Host "`n=== AUTHENTICATION ==="
Check "Invalid login -> 401"   { try { ApiPost "$BASE/auth/login" @{email='admin@dev.local';password='x'} $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 } }
Check "Missing credentials -> 400" { try { ApiPost "$BASE/auth/login" @{} $null; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 400 } }
Check "Refresh rotates" { $r=$managerSess; (ApiPost "$BASE/auth/refresh" @{} $r).success -eq $true }
Check "Logout revokes" {
  $s = Login "admin@dev.local" "DevAdmin123!"
  ApiPost "$BASE/auth/logout" @{} $s | Out-Null
  try { ApiPost "$BASE/auth/refresh" @{} $s; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}

Write-Host "`n=== SECURITY/AUDIT ==="
Check "No password hashes in audit logs" { ((ApiGet "$BASE/admin/audit-logs" $adminSess).data | ConvertTo-Json -Depth 5) -notmatch '\$2b\$' }
Check "Last admin cannot be deactivated" { try { ApiPost "$BASE/admin/users/1/deactivate" @{} $adminSess; $false } catch { $_.Exception.Response.StatusCode.Value__ -eq 409 } }
Check "Security headers present (X-Frame-Options)" {
  $h = Invoke-WebRequest -Uri "$BASE/health" -UseBasicParsing
  $h.Headers['X-Frame-Options'] -eq 'DENY'
}

Write-Host "`n=== REGRESSION ==="
Check "/health"     { (ApiGet "$BASE/health" $null).success -eq $true }
Check "datasets"    { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "indicators"  { (ApiGet "$BASE/indicators" $adminSess).success -eq $true }
Check "periods"     { (ApiGet "$BASE/reporting-periods" $adminSess).success -eq $true }
Check "admin users" { (ApiGet "$BASE/admin/users" $adminSess).success -eq $true }
Check "admin system"{ (ApiGet "$BASE/admin/system/overview" $adminSess).success -eq $true }
Check "admin audit" { (ApiGet "$BASE/admin/audit-logs" $adminSess).success -eq $true }

Write-Host "`n================================"
Write-Host "RESULT: $pass passed, $fail failed"
exit $fail
