const fs = require('fs');
const path = require('path');

const filePath = '/workspace/app/server/trpc/routers/calendarSync.router.ts';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(/await db\./g, 'await ctx.db.');
content = content.replace(/ctx\.userId/g, 'ctx.user?.id');

fs.writeFileSync(filePath, content);
console.log('Fixed calendarSync.router.ts');
