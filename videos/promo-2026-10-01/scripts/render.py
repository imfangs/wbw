from pathlib import Path
import subprocess,json,hashlib,sys
R=Path(__file__).resolve().parents[1];FF='/opt/homebrew/Caskroom/miniforge/base/bin/ffmpeg';FP='/opt/homebrew/Caskroom/miniforge/base/bin/ffprobe'
mode=sys.argv[1] if len(sys.argv)>1 else 'sample'
def run(args,log):
 p=subprocess.run(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);(R/'evidence'/log).write_text(p.stdout+p.stderr);p.check_returncode()
def probe(p):return json.loads(subprocess.check_output([FP,'-v','error','-show_format','-show_streams','-of','json',str(p)],text=True))
scenes=[('hook',7),('catalog',6),('source',6),('reading',8),('closing',4)] if mode=='full' else [('hook',7)]
clips=[];story=[];output=0
for i,(name,dur) in enumerate(scenes):
 source=R/'raw'/mode/f'{name}.webm';info=probe(source);total=float(info['format']['duration']);start=round(max(0,total-dur-.20),3)
 target=R/'raw'/mode/f'edit-{i+1}.mp4';graphic=R/'graphics'/f'shot-{i+1}.png'
 run([FF,'-y','-hide_banner','-threads','2','-filter_complex_threads','1','-ss',str(start),'-i',str(source),'-loop','1','-i',str(graphic),'-filter_complex','[0:v]scale=1320:918:flags=lanczos,fps=25,setsar=1,pad=1920:1080:540:100:color=0xfafaf7[bg];[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v]','-map','[v]','-an','-t',str(dur),'-c:v','libx264','-threads','2','-preset','fast','-crf','18','-movflags','+faststart',str(target)],f'{mode}-render-{name}.log')
 clips.append(target);story.append({'id':name,'purpose':['A familiar question and Tim Urban illustration make the content recognizable','Show the real catalogue entry from the homepage','Show Chinese title and retained original link','Show text and illustrations during genuine scrolling','Invite a brief read with product and attribution visible'][i],'source':str(source.relative_to(R)),'sourceInSeconds':start,'sourceOutSeconds':start+dur,'outputInSeconds':output,'outputOutSeconds':output+dur,'speed':1,'sourceInfo':info,'screenTextImage':str(graphic.relative_to(R)),'transition':'direct cut','sound':'Original synthesized score; source recording has no audio'});output+=dur
 concat=R/'raw'/mode/'concat.txt';concat.write_text(''.join("file '"+str(p)+"'\n" for p in clips))
final=R/('final.mp4' if mode=='full' else 'sample.mp4')
run([FF,'-y','-hide_banner','-threads','2','-f','concat','-safe','0','-i',str(concat),'-i',str(R/'graphics/score.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af',f'afade=t=in:st=0:d=0.4,afade=t=out:st={output-1.4}:d=1.4','-c:a','aac','-b:a','160k','-t',str(output),'-movflags','+faststart',str(final)],f'{mode}-mux.log')
(R/('storyboard.json' if mode=='full' else 'sample-storyboard.json')).write_text(json.dumps({'units':'seconds','mode':mode,'outputDuration':output,'resolution':[1920,1080],'fps':25,'shots':story},ensure_ascii=False,indent=2))
sha=hashlib.sha256(final.read_bytes()).hexdigest();(R/'evidence'/f'{mode}-render-identity.json').write_text(json.dumps({'file':str(final),'sha256':sha,'ffmpeg':FF,'duration':output,'sourceFiles':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [R/'scripts/render.py',R/'scripts/make_assets.py',R/'scripts/capture.mjs',R/'scripts/audit.mjs',R/'graphics/score.wav',*[R/'graphics'/f'shot-{i+1}.png' for i in range(len(scenes))],*[R/'raw'/mode/f'{name}.webm' for name,dur in scenes]]]},indent=2))
print(json.dumps({'file':str(final),'sha256':sha,'duration':output}))
