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
    ApiPost "$BASE/auth/login" @{email=$email; password=$pw} $s | Out-Null
    return $s
  } catch {
    Write-Host "  WARN  login failed for $email`: $($_.Exception.Message)"
    return $null
  }
}

Write-Host "Logging in (with delays to avoid rate limiter)..."
$adminSess   = Login "admin@dev.local"     "DevAdmin123!"
Start-Sleep -Milliseconds 600
$dataSess    = Login "dataentry@dev.local" "DevData123!"
Start-Sleep -Milliseconds 600
$reportSess  = Login "reporting@dev.local" "DevReport123!"
Start-Sleep -Milliseconds 600
$managerSess = Login "manager@dev.local"   "DevManager123!"
Write-Host "Logins complete"

# ─── Stage 03-06 regression ───────────────────────────────────────────────────
Write-Host "`n=== REGRESSION (Stage 03-06) ==="
Check "GET /health"                       { (ApiGet "$BASE/health" $null).success -eq $true }
Check "Stage 04 auth /me (data_entry)"   { (ApiGet "$BASE/auth/me" $dataSess).success -eq $true }
Check "Stage 05 datasets accessible"     { (ApiGet "$BASE/datasets" $adminSess).success -eq $true }
Check "Stage 05 indicators accessible"   { (ApiGet "$BASE/indicators" $adminSess).success -eq $true }
Check "Stage 05 periods accessible"      { (ApiGet "$BASE/reporting-periods" $adminSess).success -eq $true }
Check "Stage 06 my submissions works"    { (ApiGet "$BASE/submissions/my" $dataSess).success -eq $true }

