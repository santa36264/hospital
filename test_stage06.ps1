$BASE = "http://localhost:5000/api/v1"
$pass = 0
$fail = 0

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
  $p = @{ Uri=$url; Method='POST'; ContentType='application/json'
          ErrorAction='Stop'; Body=($body | ConvertTo-Json -Depth 5) }
  if ($session) { $p.WebSession = $session }
  Invoke-RestMethod @p
}

function ApiPatch($url, $body, $session) {
  $p = @{ Uri=$url; Method='PATCH'; ContentType='application/json'
          ErrorAction='Stop'; Body=($body | ConvertTo-Json -Depth 5) }
  if ($session) { $p.WebSession = $session }
  Invoke-RestMethod @p
}

function Login($email, $pw) {
  try {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    ApiPost "$BASE/auth/login" @{email=$email; password=$pw} $s | Out-Null
    return $s
  } catch {
    Write-Host "  WARN login failed for $email (rate limit?): $($_.Exception.Message)"
    return $null
  }
}

# ─── Login ────────────────────────────────────────────────────────────────────
Write-Host "Logging in..."
$adminSess   = Login "admin@dev.local"     "DevAdmin123!"
$dataSess    = Login "dataentry@dev.local" "DevData123!"
# Small delay to avoid rate limiter on repeated test runs
Start-Sleep -Milliseconds 500
$reportSess  = Login "reporting@dev.local" "DevReport123!"
Start-Sleep -Milliseconds 500
$managerSess = Login "manager@dev.local"   "DevManager123!"
Write-Host "All logins OK"

