# test_stage05.ps1
# Stage 05 - Dataset, Indicator and Reporting Period configuration management
# Tests CRUD, validation, duplicates, status transitions, ADMIN-only RBAC.

$BASE = "http://localhost:5000/api/v1"
$script:pass = 0
$script:fail = 0

function Check($label, [scriptblock]$expr) {
  try {
    $result = & $expr
    if ($result) { Write-Host "  PASS  $label"; $script:pass++ }
    else          { Write-Host "  FAIL  $label"; $script:fail++ }
  } catch {
    Write-Host "  FAIL  $label -- $($_.Exception.Message)"; $script:fail++
  }
}

function ApiGet($url, $sess) {
  $p = @{ Uri=$url; Method='GET'; ErrorAction='Stop' }
  if ($sess) { $p.WebSession = $sess }
  Invoke-RestMethod @p
}

function ApiPost($url, $body, $sess) {
  $p = @{ Uri=$url; Method='POST'; ContentType='application/json'; ErrorAction='Stop'
          Body=($body | ConvertTo-Json -Depth 5) }
  if ($sess) { $p.WebSession = $sess }
  Invoke-RestMethod @p
}

function ApiPatch($url, $body, $sess) {
  $p = @{ Uri=$url; Method='PATCH'; ContentType='application/json'; ErrorAction='Stop'
          Body=($body | ConvertTo-Json -Depth 5) }
  if ($sess) { $p.WebSession = $sess }
  Invoke-RestMethod @p
}

Write-Host "=== STAGE 05 - CONFIGURATION MANAGEMENT ==="

# Login once, abort clearly if it fails
Write-Host "Logging in..."
$adminSess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$dataSess  = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$adminLogin = ApiPost "$BASE/auth/login" @{email="admin@dev.local";password="DevAdmin123!"} $adminSess
if ($adminLogin.success -ne $true) { Write-Host "ABORT: admin login failed"; exit 1 }
Write-Host "  Admin logged in OK"

Start-Sleep -Milliseconds 700
$dataLogin = ApiPost "$BASE/auth/login" @{email="dataentry@dev.local";password="DevData123!"} $dataSess
if ($dataLogin.success -ne $true) { Write-Host "ABORT: data entry login failed"; exit 1 }
Write-Host "  Data entry logged in OK"

