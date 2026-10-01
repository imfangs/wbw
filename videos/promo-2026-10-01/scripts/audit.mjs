import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/fangs/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=path.resolve(new URL('..',import.meta.url).pathname);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,colorScheme:'light'});
const page=await context.newPage();let report={date:new Date().toISOString(),pages:[]};
for(const [name,url] of [['hi','https://hi.fangs.cc/projects/wbw/'],['home','https://wbw.fangs.cc/'],['list','https://wbw.fangs.cc/posts/'],['article','https://wbw.fangs.cc/posts/why-procrastinators-procrastinate.html']]) {
 const response=await page.goto(url,{waitUntil:'networkidle'}); await page.evaluate(()=>document.fonts.ready);
 report.pages.push({name,url:page.url(),status:response.status(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,12000),links:await page.locator('a').evaluateAll(a=>a.map(x=>({text:x.textContent.trim(),href:x.href}))),fonts:await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status}))),images:await page.locator('.vp-doc img').evaluateAll(a=>a.map(x=>({src:x.src,width:x.naturalWidth,height:x.naturalHeight,complete:x.complete,top:x.getBoundingClientRect().top}))) });
 await page.screenshot({path:path.join(base,'evidence',`${name}.png`)});
}
fs.writeFileSync(path.join(base,'evidence/product-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.pages.map(p=>({name:p.name,url:p.url,status:p.status,title:p.title,body:p.body.slice(0,600),images:p.images.slice(0,4)})),null,2));
await browser.close();