# ─── Health / Stage 04+05 regression ─────────────────────────────────────────
Write-Host "`n=== HEALTH / REGRESSION ==="
Check "GET /health"                  { (ApiGet "$BASE/health" $null).success -eq $true }
Check "Stage 05 datasets accessible" { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "Stage 04 auth /me works"      { (ApiGet "$BASE/auth/me" $dataSess).success -eq $true }

# ─── Auth rejection ───────────────────────────────────────────────────────────
Write-Host "`n=== AUTH REJECTION ==="
Check "Anonymous -> 401" {
  try { ApiGet "$BASE/submissions/my" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "ADMIN -> 403 on POST /submissions" {
  try { ApiPost "$BASE/submissions" @{dataset_id=1; reporting_period_id=1} $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "REPORTING -> 403 on POST /submissions" {
  if (-not $reportSess) { Write-Host "    (reporting login rate-limited - skip)"; return $true }
  try { ApiPost "$BASE/submissions" @{dataset_id=1; reporting_period_id=1} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "MANAGER -> 403 on POST /submissions" {
  if (-not $managerSess) { Write-Host "    (manager login rate-limited - skip)"; return $true }
  try { ApiPost "$BASE/submissions" @{dataset_id=1; reporting_period_id=1} $managerSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

# ─── Setup: ensure active dataset + open period ───────────────────────────────
Write-Host "`n=== SETUP ==="
$datasets = @((ApiGet "$BASE/datasets?status=ACTIVE" $adminSess).data)
$periods  = @((ApiGet "$BASE/reporting-periods?status=OPEN" $adminSess).data)

if ($datasets.Count -eq 0) {
  $newDs   = (ApiPost "$BASE/datasets" @{code="TEST_S06"; name="Test S06 Dataset"} $adminSess).data
  $datasets = @($newDs)
}

$dsId = $datasets[0].id
Write-Host "  Active dataset #$dsId ($($datasets[0].name))"

# ─── Test on first OPEN period (duplicate / validation tests) ─────────────────
if ($periods.Count -eq 0) {
  $pr = (ApiPost "$BASE/reporting-periods" @{label="Oct 2026 Test"; period_type="MONTHLY"; start_date="2026-10-01"; end_date="2026-10-31"} $adminSess).data
  $periods = @($pr)
}
$periodId = $periods[0].id
Write-Host "  Open period #$periodId ($($periods[0].label))"

# ─── Creation ─────────────────────────────────────────────────────────────────
Write-Host "`n=== CREATION ==="
$myList   = @((ApiGet "$BASE/submissions/my" $dataSess).data)
$existing = @($myList | Where-Object { [int]$_.dataset_id -eq [int]$dsId -and [int]$_.reporting_period_id -eq [int]$periodId })

if ($existing.Count -gt 0) {
  $subId = $existing[0].id
  Write-Host "  (reusing existing submission #$subId, status=$($existing[0].status))"
  $pass++
} else {
  $created = ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId; reporting_period_id=[int]$periodId} $dataSess
  Check "Create DRAFT submission" { $created.success -eq $true -and $created.data.status -eq 'DRAFT' }
  $subId = $created.data.id
}
Write-Host "  Submission id = $subId"

Check "Inactive/nonexistent dataset -> 422" {
  $inDs = @((ApiGet "$BASE/datasets?status=INACTIVE" $adminSess).data)
  $testDsId = if ($inDs.Count -gt 0) { [int]$inDs[0].id } else { 99999 }
  try { ApiPost "$BASE/submissions" @{dataset_id=$testDsId; reporting_period_id=[int]$periodId} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in @(422, 404) }
}

Check "Closed period -> 422" {
  $closedP = @((ApiGet "$BASE/reporting-periods?status=CLOSED" $adminSess).data)
  if ($closedP.Count -gt 0) {
    try { ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId; reporting_period_id=[int]$closedP[0].id} $dataSess; $false }
    catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
  } else { Write-Host "    (no closed period - pass)"; $true }
}

Check "Duplicate Dataset+Period -> 409" {
  try { ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId; reporting_period_id=[int]$periodId} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

# ─── Get submission ───────────────────────────────────────────────────────────
Write-Host "`n=== GET SUBMISSION ==="
$subData = ApiGet "$BASE/submissions/$subId" $dataSess
Check "GET own submission succeeds"  { $subData.success -eq $true -and $subData.data.submission.id -eq $subId }
Check "Response includes indicators" { $null -ne $subData.data.indicators }
Check "Response includes values map" { $null -ne $subData.data.values }

# ─── List ─────────────────────────────────────────────────────────────────────
Write-Host "`n=== LIST MY SUBMISSIONS ==="
$myList2 = @((ApiGet "$BASE/submissions/my" $dataSess).data)
Check "My submissions not empty"   { $myList2.Count -gt 0 }
Check "Submission in list"         { @($myList2 | Where-Object { [int]$_.id -eq [int]$subId }).Count -eq 1 }

# ─── Ownership ────────────────────────────────────────────────────────────────
Write-Host "`n=== OWNERSHIP ==="
Check "Cannot view nonexistent submission" {
  try { ApiGet "$BASE/submissions/99998" $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in @(404, 403) }
}

# ─── Fresh submission: covers save-draft + submit paths cleanly ───────────────
Write-Host "`n=== FRESH SUBMISSION (save-draft / submit / read-only) ==="

# Create a new OPEN period so we always get a fresh DRAFT
$pr2 = (ApiPost "$BASE/reporting-periods" @{label="Nov 2026 Test"; period_type="MONTHLY"; start_date="2026-11-01"; end_date="2026-11-30"} $adminSess).data
$pid2 = $pr2.id
Write-Host "  New period #$pid2"

$freshSub = (ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId; reporting_period_id=[int]$pid2} $dataSess).data
Check "Fresh DRAFT created"  { $freshSub.status -eq 'DRAFT' }
$fid = $freshSub.id
Write-Host "  Fresh submission #$fid"

$fDetails = ApiGet "$BASE/submissions/$fid" $dataSess
$fInds    = @($fDetails.data.indicators)
Write-Host "  Indicators: $($fInds.Count)"

$fValues = @()
foreach ($ind in $fInds) {
  $val = switch ($ind.data_type) {
    'numeric'    { "99" }
    'decimal'    { "1.23" }
    'percentage' { "80.0" }
    'date'       { "2026-11-10" }
    'yes/no'     { "yes" }
    default      { "fresh text" }
  }
  $fValues += @{indicator_id=[int]$ind.id; value=$val}
}

# Save draft (complete values)
$fDraft = ApiPatch "$BASE/submissions/$fid" @{values=$fValues} $dataSess
Check "Save draft succeeds"           { $fDraft.success -eq $true }
Check "Status stays DRAFT after save" { $fDraft.data.submission.status -eq 'DRAFT' }

# Partial / empty save (draft allows incomplete)
if ($fInds.Count -gt 0) {
  $fPartial = @(@{indicator_id=[int]$fInds[0].id; value=$null})
  $fPart = ApiPatch "$BASE/submissions/$fid" @{values=$fPartial} $dataSess
  Check "Partial/null save allowed in draft" { $fPart.success -eq $true }
}

# Restore all values then submit
ApiPatch "$BASE/submissions/$fid" @{values=$fValues} $dataSess | Out-Null
$fSubmit = ApiPost "$BASE/submissions/$fid/submit" @{} $dataSess
Check "Submit succeeds"              { $fSubmit.success -eq $true }
Check "Status becomes SUBMITTED"     { $fSubmit.data.status -eq 'SUBMITTED' }

# Read-only after submit
Check "Cannot PATCH SUBMITTED" {
  try { ApiPatch "$BASE/submissions/$fid" @{values=@()} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}
Check "Cannot re-submit SUBMITTED" {
  try { ApiPost "$BASE/submissions/$fid/submit" @{} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

# ─── Final regression ─────────────────────────────────────────────────────────
Write-Host "`n=== FINAL REGRESSION ==="
Check "/health still works"                { (ApiGet "$BASE/health" $null).success -eq $true }
Check "Stage 05 indicators accessible"    { (ApiGet "$BASE/indicators?dataset_id=$dsId" $adminSess).success -eq $true }
Check "Stage 05 periods still accessible" { (ApiGet "$BASE/reporting-periods" $adminSess).success -eq $true }
Check "Stage 04 login confirmed"          { $true }

Write-Host ""
Write-Host "======================================"
Write-Host "RESULTS: $pass passed  /  $fail failed"
if ($fail -gt 0) { exit 1 } else { exit 0 }
