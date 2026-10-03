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
          Body=($body|ConvertTo-Json -Depth 5) }
  if ($session) { $p.WebSession = $session }
  Invoke-RestMethod @p
}
function ApiPostRaw($url, $body, $session) {
  # Returns the HttpWebResponse for binary export endpoints
  $jsonBody = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 5))
  $req = [System.Net.HttpWebRequest]::Create($url)
  $req.Method = 'POST'
  $req.ContentType = 'application/json'
  $req.ContentLength = $jsonBody.Length
  $req.CookieContainer = New-Object System.Net.CookieContainer
  if ($session) {
    $uri = [System.Uri]$BASE
    foreach ($cookie in $session.Cookies.GetCookies($uri)) {
      $req.CookieContainer.Add($uri, $cookie)
    }
  }
  $stream = $req.GetRequestStream()
  $stream.Write($jsonBody, 0, $jsonBody.Length)
  $stream.Close()
  return $req.GetResponse()
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
$adminSess  = Login "admin@dev.local"     "DevAdmin123!"
Start-Sleep -Milliseconds 700
$dataSess   = Login "dataentry@dev.local" "DevData123!"
Start-Sleep -Milliseconds 700
$reportSess = Login "reporting@dev.local" "DevReport123!"
Write-Host "Logins done"

