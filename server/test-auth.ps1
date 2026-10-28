# BIDZONE Auth API Test Suite
# Run from: C:\Users\jayas\Desktop\bidding\server
# Requires server running on http://localhost:5000

$BASE = "http://localhost:5000"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$passed = 0
$failed = 0

function Test-Case {
  param($name, $expected, $actual, $body = $null)
  if ($actual -eq $expected) {
    Write-Host "  PASS  $name" -ForegroundColor Green
    $script:passed++
  } else {
    Write-Host "  FAIL  $name (expected $expected, got $actual)" -ForegroundColor Red
    if ($body) { Write-Host "        Body: $body" -ForegroundColor DarkYellow }
    $script:failed++
  }
}

Write-Host "`n=== BIDZONE Auth Test Suite ===" -ForegroundColor Cyan

# ── T1: Health check ──────────────────────────────────────────────────────────
Write-Host "`n[T1] Health check"
try {
  $r = Invoke-WebRequest -Uri "$BASE/" -Method GET -UseBasicParsing
  $j = $r.Content | ConvertFrom-Json
  Test-Case "Status 200"   200    $r.StatusCode
  Test-Case "success=true" $true  $j.success
} catch { Write-Host "  FAIL  Exception: $($_.Exception.Message)" -ForegroundColor Red; $failed++ }

# ── T2: Signup success ────────────────────────────────────────────────────────
Write-Host "`n[T2] Signup — success"
$signupBody = '{"name":"Test Student","email":"test.student@kongu.edu","password":"Test1234"}'
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/signup" -Method POST `
       -ContentType "application/json" -Body $signupBody `
       -WebSession $session -UseBasicParsing
  $j = $r.Content | ConvertFrom-Json
  Test-Case "Status 201"          201   $r.StatusCode
  Test-Case "success=true"        $true $j.success
  Test-Case "Has user._id"        $true ($null -ne $j.user._id)
  Test-Case "Has user.email"      $true ($null -ne $j.user.email)
  Test-Case "No passwordHash"     $true ($null -eq $j.user.passwordHash)
  Test-Case "No password field"   $true ($null -eq $j.user.password)
  $hasCookie = ($session.Cookies.GetCookies("$BASE") | Where-Object { $_.Name -eq "campus.sid" }).Count -gt 0
  Test-Case "Session cookie set"  $true $hasCookie
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "  FAIL  Exception (HTTP $status): $($_.Exception.Message)" -ForegroundColor Red; $failed++
}

# ── T3: Duplicate signup ──────────────────────────────────────────────────────
Write-Host "`n[T3] Signup — duplicate email"
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/signup" -Method POST `
       -ContentType "application/json" -Body $signupBody -UseBasicParsing
  Test-Case "Status 409" 409 $r.StatusCode
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Test-Case "Status 409" 409 $status
}

# ── T4: Signup — weak password ────────────────────────────────────────────────
Write-Host "`n[T4] Signup — weak password (validation)"
$weakBody = '{"name":"Bad User","email":"bad@kongu.edu","password":"weak"}'
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/signup" -Method POST `
       -ContentType "application/json" -Body $weakBody -UseBasicParsing
  Test-Case "Status 422" 422 $r.StatusCode
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Test-Case "Status 422" 422 $status
}

# ── T5: Login — success ───────────────────────────────────────────────────────
Write-Host "`n[T5] Login — success"
$loginSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"email":"test.student@kongu.edu","password":"Test1234"}'
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST `
       -ContentType "application/json" -Body $loginBody `
       -WebSession $loginSession -UseBasicParsing
  $j = $r.Content | ConvertFrom-Json
  Test-Case "Status 200"        200   $r.StatusCode
  Test-Case "success=true"      $true $j.success
  Test-Case "No passwordHash"   $true ($null -eq $j.user.passwordHash)
  Test-Case "No password field" $true ($null -eq $j.user.password)
  $hasCookie = ($loginSession.Cookies.GetCookies("$BASE") | Where-Object { $_.Name -eq "campus.sid" }).Count -gt 0
  Test-Case "Session cookie set" $true $hasCookie
} catch { Write-Host "  FAIL  Exception: $($_.Exception.Message)" -ForegroundColor Red; $failed++ }

# ── T6: Login — wrong password ────────────────────────────────────────────────
Write-Host "`n[T6] Login — wrong password (generic error)"
$badPassBody = '{"email":"test.student@kongu.edu","password":"WrongPass1"}'
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST `
       -ContentType "application/json" -Body $badPassBody -UseBasicParsing
  Test-Case "Status 401" 401 $r.StatusCode
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  $body   = $_.ErrorDetails.Message
  Test-Case "Status 401" 401 $status
  $j = $body | ConvertFrom-Json
  Test-Case "Generic error message" "Invalid email or password." $j.message
}

# ── T7: Login — nonexistent email ─────────────────────────────────────────────
Write-Host "`n[T7] Login — nonexistent email (generic error)"
$noUserBody = '{"email":"ghost@kongu.edu","password":"Test1234"}'
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST `
       -ContentType "application/json" -Body $noUserBody -UseBasicParsing
  Test-Case "Status 401" 401 $r.StatusCode
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Test-Case "Status 401" 401 $status
  $j = $_.ErrorDetails.Message | ConvertFrom-Json
  Test-Case "Generic error (no email reveal)" "Invalid email or password." $j.message
}

# ── T8: GET /me — without session ─────────────────────────────────────────────
Write-Host "`n[T8] GET /api/auth/me — no session"
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/me" -Method GET -UseBasicParsing
  Test-Case "Status 401" 401 $r.StatusCode
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Test-Case "Status 401" 401 $status
}

# ── T9: GET /me — with valid session ──────────────────────────────────────────
Write-Host "`n[T9] GET /api/auth/me — with valid session"
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/me" -Method GET `
       -WebSession $loginSession -UseBasicParsing
  $j = $r.Content | ConvertFrom-Json
  Test-Case "Status 200"      200   $r.StatusCode
  Test-Case "success=true"    $true $j.success
  Test-Case "Has user.email"  $true ($null -ne $j.user.email)
  Test-Case "No passwordHash" $true ($null -eq $j.user.passwordHash)
} catch { Write-Host "  FAIL  Exception: $($_.Exception.Message)" -ForegroundColor Red; $failed++ }

# ── T10: Logout ───────────────────────────────────────────────────────────────
Write-Host "`n[T10] Logout"
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/logout" -Method POST `
       -WebSession $loginSession -UseBasicParsing
  $j = $r.Content | ConvertFrom-Json
  Test-Case "Status 200"   200   $r.StatusCode
  Test-Case "success=true" $true $j.success
} catch { Write-Host "  FAIL  Exception: $($_.Exception.Message)" -ForegroundColor Red; $failed++ }

# ── T11: GET /me — after logout (session invalidated) ─────────────────────────
Write-Host "`n[T11] GET /api/auth/me — after logout (session must be dead)"
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/auth/me" -Method GET `
       -WebSession $loginSession -UseBasicParsing
  Test-Case "Status 401" 401 $r.StatusCode
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Test-Case "Status 401" 401 $status
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "  Passed : $passed" -ForegroundColor Green
Write-Host "  Failed : $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
