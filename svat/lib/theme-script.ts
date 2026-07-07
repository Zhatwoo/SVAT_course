export function themeInitScript() {
  return `(function(){try{var k='one-traders-theme',legacy='trademaster-theme',s=localStorage.getItem(k)||localStorage.getItem(legacy),d=window.matchMedia('(prefers-color-scheme: dark)').matches,t=s||(d?'dark':'light');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}}catch(e){}})();`;
}