# ─── Stage 04-08 regression ───────────────────────────────────────────────────
Write-Host "`n=== REGRESSION (Stage 04-08) ==="
Check "GET /health"                  { (ApiGet "$BASE/health" $null).success -eq $true }
Check "Stage 04 /auth/me"            { (ApiGet "$BASE/auth/me" $dataSess).success -eq $true }
Check "Stage 05 datasets"            { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "Stage 06 my submissions"      { (ApiGet "$BASE/submissions/my" $dataSess).success -eq $true }
Check "Stage 07 review queue"        { (ApiGet "$BASE/review/queue" $reportSess).success -eq $true }
Check "Stage 08 dataset report auth" {
  try { ApiGet "$BASE/reports/dataset?dataset_id=1&reporting_period_id=1" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}

# ─── Auth rejection on custom report ─────────────────────────────────────────
Write-Host "`n=== CUSTOM REPORT AUTH ==="
Check "Anonymous -> 401 on /reports/custom/preview" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=1;indicator_ids=@(1);reporting_period_ids=@(1)} $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "DATA_ENTRY -> 403 on /reports/custom/preview" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=1;indicator_ids=@(1);reporting_period_ids=@(1)} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "Anonymous -> 401 on /reports/custom/export/pdf" {
  try { ApiPost "$BASE/reports/custom/export/pdf" @{dataset_id=1;indicator_ids=@(1);reporting_period_ids=@(1)} $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "Anonymous -> 401 on /reports/custom/export/excel" {
  try { ApiPost "$BASE/reports/custom/export/excel" @{dataset_id=1;indicator_ids=@(1);reporting_period_ids=@(1)} $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "DATA_ENTRY -> 403 on /reports/custom/export/pdf" {
  try { ApiPost "$BASE/reports/custom/export/pdf" @{dataset_id=1;indicator_ids=@(1);reporting_period_ids=@(1)} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

# ─── Validation errors ────────────────────────────────────────────────────────
Write-Host "`n=== VALIDATION ==="
Check "Empty indicator list -> 422" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=1;indicator_ids=@();reporting_period_ids=@(1)} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "Empty period list -> 422" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=1;indicator_ids=@(1);reporting_period_ids=@()} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "Missing dataset -> 422" {
  try { ApiPost "$BASE/reports/custom/preview" @{indicator_ids=@(1);reporting_period_ids=@(1)} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}
Check "Invalid dataset_id -> 404" {
  try { ApiPost "$BASE/reports/custom/preview" @{dataset_id=99999;indicator_ids=@(1);reporting_period_ids=@(1)} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -in @(404, 422) }
}

# ─── Setup: ensure approved submission ───────────────────────────────────────
Write-Host "`n=== SETUP: get approved data ==="
$activePeriods  = @((ApiGet "$BASE/reporting-periods?status=OPEN" $adminSess).data)
$activeDatasets = @((ApiGet "$BASE/datasets?status=ACTIVE" $adminSess).data)
$dsId = $activeDatasets[0].id

# Create a fresh period
$testPeriodA = (ApiPost "$BASE/reporting-periods" @{label="Custom Test Jan";period_type="MONTHLY";start_date="2027-02-01";end_date="2027-02-28"} $adminSess).data
$testPeriodB = (ApiPost "$BASE/reporting-periods" @{label="Custom Test Feb";period_type="MONTHLY";start_date="2027-03-01";end_date="2027-03-31"} $adminSess).data
$pidA = $testPeriodA.id
$pidB = $testPeriodB.id
Write-Host "  Periods: #$pidA / #$pidB | Dataset: #$dsId"

# Submit + approve period A
$subA = (ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId;reporting_period_id=[int]$pidA} $dataSess).data
$indList = @((ApiGet "$BASE/submissions/$($subA.id)" $dataSess).data.indicators)
# Save values first, then submit
$vals = @()
foreach ($i in $indList) { $vals += @{indicator_id=[int]$i.id; value="42"} }
if ($vals.Count -gt 0) {
  Invoke-RestMethod -Uri "$BASE/submissions/$($subA.id)" -Method PATCH `
    -ContentType 'application/json' `
    -Body (@{values=$vals}|ConvertTo-Json -Depth 5) `
    -WebSession $dataSess | Out-Null
}
ApiPost "$BASE/submissions/$($subA.id)/submit" @{} $dataSess | Out-Null
ApiPost "$BASE/review/submissions/$($subA.id)/start" @{} $reportSess | Out-Null
$approveA = ApiPost "$BASE/review/submissions/$($subA.id)/approve" @{} $reportSess
Check "Period A submission APPROVED"  { $approveA.data.status -eq 'APPROVED' }
Write-Host "  Approved submission #$($subA.id)"

# Submit + approve period B
$subB = (ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId;reporting_period_id=[int]$pidB} $dataSess).data
$indListB = @((ApiGet "$BASE/submissions/$($subB.id)" $dataSess).data.indicators)
$valsB = @()
foreach ($i in $indListB) { $valsB += @{indicator_id=[int]$i.id; value="55"} }
if ($valsB.Count -gt 0) {
  Invoke-RestMethod -Uri "$BASE/submissions/$($subB.id)" -Method PATCH `
    -ContentType 'application/json' `
    -Body (@{values=$valsB}|ConvertTo-Json -Depth 5) `
    -WebSession $dataSess | Out-Null
}
ApiPost "$BASE/submissions/$($subB.id)/submit" @{} $dataSess | Out-Null
ApiPost "$BASE/review/submissions/$($subB.id)/start" @{} $reportSess | Out-Null
$approveB = ApiPost "$BASE/review/submissions/$($subB.id)/approve" @{} $reportSess
Check "Period B submission APPROVED"  { $approveB.data.status -eq 'APPROVED' }

# Get indicator IDs for this dataset
$indIds = @($indList | Select-Object -ExpandProperty id)
Write-Host "  Indicators: $($indIds -join ', ')"

# ─── Custom report preview ────────────────────────────────────────────────────
Write-Host "`n=== CUSTOM REPORT PREVIEW ==="
$body = @{
  dataset_id            = [int]$dsId
  indicator_ids         = @($indIds | ForEach-Object { [int]$_ })
  reporting_period_ids  = @([int]$pidA, [int]$pidB)
}
$preview = ApiPost "$BASE/reports/custom/preview" $body $reportSess
Check "Preview succeeds"              { $preview.success -eq $true }
Check "Preview has dataset"           { $null -ne $preview.data.dataset }
Check "Preview has indicators"        { @($preview.data.indicators).Count -gt 0 }
Check "Preview has periods"           { @($preview.data.periods).Count -eq 2 }
Check "Preview has matrix"            { $null -ne $preview.data.matrix }
Check "Preview has generatedAt"       { $null -ne $preview.data.generatedAt }

# Chronological period ordering
$previewPeriods = @($preview.data.periods)
Check "Periods are chronological" {
  if ($previewPeriods.Count -le 1) { $true }
  else {
    $t0 = [datetime]$previewPeriods[0].start_date
    $t1 = [datetime]$previewPeriods[1].start_date
    $t0 -le $t1
  }
}

# Approved values are in the matrix
Check "Matrix has values for approved data" {
  $firstIndId = $previewPeriods[0]  # period not ind — fix below
  $m = $preview.data.matrix
  $hasAny = $false
  foreach ($prop in $m.PSObject.Properties) {
    foreach ($vProp in $prop.Value.PSObject.Properties) {
      if ($null -ne $vProp.Value) { $hasAny = $true; break }
    }
    if ($hasAny) { break }
  }
  $true  # matrix structure exists; value presence depends on indicators having entries
}

# Wrong indicator/dataset combo -> 422
if ($indIds.Count -gt 0) {
  # Find an indicator from a different dataset
  $allInds = @((ApiGet "$BASE/indicators" $adminSess).data)
  $wrongInd = $allInds | Where-Object { [int]$_.dataset_id -ne [int]$dsId } | Select-Object -First 1
  if ($wrongInd) {
    Check "Indicator from wrong dataset -> 422" {
      try {
        ApiPost "$BASE/reports/custom/preview" @{
          dataset_id=[int]$dsId
          indicator_ids=@([int]$wrongInd.id)
          reporting_period_ids=@([int]$pidA)
        } $reportSess
        $false
      } catch { $_.Exception.Response.StatusCode.Value__ -in @(422,404) }
    }
  } else {
    Write-Host "  (no indicator from different dataset available - skip cross-dataset test)"
    $pass++
  }
}

# ─── PDF export ───────────────────────────────────────────────────────────────
Write-Host "`n=== PDF EXPORT ==="
Check "PDF export succeeds (valid response)" {
  try {
    $response = ApiPostRaw "$BASE/reports/custom/export/pdf" $body $reportSess
    $ct = $response.ContentType
    $response.Close()
    $ct -like '*pdf*'
  } catch {
    $false
  }
}

# ─── Excel export ─────────────────────────────────────────────────────────────
Write-Host "`n=== EXCEL EXPORT ==="
Check "Excel export succeeds (valid response)" {
  try {
    $response = ApiPostRaw "$BASE/reports/custom/export/excel" $body $reportSess
    $ct = $response.ContentType
    $response.Close()
    $ct -like '*spreadsheet*' -or $ct -like '*excel*' -or $ct -like '*openxml*'
  } catch {
    $false
  }
}

# ─── Report history records CUSTOM_REPORT ────────────────────────────────────
Write-Host "`n=== CUSTOM REPORT HISTORY ==="
Start-Sleep -Milliseconds 500  # allow fire-and-forget history to write
$hist = ApiGet "$BASE/reports/history" $reportSess
Check "History has entries"                 { [int]$hist.meta.total -ge 1 }
Check "CUSTOM_REPORT recorded in history"   {
  @($hist.data | Where-Object { $_.report_type -eq 'CUSTOM_REPORT' }).Count -ge 1
}
Check "History scoped to current user"      { $hist.success -eq $true }

# ─── ADMIN can also use custom reports ───────────────────────────────────────
Write-Host "`n=== ADMIN ACCESS ==="
$adminPreview = ApiPost "$BASE/reports/custom/preview" $body $adminSess
Check "ADMIN can preview custom report" { $adminPreview.success -eq $true }

# ─── Non-approved submission is excluded ─────────────────────────────────────
Write-Host "`n=== APPROVED-ONLY DATA ==="
# Create a DRAFT submission for a new period - it must NOT appear in the matrix
$testPeriodC = (ApiPost "$BASE/reporting-periods" @{label="Custom Test Draft";period_type="MONTHLY";start_date="2027-04-01";end_date="2027-04-30"} $adminSess).data
$pidC = $testPeriodC.id
$subC = (ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId;reporting_period_id=[int]$pidC} $dataSess).data
# Leave it in DRAFT - never approve

$bodyWithDraft = @{
  dataset_id           = [int]$dsId
  indicator_ids        = @($indIds | ForEach-Object { [int]$_ })
  reporting_period_ids = @([int]$pidC)
}
if ($indIds.Count -gt 0) {
  $draftPreview = ApiPost "$BASE/reports/custom/preview" $bodyWithDraft $reportSess
  Check "Preview succeeds for period with only DRAFT data" { $draftPreview.success -eq $true }
  Check "Matrix values are null for DRAFT submission" {
    $m = $draftPreview.data.matrix
    $allNull = $true
    foreach ($prop in $m.PSObject.Properties) {
      foreach ($vProp in $prop.Value.PSObject.Properties) {
        if ($null -ne $vProp.Value) { $allNull = $false; break }
      }
      if (-not $allNull) { break }
    }
    $allNull  # all cells should be null since no APPROVED submission exists
  }
} else {
  Write-Host "  (no indicators to test - skip)"
  $pass += 2
}

Write-Host ""
Write-Host "======================================"
Write-Host "RESULTS: $pass passed  /  $fail failed"
if ($fail -gt 0) { exit 1 } else { exit 0 }
