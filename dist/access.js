// 静态站点的前端暗号门，只用于普通访问提示，不提供服务器认证。
const SESSION_KEY='very-three-access-v1';
const gate=document.querySelector('#access-gate');
const shell=document.querySelector('#home-shell');
const form=document.querySelector('#access-form');
const input=document.querySelector('#access-password');
const message=document.querySelector('#access-message');
const submit=document.querySelector('#access-submit');
let entering=false;

async function enterHome(){
  if(entering)return;
  entering=true;
  submit.disabled=true;
  submit.textContent='正在开门…';
  // 场景初始化需要容器已有尺寸，因此先显示容器，再导入应用。
  shell.hidden=false;
  gate.hidden=true;
  try{
    await import('./app.js?v=5-mute');
    try{sessionStorage.setItem(SESSION_KEY,'open')}catch{}
    input.value='';
    document.querySelector('#lock-home').onclick=()=>{
      try{sessionStorage.removeItem(SESSION_KEY)}catch{}
      location.reload();
    };
    document.querySelector('.brand').focus({preventScroll:true});
  }catch(error){
    console.error(error);
    shell.hidden=true;
    gate.hidden=false;
    try{sessionStorage.removeItem(SESSION_KEY)}catch{}
    message.textContent='小家暂时没能打开，请刷新页面重试。';
    submit.disabled=false;
    submit.textContent='开门，回家 ♡';
    entering=false;
  }
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(entering)return;
  if(input.value.trim()!=='xiaosi'){
    input.setAttribute('aria-invalid','true');
    message.textContent='暗号不对哦，再试一下。';
    input.focus();
    input.select();
    return;
  }
  input.removeAttribute('aria-invalid');
  message.textContent='';
  void enterHome();
});
input.addEventListener('input',()=>{
  input.removeAttribute('aria-invalid');
  message.textContent='';
});
try{if(sessionStorage.getItem(SESSION_KEY)==='open')void enterHome()}catch{}