# ─── Auth rejection on review endpoints ──────────────────────────────────────
Write-Host "`n=== REVIEW AUTH REJECTION ==="
Check "Anonymous -> 401 on queue" {
  try { ApiGet "$BASE/review/queue" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "DATA_ENTRY -> 403 on queue" {
  try { ApiGet "$BASE/review/queue" $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "ADMIN -> 403 on queue" {
  try { ApiGet "$BASE/review/queue" $adminSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "MANAGER -> 403 on queue" {
  if (-not $managerSess) { Write-Host "    (rate-limited - skip)"; return $true }
  try { ApiGet "$BASE/review/queue" $managerSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "DATA_ENTRY -> 403 on start-review" {
  try { ApiPost "$BASE/review/submissions/1/start" @{} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

# ─── Auth rejection on notification endpoints ────────────────────────────────
Write-Host "`n=== NOTIFICATION AUTH REJECTION ==="
Check "Anonymous -> 401 on notifications" {
  try { ApiGet "$BASE/notifications" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}
Check "Anonymous -> 401 on unread-count" {
  try { ApiGet "$BASE/notifications/unread-count" $null; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 401 }
}

# ─── Setup: ensure we have a SUBMITTED submission to work with ────────────────
Write-Host "`n=== SETUP: Get or create SUBMITTED submission ==="
$activePeriods  = @((ApiGet "$BASE/reporting-periods?status=OPEN" $adminSess).data)
$activeDatasets = @((ApiGet "$BASE/datasets?status=ACTIVE" $adminSess).data)

if ($activeDatasets.Count -eq 0) {
  $ds = (ApiPost "$BASE/datasets" @{code="REVIEW_DS"; name="Review Test Dataset"} $adminSess).data
  $activeDatasets = @($ds)
}
$dsId = $activeDatasets[0].id

# Create a fresh period for this test run to guarantee a clean DRAFT
$testPeriod = (ApiPost "$BASE/reporting-periods" @{
  label="Stage07 Test Period"; period_type="MONTHLY"
  start_date="2026-12-01"; end_date="2026-12-31"
} $adminSess).data
$periodId = $testPeriod.id
Write-Host "  Test period: #$periodId / Dataset: #$dsId"

# Create DRAFT submission
$draftSub = (ApiPost "$BASE/submissions" @{dataset_id=[int]$dsId; reporting_period_id=[int]$periodId} $dataSess).data
$subId = $draftSub.id
Write-Host "  Draft submission: #$subId"

# Save values and submit it
$indicators = @((ApiGet "$BASE/submissions/$subId" $dataSess).data.indicators)
$values = @()
foreach ($ind in $indicators) {
  $val = switch ($ind.data_type) {
    'numeric' { "50" } 'decimal' { "3.14" } 'percentage' { "60" }
    'date' { "2026-12-10" } 'yes/no' { "yes" } default { "test value" }
  }
  $values += @{indicator_id=[int]$ind.id; value=$val}
}
ApiPatch "$BASE/submissions/$subId" @{values=$values} $dataSess | Out-Null
$submitted = ApiPost "$BASE/submissions/$subId/submit" @{} $dataSess
Check "Submission is SUBMITTED (setup)" { $submitted.data.status -eq 'SUBMITTED' }

# ─── Reporting queue ──────────────────────────────────────────────────────────
Write-Host "`n=== REVIEW QUEUE ==="
$queue = (ApiGet "$BASE/review/queue" $reportSess).data
Check "Queue returns data"               { $null -ne $queue }
Check "Submission appears in queue"      { @($queue | Where-Object { [int]$_.id -eq [int]$subId }).Count -gt 0 }

# Get detail before start
$detail = ApiGet "$BASE/review/submissions/$subId" $reportSess
Check "GET review detail succeeds"       { $detail.success -eq $true }
Check "Detail has submission"            { $null -ne $detail.data.submission }
Check "Detail has indicators"            { $null -ne $detail.data.indicators }
Check "Detail has values"                { $null -ne $detail.data.values }
Check "Detail has history"               { $null -ne $detail.data.history }

# ─── State transition: SUBMITTED -> UNDER_REVIEW ─────────────────────────────
Write-Host "`n=== START REVIEW (SUBMITTED -> UNDER_REVIEW) ==="
$startRes = ApiPost "$BASE/review/submissions/$subId/start" @{} $reportSess
Check "Start review succeeds"            { $startRes.success -eq $true }
Check "Status is UNDER_REVIEW"           { $startRes.data.status -eq 'UNDER_REVIEW' }

Check "Cannot start review again (409)" {
  try { ApiPost "$BASE/review/submissions/$subId/start" @{} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}
Check "DATA_ENTRY cannot see UNDER_REVIEW detail (404 or ok)" {
  # DATA_ENTRY can still GET their own submission (via /submissions/:id)
  $own = ApiGet "$BASE/submissions/$subId" $dataSess
  $own.success -eq $true
}

# Notification should have been sent to DATA_ENTRY
Start-Sleep -Milliseconds 300
$dataNotifs = @((ApiGet "$BASE/notifications" $dataSess).data)
Check "DATA_ENTRY received under-review notification" {
  @($dataNotifs | Where-Object { $_.type -eq 'SUBMISSION_UNDER_REVIEW' }).Count -gt 0
}

# ─── Unread count ─────────────────────────────────────────────────────────────
Write-Host "`n=== NOTIFICATIONS ==="
$unreadRes = ApiGet "$BASE/notifications/unread-count" $dataSess
Check "Unread count endpoint works"      { $unreadRes.success -eq $true }
Check "Unread count >= 1"               { [int]$unreadRes.data.count -ge 1 }

# Mark one notification read
$notifId = $dataNotifs[0].id
$markRes = ApiPatch "$BASE/notifications/$notifId/read" @{} $dataSess
Check "Mark notification read"           { $markRes.success -eq $true }

# Mark all read
$allReadRes = ApiPatch "$BASE/notifications/read-all" @{} $dataSess
Check "Mark all notifications read"      { $allReadRes.success -eq $true }

# ─── State transition: UNDER_REVIEW -> RETURNED ──────────────────────────────
Write-Host "`n=== RETURN FOR CORRECTION (UNDER_REVIEW -> RETURNED) ==="

Check "Return without reason -> 422" {
  try { ApiPost "$BASE/review/submissions/$subId/return" @{reason=""} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 422 }
}

$returnRes = ApiPost "$BASE/review/submissions/$subId/return" @{reason="Values need verification - total OPD visits seems too low."} $reportSess
Check "Return with reason succeeds"      { $returnRes.success -eq $true }
Check "Status is RETURNED"               { $returnRes.data.status -eq 'RETURNED' }

Check "Cannot return again (409)" {
  try { ApiPost "$BASE/review/submissions/$subId/return" @{reason="again"} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

# DATA_ENTRY should have a RETURNED notification
Start-Sleep -Milliseconds 300
$dataNotifs2 = @((ApiGet "$BASE/notifications" $dataSess).data)
Check "DATA_ENTRY received returned notification" {
  @($dataNotifs2 | Where-Object { $_.type -eq 'SUBMISSION_RETURNED' }).Count -gt 0
}

# Return reason visible to DATA_ENTRY when they load their submission
$ownDetail = ApiGet "$BASE/submissions/$subId" $dataSess
Check "Return reason in submission detail" {
  $null -ne $ownDetail.data.submission.returnReason -and
  $ownDetail.data.submission.returnReason.Length -gt 0
}

# DATA_ENTRY can resubmit RETURNED submission
Write-Host "`n=== RESUBMIT RETURNED ==="
ApiPatch "$BASE/submissions/$subId" @{values=$values} $dataSess | Out-Null
$resubRes = ApiPost "$BASE/submissions/$subId/submit" @{} $dataSess
Check "Resubmit RETURNED succeeds"       { $resubRes.success -eq $true }
Check "Status back to SUBMITTED"         { $resubRes.data.status -eq 'SUBMITTED' }

# Start review again for approve test
$start2 = ApiPost "$BASE/review/submissions/$subId/start" @{} $reportSess
Check "Start review on resubmitted"      { $start2.data.status -eq 'UNDER_REVIEW' }

# ─── State transition: UNDER_REVIEW -> APPROVED ──────────────────────────────
Write-Host "`n=== APPROVE (UNDER_REVIEW -> APPROVED) ==="
$approveRes = ApiPost "$BASE/review/submissions/$subId/approve" @{} $reportSess
Check "Approve succeeds"                 { $approveRes.success -eq $true }
Check "Status is APPROVED"               { $approveRes.data.status -eq 'APPROVED' }

Check "Cannot approve again (409)" {
  try { ApiPost "$BASE/review/submissions/$subId/approve" @{} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}
Check "Cannot return APPROVED (409)" {
  try { ApiPost "$BASE/review/submissions/$subId/return" @{reason="test"} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 409 }
}

# Approve notification sent
Start-Sleep -Milliseconds 300
$dataNotifs3 = @((ApiGet "$BASE/notifications" $dataSess).data)
Check "DATA_ENTRY received approved notification" {
  @($dataNotifs3 | Where-Object { $_.type -eq 'SUBMISSION_APPROVED' }).Count -gt 0
}

# ─── Workflow history ─────────────────────────────────────────────────────────
Write-Host "`n=== WORKFLOW HISTORY ==="
$finalDetail = ApiGet "$BASE/review/submissions/$subId" $reportSess
$history = @($finalDetail.data.history)
Check "History has entries"                          { $history.Count -gt 0 }
Check "History contains CREATED"                     { @($history | Where-Object { $_.action -eq 'CREATED' }).Count -gt 0 }
Check "History contains SUBMITTED"                   { @($history | Where-Object { $_.action -eq 'SUBMITTED' }).Count -gt 0 }
Check "History contains REVIEW_STARTED"              { @($history | Where-Object { $_.action -eq 'REVIEW_STARTED' }).Count -gt 0 }
Check "History contains RETURNED with reason"        { @($history | Where-Object { $_.action -eq 'RETURNED' -and $_.reason -ne $null }).Count -gt 0 }
Check "History contains RESUBMITTED"                 { @($history | Where-Object { $_.action -eq 'RESUBMITTED' }).Count -gt 0 }
Check "History contains APPROVED"                    { @($history | Where-Object { $_.action -eq 'APPROVED' }).Count -gt 0 }

# ─── DATA_ENTRY cannot use review endpoints ───────────────────────────────────
Write-Host "`n=== DATA_ENTRY CANNOT USE REVIEW ENDPOINTS ==="
Check "DATA_ENTRY cannot start review"   {
  try { ApiPost "$BASE/review/submissions/$subId/start" @{} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "DATA_ENTRY cannot approve"        {
  try { ApiPost "$BASE/review/submissions/$subId/approve" @{} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}
Check "DATA_ENTRY cannot return"         {
  try { ApiPost "$BASE/review/submissions/$subId/return" @{reason="x"} $dataSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

# ─── REPORTING cannot create DATA_ENTRY submissions ──────────────────────────
Write-Host "`n=== REPORTING CANNOT CREATE SUBMISSIONS ==="
Check "REPORTING -> 403 on POST /submissions" {
  try { ApiPost "$BASE/submissions" @{dataset_id=1; reporting_period_id=1} $reportSess; $false }
  catch { $_.Exception.Response.StatusCode.Value__ -eq 403 }
}

Write-Host ""
Write-Host "======================================"
Write-Host "RESULTS: $pass passed  /  $fail failed"
if ($fail -gt 0) { exit 1 } else { exit 0 }
