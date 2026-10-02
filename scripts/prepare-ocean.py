"""Process the licensed field recording into a quiet, seamless stereo loop.
Usage: python scripts/prepare-ocean.py path/to/578524_5487341-hq.mp3
Requires numpy, scipy, soundfile. No generated/synthesized audio.
"""
from pathlib import Path
import sys,json
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfiltfilt,resample_poly
source=Path(sys.argv[1]);audio,sr=sf.read(source,always_2d=True)
# Remove rumble and soften the fizzy shore wash, retaining the real stereo field.
audio=sosfiltfilt(butter(2,120,fs=sr,btype='highpass',output='sos'),audio,axis=0)
audio=sosfiltfilt(butter(2,3800,fs=sr,btype='lowpass',output='sos'),audio,axis=0)
# Choose the calmest 65 second passage, excluding the recording's endpoints.
length=65*sr
starts=range(10*sr,len(audio)-length-5*sr,5*sr)
start=min(starts,key=lambda i: np.sqrt(np.mean(audio[i:i+length]**2)))
audio=audio[start:start+length]
# A five-second equal-power wrap crossfade gives a 60-second periodic loop.
k=5*sr;t=np.linspace(0,np.pi/2,k,endpoint=False)[:,None]
join=audio[-k:]*np.cos(t)+audio[:k]*np.sin(t)
audio=np.concatenate([audio[k:-k],join])
audio=np.tanh(audio/max(3*np.sqrt(np.mean(audio**2)),1e-8))
audio*=.12/max(np.sqrt(np.mean(audio**2)),1e-8)
peak=float(np.max(np.abs(audio)))
if peak>.7:audio*=.7/peak
from math import gcd
g=gcd(sr,32000);audio=resample_poly(audio,32000//g,sr//g,axis=0,padtype="wrap")
out=Path('public/assets/audio/coast-soft.wav');sf.write(out,audio,32000,format='WAV',subtype='PCM_16')
check,rate=sf.read(out,always_2d=True)
metrics={'source_start_seconds':start/sr,'duration_seconds':len(check)/rate,'sample_rate':rate,'channels':check.shape[1],'peak':float(np.max(np.abs(check))),'rms':float(np.sqrt(np.mean(check**2))),'wrap_step':float(np.max(np.abs(check[-1]-check[0])))}
assert metrics['peak']<.85 and metrics['wrap_step']<float(np.percentile(np.abs(np.diff(check,axis=0)),99.9))
print(json.dumps(metrics,indent=2))
