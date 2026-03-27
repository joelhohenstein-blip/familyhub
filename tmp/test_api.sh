#!/bin/bash

FAMILY_ID="df3bd22f-4819-476b-8054-acb66e486246"
MEMBER_ID="a1a0d8ed-9e1b-498b-8349-18958829f012"

curl -X POST "http://localhost:3000/api/trpc/familyMembers.updateMemberNames" \
  -H "Content-Type: application/json" \
  -d "{
    \"familyId\": \"$FAMILY_ID\",
    \"memberId\": \"$MEMBER_ID\",
    \"firstName\": \"John\",
    \"lastName\": \"Doe\"
  }"
