import {createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/fangs/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const mode=process.argv[2]||'sample';
const out=path.join(root,'raw',mode);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const scenes=mode==='sample'?['hook']:['hook','catalog','source','reading','closing'];
const report=fs.existsSync(path.join(out,'capture.json'))?JSON.parse(fs.readFileSync(path.join(out,'capture.json'),'utf8')):{mode,date:new Date().toISOString(),viewport:{width:1180,height:820},capture:'Playwright recordVideo; independent contexts; source silent',speed:1,scenes:[]};
const article='https://wbw.fangs.cc/posts/why-procrastinators-procrastinate.html';
try {
for(const name of scenes){
 if(report.scenes.some(s=>s.name===name)&&fs.existsSync(path.join(out,`${name}.webm`))) {console.log(`resume: keep ${name}`);continue;}
 const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,colorScheme:'light',recordVideo:{dir:out,size:report.viewport}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const events=[];const t0=Date.now(); const mark=async(label)=>events.push({label,wallSeconds:(Date.now()-t0)/1000,url:page.url(),scrollY:await page.evaluate(()=>scrollY)});
 await page.goto(['catalog','closing'].includes(name)?'https://wbw.fangs.cc/':article,{waitUntil:'networkidle'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>null)));});
 if(name==='hook'||name==='reading'){
  const which=name==='hook'?'NP-brain.png':'P-brain.png';
  const pos=await page.locator(`img[src$="/${which}"]`).evaluate(i=>i.getBoundingClientRect().top+scrollY-120);
  await page.evaluate(y=>scrollTo(0,y),pos);await page.waitForTimeout(500);
 }
 await page.mouse.move(1110,760);await mark('selected-start');
 await page.screenshot({path:path.join(out,`${name}-start.png`)});
 if(name==='hook'){
  await page.waitForTimeout(1700);await page.mouse.move(1010,620);
  for(let i=0;i<25;i++){await page.mouse.wheel(0,18);await page.waitForTimeout(90);}
  await page.waitForTimeout(3600);
 }else if(name==='catalog'){
  await page.waitForTimeout(1800);await page.getByRole('link',{name:'全部文章',exact:true}).click();
  await page.waitForURL('**/posts/');await page.waitForTimeout(3700);
 }else if(name==='source'){
  await page.waitForTimeout(2200);
  await page.locator('.vp-doc blockquote a').first().hover();await page.waitForTimeout(3900);
 }else if(name==='reading'){
  await page.waitForTimeout(2400);await page.mouse.move(1010,620);
  for(let i=0;i<35;i++){await page.mouse.wheel(0,12);await page.waitForTimeout(95);}
  await page.waitForTimeout(3000);
 }else{await page.waitForTimeout(4700);}
 await mark('selected-end');
 await page.screenshot({path:path.join(out,`${name}-end.png`)});
 const images=await page.locator('.vp-doc img').evaluateAll(a=>a.map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight}))); const video=page.video();
 await context.close();await video.saveAs(path.join(out,`${name}.webm`));await video.delete();
 report.scenes.push({name,events,images,errors,source:`raw/${mode}/${name}.webm`,preparation:name==='hook'||name==='reading'?'Scroll to named article illustration before selected segment; selected interval uses real mouse wheel inputs':'Normal public page; no storage, product modification, test modes or signed-in state'});
 console.log(JSON.stringify(report.scenes.at(-1)));
 fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2));
}
} finally {await browser.close();}
