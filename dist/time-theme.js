// 跟随浏览器报告的系统深色外观；不支持时使用浅色。
export function watchSystemTheme(onChange){
 const media=typeof globalThis.matchMedia==='function'?globalThis.matchMedia('(prefers-color-scheme: dark)'):null;
 const change=()=>onChange(Boolean(media?.matches));
 if(media?.addEventListener)media.addEventListener('change',change);
 else if(media?.addListener)media.addListener(change);
 return {
  isDark:()=>Boolean(media?.matches),
  dispose(){
   if(media?.removeEventListener)media.removeEventListener('change',change);
   else if(media?.removeListener)media.removeListener(change);
  }
 };
}
