// Browser + OpenAI adapters share one cancellation and speech-state contract.
export class Voice {
  constructor(onState) { this.onState=onState; this.epoch=0; this.audio=null; this.abort=null; }
  cancel() { this.epoch++; this.abort?.abort(); this.abort=null; window.speechSynthesis?.cancel(); if(this.audio){this.audio.pause();this.audio=null;} this.onState(false); }
  async speak(text,provider='browser') {
    this.cancel(); const epoch=this.epoch;
    if(provider==='off')return;
    if(provider==='openai') {
      try {this.abort=new AbortController();const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:this.abort.signal});if(!response.ok)throw Error('TTS failed');const url=URL.createObjectURL(await response.blob());if(epoch!==this.epoch){URL.revokeObjectURL(url);return;}const audio=new Audio(url);this.audio=audio;audio.onplaying=()=>this.onState(true);audio.onended=audio.onerror=()=>{URL.revokeObjectURL(url);if(epoch===this.epoch)this.onState(false);};await audio.play();return;
      }catch(error){if(epoch!==this.epoch)return;console.warn('OpenAI voice unavailable; falling back to browser speech.');}
    }
    if(!window.speechSynthesis){this.onState(false);return;}
    const utterance=new SpeechSynthesisUtterance(text);utterance.rate=1.05;utterance.pitch=1.15;
    utterance.onstart=()=>{if(epoch===this.epoch)this.onState(true);};utterance.onend=utterance.onerror=()=>{if(epoch===this.epoch)this.onState(false);};window.speechSynthesis.speak(utterance);
  }
}
export function animateAvatar(img,wrap) {
 let emotion='idle',speaking=false,mouth=false;
 function render(){img.src=`/assets/${speaking?(mouth?'speaking':'idle'):emotion}.png`;wrap?.classList.toggle('speaking',speaking);}
 setInterval(()=>{if(speaking){mouth=!mouth;render();}},160);
 return {emotion(value){emotion=['idle','laughing','thinking'].includes(value)?value:'idle';render();},speaking(value){speaking=value;render();}};
}
