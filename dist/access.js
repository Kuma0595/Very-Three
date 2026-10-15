import {client,getMember,cloudError} from './cloud.js?v=4';
const gate=document.querySelector('#access-gate');
const shell=document.querySelector('#home-shell');
const form=document.querySelector('#access-form');
const email=document.querySelector('#access-email');
const input=document.querySelector('#access-password');
const message=document.querySelector('#access-message');
const submit=document.querySelector('#access-submit');
let entering=false,opened=false;
function failure(text){shell.hidden=true;gate.hidden=false;message.textContent=text;submit.disabled=false;submit.textContent='登录，回家 ♡';entering=false}
async function enterHome(){
 if(opened)return;
 try{
  await getMember();
  shell.hidden=false;gate.hidden=true;
  await import('./app.js?v=34-admin-console');
  opened=true;input.value='';
  document.querySelector('#lock-home').textContent='退出登录';
  document.querySelector('#lock-home').onclick=async()=>{
   // 本地注销先撤销界面访问，即使网络断开也不能继续显示云端页面。
   const {error}=await client.auth.signOut({scope:'local'});
   if(error){message.textContent='退出未完成，请刷新后重试。';gate.hidden=false;shell.hidden=true;return}
   location.reload();
  };
  document.querySelector('.brand').focus({preventScroll:true});
 }catch(error){
  const setup=['42P01','PGRST205'].includes(error?.code);
  failure(setup?cloudError(error):error?.message?.includes('加入小家')?error.message:'小家暂时无法同步，请检查网络或完成后台设置后刷新。');
 }
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(entering)return;entering=true;submit.disabled=true;submit.textContent='正在开门…';message.textContent='';
 try{
  const {error}=await client.auth.signInWithPassword({email:email.value.trim(),password:input.value});
  if(error){failure('邮箱或密码不正确，或账号尚未确认。');return}
  await enterHome();
 }catch{failure('无法连接小家，请检查网络后重试。')}
});
input.addEventListener('input',()=>{message.textContent=''});
client.auth.onAuthStateChange(event=>{
 if(event==='SIGNED_OUT'&&opened){shell.hidden=true;gate.hidden=false;location.reload()}
});
try{
 const {data:{session}}=await client.auth.getSession();
 if(session){entering=true;submit.disabled=true;submit.textContent='正在回家…';await enterHome()}
}catch{failure('暂时无法恢复登录，请重新登录。')}
