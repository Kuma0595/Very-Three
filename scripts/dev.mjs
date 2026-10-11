// 无需安装依赖的本地开发服务，只监听自己的电脑。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, resolve, relative, sep, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
const reload=`<script>new EventSource('/__reload').onmessage=()=>location.reload();</script>`;
export function createDevServer(directory=root){
 const clients=new Set();
 const server=createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end('Invalid URL');return}
  if(pathname==='/__reload'){
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;
  }
  const filename=resolve(directory,'.'+(pathname==='/'?'/index.html':pathname));
  const rel=relative(directory,filename);
  if(pathname.includes('\0')||rel==='..'||rel.startsWith('..'+sep)){res.writeHead(403);res.end('Forbidden');return}
  try{
   const info=await stat(filename);if(!info.isFile()){res.writeHead(404);res.end('Not found');return}
   let bytes=await readFile(filename);if(extname(filename)==='.html')bytes=Buffer.from(bytes.toString().replace('</body>',reload+'</body>'));
   res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Not found')}
 });
 const watchers=[];let timer;
 function changed(){clearTimeout(timer);timer=setTimeout(()=>{for(const client of clients)client.write('data: updated\n\n')},120)}
 for(const dir of [directory,resolve(directory,'vendor')]){try{watchers.push(watch(dir,changed))}catch{}}
 server.on('close',()=>{clearTimeout(timer);for(const w of watchers)w.close();for(const c of clients)c.end()});
 return server;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const pos=process.argv.indexOf('--port'),port=Number(pos>=0?process.argv[pos+1]:process.env.PORT||5173);
 if(!Number.isInteger(port)||port<1||port>65535){console.error('端口需要是 1 到 65535 的整数');process.exit(1)}
 const server=createDevServer();
 server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用，运行 npm run dev -- --port 5174 换一个端口。`:error.message);process.exit(1)});
 server.listen(port,'127.0.0.1',()=>{
  const url=`http://localhost:${port}`;console.log(`\nVery Three 已启动：${url}\n修改 dist/ 文件会自动刷新；按 Ctrl+C 停止。\n`);
  if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'}).on('error',()=>{});
 });
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
