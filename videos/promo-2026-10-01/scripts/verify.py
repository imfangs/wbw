from pathlib import Path
import subprocess,json,hashlib,re
R=Path(__file__).resolve().parents[1];FF='/opt/homebrew/Caskroom/miniforge/base/bin/ffmpeg';FP='/opt/homebrew/Caskroom/miniforge/base/bin/ffprobe';media=R/'final.mp4';ev=R/'evidence'
sha=hashlib.sha256(media.read_bytes()).hexdigest();report={'file':str(media),'sha256':sha,'commands':{}}
commands={'ffprobe':[FP,'-v','error','-show_streams','-show_format','-of','json',str(media)],'decode':[FF,'-v','error','-threads','2','-i',str(media),'-f','null','-'],'visual-detect':[FF,'-hide_banner','-threads','2','-i',str(media),'-vf','blackdetect=d=0.15:pix_th=0.10,freezedetect=n=-55dB:d=1','-an','-f','null','-'],'audio-detect':[FF,'-hide_banner','-threads','2','-i',str(media),'-af','silencedetect=n=-45dB:d=0.5,ebur128=peak=true','-vn','-f','null','-']}
for name,cmd in commands.items():
 p=subprocess.run(cmd,capture_output=True,text=True);(ev/(name+'.json' if name=='ffprobe' else name+'.log')).write_text(p.stdout+p.stderr);report['commands'][name]={'command':cmd,'exitCode':p.returncode};p.check_returncode()
 if name=='visual-detect':report['visualEvents']=[x for x in p.stderr.splitlines() if 'black_' in x or 'freeze_' in x]
 if name=='audio-detect':report['silenceEvents']=[x for x in p.stderr.splitlines() if 'silence_' in x];report['audioSummary']=p.stderr[p.stderr.rfind('Summary:'):]
frames=[.12,3.5,6.88,7.12,10,12.88,13.12,16,18.88,19.12,23,26.88,27.12,29.5,30.88]
for t in frames:subprocess.run([FF,'-v','error','-threads','2','-ss',str(t),'-i',str(media),'-frames:v','1','-update','1',str(R/'review'/f'frame-{t:05.2f}.png')],check=True)
subprocess.run([FF,'-v','error','-threads','2','-ss','4.8','-i',str(media),'-frames:v','1','-update','1',str(R/'poster.jpg')],check=True)
report['reviewFrameSeconds']=frames;report['posterSeconds']=4.8;report['posterSHA256']=hashlib.sha256((R/'poster.jpg').read_bytes()).hexdigest();(ev/'media-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
