#!/usr/bin/env bash
set -euo pipefail
API="${API_BASE:-http://localhost:3001/api}"
password="SecurePass123!"
create_member() {
  local suffix="$1"
  local gender="$2"
  local email="match.${suffix}.$(date +%s%N)@impactc.local"
  local response token profile
  response=$(curl -sS -X POST "$API/auth/register" -H 'content-type: application/json' -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  token=$(printf '%s' "$response" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'); test -n "$token"
  profile=$(curl -sS -X POST "$API/profiles" -H 'content-type: application/json' -H "authorization: Bearer $token" -d "{\"firstName\":\"${suffix}\",\"lastName\":\"Match\",\"gender\":\"${gender}\",\"dateOfBirth\":\"1995-01-01\",\"city\":\"Paris\",\"churchDepartment\":\"Choir\",\"departmentLeader\":\"Leader Test\",\"profession\":\"Engineer\",\"financialRange\":\"Stable\",\"profilePhotoUrl\":\"https://example.com/photo.jpg\",\"tagline\":\"Profile ${suffix}\",\"searchMinAge\":25,\"searchMaxAge\":40,\"consent\":true}")
  printf '%s|%s|%s\n' "$email" "$token" "$(printf '%s' "$profile" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
}
leader=$(curl -sS -X POST "$API/auth/login" -H 'content-type: application/json' -d '{"email":"responsable@impactc.local","password":"SecurePass123!"}')
leader_token=$(printf '%s' "$leader" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
a=$(create_member "Alice" "FEMALE"); b=$(create_member "Bruno" "MALE")
IFS='|' read -r _ a_token a_profile <<< "$a"; IFS='|' read -r _ b_token b_profile <<< "$b"
test -n "$a_profile"; test -n "$b_profile"
curl -fsS -X PATCH "$API/moderation/profiles/$a_profile" -H 'content-type: application/json' -H "authorization: Bearer $leader_token" -d '{"decision":"approve"}' >/dev/null
curl -fsS -X PATCH "$API/moderation/profiles/$b_profile" -H 'content-type: application/json' -H "authorization: Bearer $leader_token" -d '{"decision":"approve"}' >/dev/null
first=$(curl -fsS -X POST "$API/interests" -H 'content-type: application/json' -H "authorization: Bearer $a_token" -d "{\"targetProfileId\":\"$b_profile\"}")
printf '%s' "$first" | grep -q '"matched":false'
second=$(curl -fsS -X POST "$API/interests" -H 'content-type: application/json' -H "authorization: Bearer $b_token" -d "{\"targetProfileId\":\"$a_profile\"}")
printf '%s' "$second" | grep -q '"matched":true'
printf 'MATCH_FLOW_OK\n'