# ── DATASET - Authorization ────────────────────────────────────────────────────
Write-Host "`n=== Dataset Authorization ==="
Check "Anonymous cannot list datasets (401)" {
  try { ApiGet "$BASE/datasets" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "DATA_ENTRY cannot create dataset (403)" {
  try { ApiPost "$BASE/datasets" @{code="UNAUTH";name="Unauth"} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

# ── DATASET - CRUD ────────────────────────────────────────────────────────────
Write-Host "`n=== Dataset CRUD ==="
$ts = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$dsCode = "S05DS" + $ts

$dsCreateResult = ApiPost "$BASE/datasets" @{code=$dsCode;name="Stage05 Dataset"} $adminSess
Check "Dataset created successfully"          { $dsCreateResult.success -eq $true }
Check "Dataset status is ACTIVE"              { $dsCreateResult.data.status -eq 'ACTIVE' }
Check "Dataset code normalized to uppercase"  { $dsCreateResult.data.code -eq $dsCode.ToUpper() }

$dsId = $dsCreateResult.data.id
Write-Host "  Created dataset id=$dsId"

$dsUpdateResult = ApiPatch "$BASE/datasets/$dsId" @{name="Stage05 Dataset Updated"} $adminSess
Check "Dataset updated successfully"          { $dsUpdateResult.success -eq $true }
Check "Updated name is applied"               { $dsUpdateResult.data.name -eq "Stage05 Dataset Updated" }

$dsGetResult = ApiGet "$BASE/datasets/$dsId" $adminSess
Check "Dataset retrieved by id"               { $dsGetResult.data.id -eq $dsId }

$dsList = ApiGet "$BASE/datasets?status=ACTIVE" $adminSess
Check "Dataset in active list"                { @($dsList.data | Where-Object { [int]$_.id -eq [int]$dsId }).Count -eq 1 }

# ── DATASET - Validation ──────────────────────────────────────────────────────
Write-Host "`n=== Dataset Validation ==="
Check "Missing name gives 422" {
  try { ApiPost "$BASE/datasets" @{code="NONAME$ts"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "Missing code gives 422" {
  try { ApiPost "$BASE/datasets" @{name="No Code"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "Duplicate code gives 409" {
  try { ApiPost "$BASE/datasets" @{code=$dsCode;name="Dup Test"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

# ── DATASET - Status transition ───────────────────────────────────────────────
Write-Host "`n=== Dataset Status ==="
$dsDeact = ApiPatch "$BASE/datasets/$dsId/status" @{status="INACTIVE"} $adminSess
Check "Dataset deactivated"    { $dsDeact.data.status -eq 'INACTIVE' }
$dsAct   = ApiPatch "$BASE/datasets/$dsId/status" @{status="ACTIVE"} $adminSess
Check "Dataset reactivated"    { $dsAct.data.status -eq 'ACTIVE' }

# ── INDICATOR - CRUD ──────────────────────────────────────────────────────────
Write-Host "`n=== Indicator CRUD ==="
$indCode = "IND" + $ts

$indCreate = ApiPost "$BASE/indicators" @{
  dataset_id=[int]$dsId; code=$indCode; name="Stage05 Indicator"
  data_type="numeric"; required=$true
} $adminSess
Check "Indicator created"             { $indCreate.success -eq $true }
Check "Indicator status ACTIVE"       { $indCreate.data.status -eq 'ACTIVE' }
Check "Indicator data_type numeric"   { $indCreate.data.data_type -eq 'numeric' }
$indId = $indCreate.data.id

$indUpdate = ApiPatch "$BASE/indicators/$indId" @{name="Stage05 Indicator Updated"} $adminSess
Check "Indicator updated"             { $indUpdate.data.name -eq "Stage05 Indicator Updated" }

$indList = ApiGet "$BASE/indicators?dataset_id=$dsId" $adminSess
Check "Indicator in dataset list"     { @($indList.data | Where-Object { [int]$_.id -eq [int]$indId }).Count -eq 1 }

# ── INDICATOR - Validation ────────────────────────────────────────────────────
Write-Host "`n=== Indicator Validation ==="
Check "Duplicate indicator code in same dataset gives 409" {
  try { ApiPost "$BASE/indicators" @{dataset_id=[int]$dsId;code=$indCode;name="Dup";data_type="numeric"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}
Check "Invalid data_type gives 422" {
  try { ApiPost "$BASE/indicators" @{dataset_id=[int]$dsId;code="BAD$ts";name="Bad";data_type="invalid"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "Nonexistent dataset gives 422 or 404" {
  try { ApiPost "$BASE/indicators" @{dataset_id=99999;code="ND$ts";name="ND";data_type="numeric"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in @(422,404) }
}
Check "min_value greater than max_value gives 422" {
  try { ApiPost "$BASE/indicators" @{dataset_id=[int]$dsId;code="MM$ts";name="MM";data_type="numeric";min_value=100;max_value=50} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}

$pctInd = ApiPost "$BASE/indicators" @{dataset_id=[int]$dsId;code="PCT$ts";name="Pct";data_type="percentage"} $adminSess
Check "Percentage indicator created"       { $pctInd.success -eq $true }
Check "Percentage default min_value is 0"  { [double]$pctInd.data.min_value -eq 0 }
Check "Percentage default max_value is 100" { [double]$pctInd.data.max_value -eq 100 }

# ── INDICATOR - Status ────────────────────────────────────────────────────────
Write-Host "`n=== Indicator Status ==="
$indDeact = ApiPatch "$BASE/indicators/$indId/status" @{status="INACTIVE"} $adminSess
Check "Indicator deactivated" { $indDeact.data.status -eq 'INACTIVE' }
$indAct   = ApiPatch "$BASE/indicators/$indId/status" @{status="ACTIVE"} $adminSess
Check "Indicator reactivated" { $indAct.data.status -eq 'ACTIVE' }

# ── REPORTING PERIOD - CRUD ───────────────────────────────────────────────────
Write-Host "`n=== Reporting Period CRUD ==="
$prLabel = "Stage05 Period $ts"
$prCreate = ApiPost "$BASE/reporting-periods" @{
  label=$prLabel; period_type="MONTHLY"
  start_date="2028-01-01"; end_date="2028-01-31"
} $adminSess
Check "Period created"          { $prCreate.success -eq $true }
Check "Period status is OPEN"   { $prCreate.data.status -eq 'OPEN' }
Check "Period type is MONTHLY"  { $prCreate.data.period_type -eq 'MONTHLY' }
$prId = $prCreate.data.id

$prUpdate = ApiPatch "$BASE/reporting-periods/$prId" @{label="$prLabel Updated"} $adminSess
Check "Period label updated"    { $prUpdate.data.label -eq "$prLabel Updated" }

# ── REPORTING PERIOD - Validation ─────────────────────────────────────────────
Write-Host "`n=== Period Validation ==="
Check "Missing label gives 422" {
  try { ApiPost "$BASE/reporting-periods" @{period_type="MONTHLY";start_date="2028-02-01";end_date="2028-02-28"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "end_date before start_date gives 422" {
  try { ApiPost "$BASE/reporting-periods" @{label="Bad Dates";period_type="MONTHLY";start_date="2028-03-31";end_date="2028-03-01"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "Invalid period_type gives 422" {
  try { ApiPost "$BASE/reporting-periods" @{label="Bad Type";period_type="WEEKLY";start_date="2028-04-01";end_date="2028-04-30"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}

# ── REPORTING PERIOD - Status ─────────────────────────────────────────────────
Write-Host "`n=== Period Status ==="
$prClose = ApiPatch "$BASE/reporting-periods/$prId/status" @{status="CLOSED"} $adminSess
Check "Period closed"                          { $prClose.data.status -eq 'CLOSED' }
Check "Cannot reopen closed period gives 409" {
  try { ApiPatch "$BASE/reporting-periods/$prId/status" @{status="OPEN"} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

# ── DATA_ENTRY blocked from configuration ─────────────────────────────────────
Write-Host "`n=== DATA_ENTRY Cannot Configure ==="
Check "DATA_ENTRY cannot create period (403)" {
  try { ApiPost "$BASE/reporting-periods" @{label="Unauth";period_type="MONTHLY";start_date="2029-01-01";end_date="2029-01-31"} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "DATA_ENTRY cannot update indicator (403)" {
  try { ApiPatch "$BASE/indicators/$indId" @{name="Unauth"} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

Write-Host ""
Write-Host "======================================"
Write-Host "STAGE 05 RESULTS: $($script:pass) passed  /  $($script:fail) failed"
if ($script:fail -gt 0) { exit 1 } else { exit 0 }
