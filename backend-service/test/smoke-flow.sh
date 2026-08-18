#!/usr/bin/env bash
set -euo pipefail
API="${API_BASE:-http://localhost:3001/api}"
email="smoke.$(date +%s)@impactc.local"
password="SecurePass123!"

register=$(curl -sS -X POST "$API/auth/register" -H 'content-type: application/json' -d "{\"email\":\"$email\",\"password\":\"$password\"}")
member_token=$(printf '%s' "$register" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
test -n "$member_token"

profile=$(curl -sS -X POST "$API/profiles" -H 'content-type: application/json' -H "authorization: Bearer $member_token" -d '{"firstName":"Smoke","lastName":"Member","gender":"FEMALE","dateOfBirth":"1995-01-01","city":"Paris","churchDepartment":"Choir","departmentLeader":"Leader Test","profession":"Engineer","financialRange":"Stable","profilePhotoUrl":"https://example.com/photo.jpg","tagline":"A sincere profile","searchMinAge":25,"searchMaxAge":40,"consent":true}')
profile_id=$(printf '%s' "$profile" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
test -n "$profile_id"

leader=$(curl -sS -X POST "$API/auth/login" -H 'content-type: application/json' -d '{"email":"responsable@impactc.local","password":"SecurePass123!"}')
leader_token=$(printf '%s' "$leader" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
test -n "$leader_token"

curl -fsS -X PATCH "$API/moderation/profiles/$profile_id" -H 'content-type: application/json' -H "authorization: Bearer $leader_token" -d '{"decision":"approve"}' >/dev/null
curl -fsS "$API/profiles/me" -H "authorization: Bearer $member_token" >/dev/null
printf 'SMOKE_FLOW_OK\n'
