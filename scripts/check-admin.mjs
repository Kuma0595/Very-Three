import {execFileSync} from 'node:child_process';
for(const name of ['api','controller','view','settings'])execFileSync(process.execPath,['scripts/check-admin-'+name+'.mjs'],{stdio:'inherit'});
