// Quick test to validate streaming router types
import { streamingRouter } from '"'"'./app/server/trpc/routers/streaming.router'"'"';

console.log('"'"'✅ Streaming router imported successfully'"'"');
console.log('"'"'Available procedures:'"'"', Object.keys(streamingRouter._def.procedures));
EOF
bun run test-streaming.ts 2>&1 | head -30
