import {spawn} from 'node:child_process';
const args=process.argv.slice(2),port=args.includes('--port')?args[args.indexOf('--port')+1]:'3000';
const cli=args.includes('--strictPort')?['node_modules/vite/bin/vite.js','--config','vite.demo.config.ts','--host','0.0.0.0','--port',port,'--strictPort']:['node_modules/next/dist/bin/next','dev','--hostname','0.0.0.0','--port',port];
const child=spawn(process.execPath,cli,{stdio:'inherit',env:process.env});
process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGINT'));child.on('exit',code=>process.exit(code||0));
