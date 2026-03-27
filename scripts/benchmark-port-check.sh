#!/bin/bash
#
# Benchmark: lsof vs fuser vs ss for port checking
# Run this on a pod to see the real performance difference
#

echo "=== Port Check Benchmark ==="
echo "Starting test server on port 3000..."

# Start a simple server
node -e "require('http').createServer((req,res)=>res.end('ok')).listen(3000)" &
SERVER_PID=$!
sleep 1

echo "Server PID: $SERVER_PID"
echo ""

ITERATIONS=10

# Benchmark lsof
echo "Testing lsof -i :3000 ($ITERATIONS iterations)..."
START=$(date +%s.%N)
for i in $(seq 1 $ITERATIONS); do
  lsof -i :3000 -t > /dev/null 2>&1
done
END=$(date +%s.%N)
LSOF_TIME=$(echo "$END - $START" | bc)
LSOF_AVG=$(echo "scale=0; ($LSOF_TIME * 1000) / $ITERATIONS" | bc)
echo "  lsof: ${LSOF_TIME}s total, ~${LSOF_AVG}ms per call"

# Benchmark fuser
echo ""
echo "Testing fuser 3000/tcp ($ITERATIONS iterations)..."
START=$(date +%s.%N)
for i in $(seq 1 $ITERATIONS); do
  fuser 3000/tcp > /dev/null 2>&1
done
END=$(date +%s.%N)
FUSER_TIME=$(echo "$END - $START" | bc)
FUSER_AVG=$(echo "scale=0; ($FUSER_TIME * 1000) / $ITERATIONS" | bc)
echo "  fuser: ${FUSER_TIME}s total, ~${FUSER_AVG}ms per call"

# Benchmark ss (just check)
echo ""
echo "Testing ss -tlnp | grep :3000 ($ITERATIONS iterations)..."
START=$(date +%s.%N)
for i in $(seq 1 $ITERATIONS); do
  ss -tlnp 2>/dev/null | grep ':3000' > /dev/null
done
END=$(date +%s.%N)
SS_TIME=$(echo "$END - $START" | bc)
SS_AVG=$(echo "scale=0; ($SS_TIME * 1000) / $ITERATIONS" | bc)
echo "  ss: ${SS_TIME}s total, ~${SS_AVG}ms per call"

# Benchmark ss with PID extraction
echo ""
echo "Testing ss + PID extraction ($ITERATIONS iterations)..."
START=$(date +%s.%N)
for i in $(seq 1 $ITERATIONS); do
  ss -tlnp 2>/dev/null | grep ':3000' | grep -oP 'pid=\K[0-9]+' > /dev/null
done
END=$(date +%s.%N)
SS_PID_TIME=$(echo "$END - $START" | bc)
SS_PID_AVG=$(echo "scale=0; ($SS_PID_TIME * 1000) / $ITERATIONS" | bc)
echo "  ss+pid: ${SS_PID_TIME}s total, ~${SS_PID_AVG}ms per call"

# Cleanup
kill $SERVER_PID 2>/dev/null

echo ""
echo "=== Summary ==="
echo "┌─────────────┬─────────────┬─────────────┐"
echo "│ Command     │ Total (${ITERATIONS}x)  │ Per call    │"
echo "├─────────────┼─────────────┼─────────────┤"
printf "│ lsof        │ %8ss   │ %6sms    │\n" "$LSOF_TIME" "$LSOF_AVG"
printf "│ fuser       │ %8ss   │ %6sms    │\n" "$FUSER_TIME" "$FUSER_AVG"
printf "│ ss          │ %8ss   │ %6sms    │\n" "$SS_TIME" "$SS_AVG"
printf "│ ss+pid      │ %8ss   │ %6sms    │\n" "$SS_PID_TIME" "$SS_PID_AVG"
echo "└─────────────┴─────────────┴─────────────┘"
echo ""

# Calculate speedup
if [ "$SS_AVG" != "0" ] && [ -n "$SS_AVG" ]; then
  LSOF_SPEEDUP=$(echo "scale=1; $LSOF_AVG / $SS_AVG" | bc 2>/dev/null || echo "N/A")
  FUSER_SPEEDUP=$(echo "scale=1; $FUSER_AVG / $SS_AVG" | bc 2>/dev/null || echo "N/A")
  echo "ss is ${LSOF_SPEEDUP}x faster than lsof"
  echo "ss is ${FUSER_SPEEDUP}x faster than fuser"
fi
