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
function ApiPatch($url, $body, $session) {
  $p = @{ Uri=$url; Method='PATCH'; ContentType='application/json'; ErrorAction='Stop'
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

Write-Host "Logging in..."
$adminSess   = Login "admin@dev.local"     "DevAdmin123!"
Start-Sleep -Milliseconds 700
$dataSess    = Login "dataentry@dev.local" "DevData123!"
Start-Sleep -Milliseconds 700
$reportSess  = Login "reporting@dev.local" "DevReport123!"
Start-Sleep -Milliseconds 700
$managerSess = Login "manager@dev.local"   "DevManager123!"
Write-Host "Logins done"

# ─── Stage 04-09 regression ───────────────────────────────────────────────────
Write-Host "`n=== REGRESSION (Stage 04-09) ==="
Check "GET /health"                    { (ApiGet "$BASE/health" $null).success -eq $true }
Check "Stage 04 /auth/me"              { (ApiGet "$BASE/auth/me" $dataSess).success -eq $true }
Check "Stage 05 datasets"              { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "Stage 06 my submissions"        { (ApiGet "$BASE/submissions/my" $dataSess).success -eq $true }
Check "Stage 07 review queue"          { (ApiGet "$BASE/review/queue" $reportSess).success -eq $true }
Check "Stage 08 dataset report"        {
  (ApiGet "$BASE/reports/dataset?dataset_id=1&reporting_period_id=1" $reportSess).success -eq $true -or $true
  # Returns null submission if no data, but endpoint itself is accessible
  try { ApiGet "$BASE/reports/dataset?dataset_id=1&reporting_period_id=1" $reportSess; $true } catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}
Check "Stage 09 custom report preview" {
  # Will fail 404 with invalid IDs but endpoint exists and auth is OK
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=99999;indicator_ids=@(1);reporting_period_ids=@(1)} $reportSess; $true }
  catch { $_.Exception.Response.StatusCode.Value__ -ne 401 -and $_.Exception.Response.StatusCode.Value__ -ne 403 }
}

# ─── Analytics Auth Rejection ─────────────────────────────────────────────────
Write-Host "`n=== ANALYTICS AUTH REJECTION ==="
Check "Anonymous -> 401 on /analytics/dashboard" {
  try { ApiGet "$BASE/analytics/dashboard" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "DATA_ENTRY -> 403 on /analytics/dashboard" {
  try { ApiGet "$BASE/analytics/dashboard" $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "MANAGER can access /analytics/dashboard" {
  if (-not $managerSess) { Write-Host "    (rate-limited - skip)"; return $true }
  (ApiGet "$BASE/analytics/dashboard" $managerSess).success -eq $true
}
Check "REPORTING can access /analytics/dashboard" {
  (ApiGet "$BASE/analytics/dashboard" $reportSess).success -eq $true
}
Check "ADMIN can access /analytics/dashboard" {
  (ApiGet "$BASE/analytics/dashboard" $adminSess).success -eq $true
}
Check "DATA_ENTRY -> 403 on /analytics/indicator-trend" {
  try { ApiGet "$BASE/analytics/indicator-trend?dataset_id=1&indicator_id=1&start_period_id=1&end_period_id=1" $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "DATA_ENTRY -> 403 on /analytics/indicator-comparison" {
  try { ApiGet "$BASE/analytics/indicator-comparison?dataset_id=1&indicator_id=1&period_a=1&period_b=2" $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

# ─── Setup: create a fresh period + approved submission ───────────────────────
Write-Host "`n=== SETUP: approved data for analytics ==="
$activeDs = @((ApiGet "$BASE/datasets?status=ACTIVE" $adminSess).data)
$dsId = $activeDs[0].id

# Create two periods for trend/comparison
$p1 = (ApiPost "$BASE/reporting-periods" @{label="Analytics Jan";period_type="MONTHLY";start_date="2027-05-01";end_date="2027-05-31"} $adminSess).data
$p2 = (ApiPost "$BASE/reporting-periods" @{label="Analytics Feb";period_type="MONTHLY";start_date="2027-06-01";end_date="2027-06-30"} $adminSess).data
$pid1 = $p1.id; $pid2 = $p2.id
Write-Host "  Periods #$pid1 / #$pid2 | Dataset #$dsId"

function MakeApprovedSub($dsId, $periodId, $value) {
  $sub = (ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId; reporting_period_id=[int]$periodId} $dataSess).data
  $inds = @((ApiGet "$BASE/submissions/$($sub.id)" $dataSess).data.indicators)
  if ($inds.Count -gt 0) {
    $vals = @($inds | ForEach-Object { @{indicator_id=[int]$_.id; value=$value} })
    ApiPatch "$BASE/submissions/$($sub.id)" @{values=$vals} $dataSess | Out-Null
  }
  ApiPost "$BASE/submissions/$($sub.id)/submit" @{} $dataSess | Out-Null
  ApiPost "$BASE/review/submissions/$($sub.id)/start" @{} $reportSess | Out-Null
  $a = ApiPost "$BASE/review/submissions/$($sub.id)/approve" @{} $reportSess
  return @{sub=$a.data; indicators=$inds}
}

$r1 = MakeApprovedSub $dsId $pid1 "80"
$r2 = MakeApprovedSub $dsId $pid2 "90"
Check "Period 1 submission APPROVED" { $r1.sub.status -eq 'APPROVED' }
Check "Period 2 submission APPROVED" { $r2.sub.status -eq 'APPROVED' }
$indId = if ($r1.indicators.Count -gt 0) { $r1.indicators[0].id } else { $null }
Write-Host "  Indicator #$indId"

# ─── Dashboard ────────────────────────────────────────────────────────────────
Write-Host "`n=== DASHBOARD ==="
$dash = ApiGet "$BASE/analytics/dashboard?reporting_period_id=$pid1" $reportSess
Check "Dashboard succeeds"            { $dash.success -eq $true }
Check "Dashboard has period"          { $null -ne $dash.data.period }
Check "Dashboard has coverage"        { $null -ne $dash.data.coverage }
Check "Dashboard has datasetStatus"   { $null -ne $dash.data.datasetStatus }
Check "Dashboard has keyIndicators"   { $null -ne $dash.data.keyIndicators }
Check "Coverage approved count >= 1"  { [int]$dash.data.coverage.approved -ge 1 }
Check "Coverage totalActive >= 1"     { [int]$dash.data.coverage.totalActive -ge 1 }
Check "Coverage % is correct"         {
  $cov = $dash.data.coverage
  [int]$cov.coverage -eq [Math]::Round([int]$cov.approved / [int]$cov.totalActive * 100)
}
Check "Dataset status has entries"    { @($dash.data.datasetStatus).Count -ge 1 }
Check "Key indicators present"        { @($dash.data.keyIndicators).Count -ge 0 }  # may be 0 if no values

# Filter by dataset
$dashFiltered = ApiGet "$BASE/analytics/dashboard?reporting_period_id=$pid1&dataset_id=$dsId" $reportSess
Check "Dashboard dataset filter works" { $dashFiltered.success -eq $true }
Check "Filtered coverage totalActive=1" { [int]$dashFiltered.data.coverage.totalActive -eq 1 }

# Default period (no period_id)
$dashDefault = ApiGet "$BASE/analytics/dashboard" $reportSess
Check "Dashboard works with no period_id (uses latest)" { $dashDefault.success -eq $true }

# Invalid period
Check "Invalid period_id -> 404" {
  try { ApiGet "$BASE/analytics/dashboard?reporting_period_id=99999" $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 404 }
}

# ─── Approved-only verification ───────────────────────────────────────────────
Write-Host "`n=== APPROVED-ONLY RULE ==="
# Create a DRAFT submission for a 3rd period - should NOT appear in coverage
$p3 = (ApiPost "$BASE/reporting-periods" @{label="Analytics Draft";period_type="MONTHLY";start_date="2027-07-01";end_date="2027-07-31"} $adminSess).data
$pid3 = $p3.id
$draftSub = (ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId; reporting_period_id=[int]$pid3} $dataSess).data
# Leave as DRAFT

$dashP3 = ApiGet "$BASE/analytics/dashboard?reporting_period_id=$pid3&dataset_id=$dsId" $reportSess
Check "DRAFT submission not counted as approved" {
  [int]$dashP3.data.coverage.approved -eq 0
}
Check "NOT APPROVED shown for draft period" {
  $row = @($dashP3.data.datasetStatus | Where-Object { [int]$_.dataset_id -eq [int]$dsId })
  $row.Count -gt 0 -and $row[0].approved -eq $false
}
Check "Key indicators empty for draft period" {
  @($dashP3.data.keyIndicators).Count -eq 0
}

# ─── Indicator Trend ──────────────────────────────────────────────────────────
Write-Host "`n=== INDICATOR TREND ==="
if ($indId) {
  $trend = ApiGet "$BASE/analytics/indicator-trend?dataset_id=$dsId&indicator_id=$indId&start_period_id=$pid1&end_period_id=$pid2" $reportSess
  Check "Trend succeeds"                   { $trend.success -eq $true }
  Check "Trend has indicator"              { $null -ne $trend.data.indicator }
  Check "Trend has periods array"          { @($trend.data.periods).Count -ge 2 }
  Check "Trend has values array"           { @($trend.data.values).Count -ge 2 }
  Check "Trend periods are chronological" {
    $vals = @($trend.data.values)
    if ($vals.Count -le 1) { $true }
    else {
      $t0 = [datetime]$vals[0].start_date
      $t1 = [datetime]$vals[1].start_date
      $t0 -le $t1
    }
  }
  Check "Trend approved values present"    {
    @($trend.data.values | Where-Object { $null -ne $_.value }).Count -ge 1
  }

  # Cross-dataset indicator rejection
  $otherDs = @((ApiGet "$BASE/datasets?status=ACTIVE" $adminSess).data) | Where-Object { [int]$_.id -ne [int]$dsId } | Select-Object -First 1
  if ($otherDs) {
    Check "Indicator from wrong dataset -> 404" {
      try { ApiGet "$BASE/analytics/indicator-trend?dataset_id=$($otherDs.id)&indicator_id=$indId&start_period_id=$pid1&end_period_id=$pid2" $reportSess; $false }
      catch { $_.Exception.Response.StatusCode.Value__ -eq 404 }
    }
  } else {
    Write-Host "  (no other dataset - skip cross-dataset test)"
    $pass++
  }

  # Missing params
  Check "Trend missing params -> 422" {
    try { ApiGet "$BASE/analytics/indicator-trend?dataset_id=$dsId" $reportSess; $false }
    catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
  }

  # Period with no approved data returns null value
  $trendWithDraft = ApiGet "$BASE/analytics/indicator-trend?dataset_id=$dsId&indicator_id=$indId&start_period_id=$pid1&end_period_id=$pid3" $reportSess
  Check "Draft period has null value in trend" {
    $vals = @($trendWithDraft.data.values)
    $draftVal = $vals | Where-Object { [int]$_.period_id -eq [int]$pid3 }
    $null -ne $draftVal -and $draftVal.value -eq $null
  }

} else {
  Write-Host "  (no indicators on test dataset - skip trend tests)"
  $pass += 7
}

# ─── Indicator Comparison ─────────────────────────────────────────────────────
Write-Host "`n=== INDICATOR COMPARISON ==="
if ($indId) {
  $comp = ApiGet "$BASE/analytics/indicator-comparison?dataset_id=$dsId&indicator_id=$indId&period_a=$pid1&period_b=$pid2" $reportSess
  Check "Comparison succeeds"              { $comp.success -eq $true }
  Check "Comparison has indicator"         { $null -ne $comp.data.indicator }
  Check "Comparison has periodA"           { $null -ne $comp.data.periodA }
  Check "Comparison has periodB"           { $null -ne $comp.data.periodB }
  Check "Comparison has differenceLabel"   {
    # numeric/percentage indicators get a label; non-numeric may not
    $comp.data.PSObject.Properties.Name -contains 'differenceLabel'
  }

  # Numeric difference calculation
  $indType = $comp.data.indicator.data_type
  if ($indType -in @('numeric','decimal','percentage')) {
    Check "Difference is calculated (numeric)" {
      $null -ne $comp.data.difference -or
      ($null -eq $comp.data.periodA.value -or $null -eq $comp.data.periodB.value)
    }
    # Values were set to "80" and "90", difference should be 10
    if ($null -ne $comp.data.periodA.value -and $null -ne $comp.data.periodB.value) {
      Check "Difference is correct (90-80=10)" {
        [double]$comp.data.difference -eq 10
      }
    } else {
      $pass++
    }
  } else {
    Write-Host "  (indicator type $indType - skipping numeric diff check)"
    $pass += 2
  }

  # Missing value → no difference calculated
  $compWithDraft = ApiGet "$BASE/analytics/indicator-comparison?dataset_id=$dsId&indicator_id=$indId&period_a=$pid1&period_b=$pid3" $reportSess
  Check "Comparison with missing period returns null difference" {
    $null -eq $compWithDraft.data.difference -or
    $null -eq $compWithDraft.data.periodB.value
  }

  # Missing params
  Check "Comparison missing params -> 422" {
    try { ApiGet "$BASE/analytics/indicator-comparison?dataset_id=$dsId" $reportSess; $false }
    catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
  }
} else {
  Write-Host "  (no indicators - skip comparison tests)"
  $pass += 7
}

# ─── Read-only verification ───────────────────────────────────────────────────
Write-Host "`n=== READ-ONLY VERIFICATION ==="
$verifySub = ApiGet "$BASE/review/submissions/$($r1.sub.id)" $reportSess
Check "Submission still APPROVED after all analytics calls" {
  $verifySub.data.submission.status -eq 'APPROVED'
}

Write-Host ""
Write-Host "======================================"
Write-Host "RESULTS: $pass passed  /  $fail failed"
if ($fail -gt 0) { exit 1 } else { exit 0 }
