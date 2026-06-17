#!/bin/bash

# ============================================
# ToDo Application - API Test Suite
# ============================================
# Run: bash tests/api.test.sh
# Requires: curl, running docker containers
# ============================================

BASE_URL="http://localhost:5001/api"
PASS=0
FAIL=0
TOTAL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert_contains() {
  TOTAL=$((TOTAL + 1))
  local test_name="$1"
  local response="$2"
  local expected="$3"

  if echo "$response" | grep -qF "$expected"; then
    echo -e "  ${GREEN}PASS${NC} [$TOTAL] $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} [$TOTAL] $test_name"
    echo -e "       Expected: $expected"
    echo -e "       Got: $response"
    FAIL=$((FAIL + 1))
  fi
}

assert_status() {
  TOTAL=$((TOTAL + 1))
  local test_name="$1"
  local status="$2"
  local expected="$3"

  if [ "$status" -eq "$expected" ]; then
    echo -e "  ${GREEN}PASS${NC} [$TOTAL] $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} [$TOTAL] $test_name (expected $expected, got $status)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "============================================"
echo "  ToDo App - Black-Box API Test Suite"
echo "============================================"
echo ""

# ---- Health ----
echo -e "${YELLOW}[Health Check]${NC}"
RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
assert_status "GET /health returns 200" "$RES" 200

RES=$(curl -s "$BASE_URL/health")
assert_contains "Health response has db timestamp" "$RES" '"status":"ok"'

# ---- Registration ----
echo ""
echo -e "${YELLOW}[Registration]${NC}"
RANDOM_EMAIL="testuser_$(date +%s)@test.com"

RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"password123\"}")
assert_contains "Register valid user returns token" "$RES" '"accessToken"'

RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"password123\"}")
assert_contains "Register duplicate email returns 409" "$RES" '"Email already registered"'

RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"short@test.com","password":"12"}')
assert_contains "Register short password rejected" "$RES" '"error"'

RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"password123"}')
assert_contains "Register invalid email rejected" "$RES" '"error"'

RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{}')
assert_contains "Register empty body rejected" "$RES" '"error"'

# ---- Login ----
echo ""
echo -e "${YELLOW}[Login]${NC}"
RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"password123\"}")
assert_contains "Login valid credentials returns token" "$RES" '"accessToken"'

