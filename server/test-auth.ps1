# BIDZONE Auth API Test Suite (ASCII-safe, no Unicode dashes)
# Usage: Start server first, then run: .\test-auth.ps1
# Server must be running on http://localhost:5000

$BASE    = "http://localhost:5000"
$passed  = 0
$failed  = 0
# Use timestamp-based email so re-runs never collide with existing DB data
$ts      = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$EMAIL   = "test.student.$ts@kongu.edu"
$PASS    = "Test1234"
$NAME    = "Test Student"

function Pass($label) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    $script:passed++
}
function Fail($label, $extra = "") {
    Write-Host "  FAIL  $label $extra" -ForegroundColor Red
    $script:failed++
}
function Check($label, $expected, $actual) {
    if ("$actual" -eq "$expected") { Pass $label }
    else { Fail $label "(expected '$expected', got '$actual')" }
}

Write-Host ""
Write-Host "=== BIDZONE Auth Test Suite ===" -ForegroundColor Cyan
Write-Host "    Test email: $EMAIL"
Write-Host ""

# ------------------------------------------------------------------
# T1: Health check
# ------------------------------------------------------------------
Write-Host "[T1] Health check"
try {
    $r = Invoke-WebRequest -Uri "$BASE/" -Method GET -UseBasicParsing
    $j = $r.Content | ConvertFrom-Json
    Check "Status 200"   "200"  $r.StatusCode
    Check "success=true" "True" $j.success
} catch {
    Fail "T1 exception" $_.Exception.Message
}

# ------------------------------------------------------------------
# T2: Signup - success
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T2] Signup -- success"
$signupSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$signupBody    = "{`"name`":`"$NAME`",`"email`":`"$EMAIL`",`"password`":`"$PASS`"}"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/signup" -Method POST `
         -ContentType "application/json" -Body $signupBody `
         -WebSession $signupSession -UseBasicParsing
    $j = $r.Content | ConvertFrom-Json
    Check "Status 201"           "201"  $r.StatusCode
    Check "success=true"         "True" $j.success
    Check "Has user._id"         "True" ($null -ne $j.user._id)
    Check "No passwordHash"      "True" ($null -eq $j.user.passwordHash)
    Check "No password field"    "True" ($null -eq $j.user.password)
    $cookie = $signupSession.Cookies.GetCookies($BASE) | Where-Object { $_.Name -eq "campus.sid" }
    Check "Session cookie set"   "True" ($cookie.Count -gt 0)
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Fail "T2 exception (HTTP $status)" $body
}

# ------------------------------------------------------------------
# T3: Signup - duplicate email (must return 409)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T3] Signup -- duplicate email (expect 409)"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/signup" -Method POST `
         -ContentType "application/json" -Body $signupBody -UseBasicParsing
    Fail "T3 should have returned 409 but got $($r.StatusCode)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Check "Status 409" "409" $status
    if ($body) {
        $j = $body | ConvertFrom-Json
        Write-Host "        Body: $($j.message)" -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------------
# T4: Signup - validation failure (weak password)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T4] Signup -- weak password (expect 422)"
$weakBody = '{"name":"Bad","email":"bad@kongu.edu","password":"weak"}'
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/signup" -Method POST `
         -ContentType "application/json" -Body $weakBody -UseBasicParsing
    Fail "T4 should have returned 422 but got $($r.StatusCode)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Check "Status 422" "422" $status
    if ($body) {
        $j = $body | ConvertFrom-Json
        Write-Host "        Validation msg: $($j.message)" -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------------
# T5: Login - success
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T5] Login -- success"
$loginSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody    = "{`"email`":`"$EMAIL`",`"password`":`"$PASS`"}"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST `
         -ContentType "application/json" -Body $loginBody `
         -WebSession $loginSession -UseBasicParsing
    $j = $r.Content | ConvertFrom-Json
    Check "Status 200"         "200"  $r.StatusCode
    Check "success=true"       "True" $j.success
    Check "No passwordHash"    "True" ($null -eq $j.user.passwordHash)
    Check "No password field"  "True" ($null -eq $j.user.password)
    $cookie = $loginSession.Cookies.GetCookies($BASE) | Where-Object { $_.Name -eq "campus.sid" }
    Check "Session cookie set" "True" ($cookie.Count -gt 0)
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Fail "T5 exception (HTTP $status)" $body
}

# ------------------------------------------------------------------
# T6: Login - wrong password (must return 401, generic message)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T6] Login -- wrong password (expect 401 generic)"
$badBody = "{`"email`":`"$EMAIL`",`"password`":`"WrongPass1`"}"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST `
         -ContentType "application/json" -Body $badBody -UseBasicParsing
    Fail "T6 should have returned 401 but got $($r.StatusCode)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Check "Status 401" "401" $status
    if ($body) {
        $j = $body | ConvertFrom-Json
        Check "Generic error message" "Invalid email or password." $j.message
    }
}

# ------------------------------------------------------------------
# T7: Login - nonexistent email (must return 401, same generic message)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T7] Login -- nonexistent email (expect 401 generic)"
$ghostBody = '{"email":"ghost@kongu.edu","password":"Test1234"}'
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST `
         -ContentType "application/json" -Body $ghostBody -UseBasicParsing
    Fail "T7 should have returned 401 but got $($r.StatusCode)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Check "Status 401" "401" $status
    if ($body) {
        $j = $body | ConvertFrom-Json
        Check "Generic error (no email reveal)" "Invalid email or password." $j.message
    }
}

# ------------------------------------------------------------------
# T8: GET /me - no session (must return 401)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T8] GET /api/auth/me -- no session (expect 401)"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/me" -Method GET -UseBasicParsing
    Fail "T8 should have returned 401 but got $($r.StatusCode)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Check "Status 401" "401" $status
}

# ------------------------------------------------------------------
# T9: GET /me - with valid session (must return 200, no passwordHash)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T9] GET /api/auth/me -- with valid session (expect 200)"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/me" -Method GET `
         -WebSession $loginSession -UseBasicParsing
    $j = $r.Content | ConvertFrom-Json
    Check "Status 200"      "200"  $r.StatusCode
    Check "success=true"    "True" $j.success
    Check "Has user.email"  "True" ($null -ne $j.user.email)
    Check "No passwordHash" "True" ($null -eq $j.user.passwordHash)
    Write-Host "        User: $($j.user.email)" -ForegroundColor DarkGray
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Fail "T9 exception (HTTP $status)" $body
}

# ------------------------------------------------------------------
# T10: Logout
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T10] Logout"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/logout" -Method POST `
         -WebSession $loginSession -UseBasicParsing
    $j = $r.Content | ConvertFrom-Json
    Check "Status 200"   "200"  $r.StatusCode
    Check "success=true" "True" $j.success
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body   = $_.ErrorDetails.Message
    Fail "T10 exception (HTTP $status)" $body
}

# ------------------------------------------------------------------
# T11: GET /me - after logout (session must be invalidated, expect 401)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[T11] GET /api/auth/me -- after logout (expect 401)"
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth/me" -Method GET `
         -WebSession $loginSession -UseBasicParsing
    Fail "T11 should have returned 401 but got $($r.StatusCode)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Check "Status 401 (session destroyed)" "401" $status
}

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "  Passed : $passed" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  Failed : $failed" -ForegroundColor Red
} else {
    Write-Host "  Failed : $failed" -ForegroundColor Green
    Write-Host ""
    Write-Host "  All tests passed!" -ForegroundColor Green
}
Write-Host ""
