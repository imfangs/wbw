from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np, wave, json, hashlib, subprocess, platform
R=Path(__file__).resolve().parents[1]
FONT='/System/Library/Fonts/Supplemental/Songti.ttc'
LATIN='/System/Library/Fonts/Supplemental/Arial.ttf'
def font(n,index=1):return ImageFont.truetype(FONT,n,index=index)
def eng(n):return ImageFont.truetype(LATIN,n)
texts=[('为什么，','总在拖延？','从一个熟悉的问题开始','Tim Urban 的图文长文'),('找一篇，','慢慢读。','从心理与选择','读到科学与社会'),('中文入口，','保留原文。','译文可能有偏差','可随时对照原文'),('文字之间，','还有图解。','真实页面','少量阅读片段'),('给长文，','留点时间。','wbw.fangs.cc','非官方中文整理')]
for n,(a,b,c,d) in enumerate(texts,1):
 im=Image.new('RGBA',(1920,1080),(0,0,0,0));p=ImageDraw.Draw(im)
 p.text((62,55),'WAIT BUT WHY',font=eng(25),fill='#d4541f');p.text((260,52),'· 中译',font=font(25),fill='#d4541f')
 p.line((64,260,122,260),fill='#d4541f',width=4)
 p.text((60,303),a,font=font(64),fill='#1a1a1a');p.text((60,385),b,font=font(64),fill='#1a1a1a')
 p.text((64,532),c,font=eng(35) if 'fangs.cc' in c else font(31,4),fill='#4a4a4a')
 p.text((64,580),d,font=font(29,4),fill='#4a4a4a')
 p.text((64,947),f'0{n} / 慢读一会儿',font=font(23,4),fill='#7a7a7a')
 p.text((1548,52),'真实阅读片段',font=font(23,4),fill='#7a7a7a')
 p.rectangle((539,99,1861,1019),outline='#e2ded5',width=2)
 p.text((64,1032),'非官方中文整理  ·  原作与插图：Tim Urban / Wait But Why',font=font(23,4),fill='#67635d')
 im.save(R/'graphics'/f'shot-{n}.png')
# Original generated score: sparse four-note motifs, no sampled/copyrighted recording.
sr=48000;dur=31;n=int(sr*dur);track=np.zeros((n,2),dtype=np.float64)
notes=[(0.2,48,4.5,.11),(1.1,60,2.8,.075),(2.3,64,3.5,.055),(4.1,67,3.0,.06),(6.3,55,4.3,.08),(8.3,62,3.6,.07),(10.2,65,3.2,.045),(12.4,69,3.5,.05),(14.3,53,4.2,.08),(16.1,60,3.1,.065),(18.2,64,3.3,.05),(20.2,67,4.2,.055),(23.0,48,5.0,.07),(24.3,60,4.8,.055),(25.8,64,4.5,.04),(27.1,67,3.7,.035)]
for k,(start,midi,length,amp) in enumerate(notes):
 t=np.arange(int(sr*length))/sr;freq=440*2**((midi-69)/12)
 env=(1-np.exp(-t/0.025))*np.exp(-t/1.6)*np.minimum(1,(length-t)/.12)
 s=(np.sin(2*np.pi*freq*t)+.15*np.sin(2*np.pi*2*freq*t)+.045*np.sin(2*np.pi*3*freq*t))*env*amp
 at=int(start*sr);count=min(len(s),n-at);pan=.28 if k%2 else -.28
 track[at:at+count,0]+=s[:count]*(1-pan);track[at:at+count,1]+=s[:count]*(1+pan)
 # Quiet deterministic echo provides space; declared synthesis, not product audio.
 for delay,gain in [(.21,.13),(.41,.07)]:
  pos=at+int(delay*sr);cnt=min(len(s),n-pos)
  if cnt>0:track[pos:pos+cnt]+=s[:cnt,None]*gain
fade=np.minimum(np.arange(n)/(sr*.45),1)*np.minimum((n-np.arange(n))/(sr*1.4),1);track*=fade[:,None]
with wave.open(str(R/'graphics/score.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(np.int16(np.clip(track,-1,1)*32767).tobytes())
identity={'date':'2026-10-01','python':platform.python_version(),'ffmpegPath':'/opt/homebrew/Caskroom/miniforge/base/bin/ffmpeg','ffprobePath':'/opt/homebrew/Caskroom/miniforge/base/bin/ffprobe','playwrightModule':'/Users/fangs/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js','playwrightVersion':'1.62.1','fonts':[{'path':FONT,'family':'Songti SC','indicesUsed':[1,4],'sha256':hashlib.sha256(Path(FONT).read_bytes()).hexdigest(),'distribution':'System font used to render graphics only; font file not bundled'},{'path':LATIN,'family':'Arial','sha256':hashlib.sha256(Path(LATIN).read_bytes()).hexdigest(),'distribution':'System font used to render graphics only; font file not bundled'}]}
for k in ['ffmpeg','ffprobe']:
 p=Path(identity[k+'Path']);identity[k+'SHA256']=hashlib.sha256(p.read_bytes()).hexdigest();identity[k+'Version']=subprocess.check_output([str(p),'-version'],text=True).splitlines()[0]
identity['audio']={'source':'Original deterministic waveform synthesized by scripts/make_assets.py','author':'This production project; no external samples or melody reference','durationSeconds':31,'sampleRate':sr,'channels':2,'peak':float(np.max(abs(track))),'notProductAudio':True,'humanListening':'not_done'}
(R/'evidence/toolchain.json').write_text(json.dumps(identity,ensure_ascii=False,indent=2))