TOKEN=$(echo "$RES" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH=$(echo "$RES" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"wrongpass\"}")
assert_contains "Login wrong password returns 401" "$RES" '"Invalid credentials"'

RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@test.com","password":"password123"}')
assert_contains "Login nonexistent user returns 401" "$RES" '"Invalid credentials"'

# ---- Auth Protection ----
echo ""
echo -e "${YELLOW}[Auth Protection]${NC}"
RES=$(curl -s "$BASE_URL/todos")
assert_contains "Todos without token returns 401" "$RES" '"Access token required"'

RES=$(curl -s "$BASE_URL/todos" -H "Authorization: Bearer invalidtoken")
assert_contains "Todos with invalid token returns 401" "$RES" '"Invalid or expired token"'

# ---- Todo CRUD ----
echo ""
echo -e "${YELLOW}[Todo CRUD]${NC}"
RES=$(curl -s -X POST "$BASE_URL/todos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test task","description":"A test description"}')
assert_contains "Create todo returns todo object" "$RES" '"title":"Test task"'

TODO_ID=$(echo "$RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

RES=$(curl -s "$BASE_URL/todos" -H "Authorization: Bearer $TOKEN")
assert_contains "Get todos returns array" "$RES" '"Test task"'

RES=$(curl -s -X PUT "$BASE_URL/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"is_done":true}')
assert_contains "Toggle todo done" "$RES" '"is_done":true'

RES=$(curl -s -X PUT "$BASE_URL/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Updated title"}')
assert_contains "Update todo title" "$RES" '"Updated title"'

RES=$(curl -s -X DELETE "$BASE_URL/todos/$TODO_ID" \
  -H "Authorization: Bearer $TOKEN")
assert_contains "Delete todo returns success" "$RES" '"Todo deleted"'

RES=$(curl -s -X DELETE "$BASE_URL/todos/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN")
assert_contains "Delete nonexistent todo returns 404" "$RES" '"Todo not found"'

# ---- Validation ----
echo ""
echo -e "${YELLOW}[Validation]${NC}"
RES=$(curl -s -X POST "$BASE_URL/todos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"","description":"no title"}')
assert_contains "Create todo empty title rejected" "$RES" '"error"'

RES=$(curl -s -X POST "$BASE_URL/todos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')
assert_contains "Create todo no body rejected" "$RES" '"error"'

RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d 'not json')
assert_contains "Invalid JSON returns clean error" "$RES" '"Invalid JSON"'

# ---- Token Refresh ----
echo ""
echo -e "${YELLOW}[Token Refresh]${NC}"

# Login and capture the Set-Cookie header with the refresh token
COOKIE_JAR="/tmp/todo_test_cookies_$$"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"password123\"}" \
  -c "$COOKIE_JAR" > /dev/null

RES=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR")
assert_contains "Refresh token returns new access token" "$RES" '"accessToken"'

RES=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  --cookie "refreshToken=invalidtoken")
assert_contains "Refresh invalid token rejected" "$RES" '"Invalid refresh token"'

RES=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json")
assert_contains "Refresh no token rejected" "$RES" '"Refresh token required"'

# Verify refresh token is HTTP-only cookie
COOKIE_HEADER=$(curl -s -D - -o /dev/null -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"password123\"}")
assert_contains "Refresh token set as HttpOnly cookie" "$COOKIE_HEADER" "HttpOnly"

# Re-login to get fresh token
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"password123\"}" \
  -c "$COOKIE_JAR" > /tmp/todo_relogin_$$.json
TOKEN=$(cat /tmp/todo_relogin_$$.json | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# ---- Logout ----
echo ""
echo -e "${YELLOW}[Logout]${NC}"
RES=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR")
assert_contains "Logout returns success" "$RES" '"Logged out successfully"'

rm -f "$COOKIE_JAR" /tmp/todo_relogin_$$.json

# ---- Security ----
echo ""
echo -e "${YELLOW}[Security]${NC}"
RES=$(curl -s -I "$BASE_URL/health")
assert_contains "Helmet sets Content-Security-Policy" "$RES" "Content-Security-Policy"
assert_contains "Helmet sets X-Content-Type-Options" "$RES" "X-Content-Type-Options"
assert_contains "Helmet sets Strict-Transport-Security" "$RES" "Strict-Transport-Security"

RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin' OR 1=1--\",\"password\":\"test\"}")
assert_contains "SQL injection blocked" "$RES" '"error"'

# ---- Cross-User Isolation ----
echo ""
echo -e "${YELLOW}[Cross-User Isolation]${NC}"

# Re-login to get a fresh token
RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"password123\"}")
TOKEN=$(echo "$RES" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

USER2_EMAIL="user2_$(date +%s)@test.com"
RES2=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER2_EMAIL\",\"password\":\"password123\"}")
TOKEN2=$(echo "$RES2" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

RES=$(curl -s -X POST "$BASE_URL/todos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"User1 private todo"}')
PRIVATE_TODO=$(echo "$RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

RES=$(curl -s -X DELETE "$BASE_URL/todos/$PRIVATE_TODO" \
  -H "Authorization: Bearer $TOKEN2")
assert_contains "User2 cannot delete User1 todo" "$RES" '"Todo not found"'

RES=$(curl -s "$BASE_URL/todos" -H "Authorization: Bearer $TOKEN2")
assert_contains "User2 cannot see User1 todos" "$RES" "[]"

# ---- Summary ----
echo ""
echo "============================================"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, $TOTAL total"
echo "============================================"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
