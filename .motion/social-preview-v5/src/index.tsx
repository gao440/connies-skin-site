import React from 'react';
import {AbsoluteFill, Composition, Img, OffthreadVideo, Sequence, registerRoot, spring, staticFile, useCurrentFrame} from 'remotion';

// All motion is frame-driven. The closing camera, typography, and lens return
// to the opening pose. There is no recording clock, CSS animation or randomness.
const FPS = 60;
const DURATION = 600;
const C = {ink:'#173c3a', teal:'#0f6e66', mint:'#c7e8de', ivory:'#f3f7f3', soft:'#56706b'};
const clamp = (x:number) => Math.max(0, Math.min(1, x));
const ease = (x:number) => {x=clamp(x); return x*x*x*(x*(x*6-15)+10);};
const ramp = (t:number,a:number,b:number) => ease((t-a)/(b-a));
const mix = (a:number,b:number,p:number) => a+(b-a)*p;
const show = (t:number,a:number,b:number,d=.45) => ramp(t,a,a+d)*(1-ramp(t,b-d,b));
const settle = (t:number,a:number,d=.7) => spring({fps:FPS,frame:Math.max(0,(t-a)*FPS),durationInFrames:d*FPS,config:{mass:1,damping:19,stiffness:150}});

function Sun({size=24}:{size?:number}) {return <svg width={size} height={size} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="5.5" fill="currentColor"/>{Array.from({length:8},(_,i)=><path key={i} d="M16 2.5v3.2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" transform={`rotate(${i*45} 16 16)`}/>)}</svg>;}
function Moon(){return <svg width="24" height="24" viewBox="0 0 32 32"><path d="M24 22A12 12 0 0 1 12 5a12 12 0 1 0 12 17" fill="currentColor"/></svg>;}
function Arrow(){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;}

function Lens({t,detail=false}:{t:number,detail?:boolean}) {
  const phase=t/10*Math.PI*2;
  return <div style={{position:'absolute',inset:0,borderRadius:'50%',transform:`rotate(${Math.sin(phase)*9}deg)`,background:'radial-gradient(circle at 33% 22%,rgba(255,255,255,.91),rgba(255,255,255,.08) 35%,rgba(13,113,104,.12) 64%,rgba(61,147,132,.38) 92%,rgba(244,255,250,.8) 98%)',boxShadow:'inset 0 0 0 1.5px rgba(255,255,255,.9),inset 4px 7px 10px rgba(255,255,255,.8),inset -8px -13px 22px rgba(38,118,106,.18),0 23px 45px rgba(20,91,76,.09)',overflow:'hidden'}}>
    <div style={{position:'absolute',inset:'3%',borderRadius:'50%',border:'1px solid rgba(255,255,255,.7)',boxShadow:'inset 0 -6px 8px rgba(8,95,85,.1)'}}/>
    <svg viewBox="0 0 500 500" style={{width:'100%',height:'100%',position:'absolute'}}>
      <defs>
        <linearGradient id={detail?'gl2':'gl1'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="white" stopOpacity="0"/><stop offset=".42" stopColor="white" stopOpacity=".9"/><stop offset=".7" stopColor="white" stopOpacity=".1"/><stop offset="1" stopColor="#71aaa0" stopOpacity=".3"/></linearGradient>
        <filter id={detail?'gb2':'gb1'}><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <g transform={`rotate(${Math.sin(phase)*16} 250 250)`}>
        <ellipse cx="242" cy="242" rx="224" ry="220" fill="none" stroke={`url(#${detail?'gl2':'gl1'})`} strokeWidth="15" filter={`url(#${detail?'gb2':'gb1'})`}/>
        <path d="M44 222C61 72 180 21 306 46" fill="none" stroke="white" strokeWidth="5" opacity=".86" strokeLinecap="round"/>
        <path d="M79 151C122 64 224 48 292 65" fill="none" stroke="white" strokeWidth="15" opacity=".29" strokeLinecap="round" filter={`url(#${detail?'gb2':'gb1'})`}/>
        <path d="M140 437C271 497 420 410 449 283" fill="none" stroke="#6bab9b" strokeWidth="2" opacity=".4"/>
        <path d="M88 336C176 262 327 295 427 168" fill="none" stroke="white" strokeWidth="26" opacity=".13" filter={`url(#${detail?'gb2':'gb1'})`}/>
      </g>
    </svg>
    <div style={{position:'absolute',left:'11%',top:'13%',width:'43%',height:'15%',background:'linear-gradient(155deg,rgba(255,255,255,.9),transparent)',filter:'blur(7px)',transform:'rotate(-34deg)',borderRadius:'50%'}}/>
  </div>;
}

function Background({t}:{t:number}) {
 const phase=t/10*2*Math.PI;
 return <AbsoluteFill style={{background:C.ivory}}>
  <div style={{position:'absolute',inset:-180,background:'radial-gradient(ellipse at 73% 48%,#cee8df 0%,transparent 45%),radial-gradient(ellipse at 3% 95%,#e3ede1 0%,transparent 43%),linear-gradient(125deg,#fafaf4 20%,#eff5ef 60%,#d8eae1)',transform:`translate(${10*Math.sin(phase)}px,${8*Math.cos(phase)}px)`}}/>
  <svg width="1500" height="900" viewBox="0 0 1500 900" style={{position:'absolute',left:-100,top:-120,opacity:.65,transform:`translate(${12*Math.sin(phase)}px,${10*Math.cos(phase)}px)`}}>
   <defs><linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop stopColor="white" stopOpacity="0"/><stop offset=".5" stopColor="white"/><stop offset="1" stopColor="#c0dbce" stopOpacity="0"/></linearGradient><filter id="waterBlur"><feGaussianBlur stdDeviation="8"/></filter></defs>
   {[0,1,2].map(i=><path key={i} d={`M${200+i*48} -50 C${220+i*48} 250 ${760+i*60} 450 ${840+i*50} 950`} stroke="url(#water)" strokeWidth={20-i*4} fill="none" opacity={.5-i*.1} filter="url(#waterBlur)"/>)}
   <path d="M-40 680C290 430 590 880 1050 420S1600 150 1600 150" stroke="white" strokeWidth="2" opacity=".24" fill="none"/>
  </svg>
 </AbsoluteFill>;
}

function Phone({t,routine,final}:{t:number,routine:number,final:number}) {
 const zoom=show(t,2.65,6.9,.75);
 const x=818+zoom*62-final*10;
 const y=309+Math.sin(t/10*2*Math.PI)*4;
 const rotate=mix(-7,3,zoom)+final*4;
 const w=243, h=527;
 const screenChange=ramp(t,2.65,3.05)*(1-ramp(t,9.1,9.65));
 return <div style={{position:'absolute',left:x-w/2,top:y-h/2,width:w,height:h,transform:`perspective(1400px) rotateY(${mix(-12,5,zoom)}deg) rotateZ(${rotate}deg) scale(${mix(1,.93,zoom)})`,transformStyle:'preserve-3d',borderRadius:39,background:'linear-gradient(100deg,#97aaa3,#153b35 5%,#547d70 49%,#b2c5b7 98%)',padding:6,boxShadow:'12px 22px 20px rgba(24,71,52,.08),25px 42px 55px rgba(22,69,53,.17),inset 0 0 0 1px #8aa99b',opacity:1-zoom*.54}}>
   <div style={{position:'absolute',left:-3,top:116,width:3,height:41,borderRadius:2,background:'#54796b'}}/>
   <div style={{position:'absolute',left:-3,top:170,width:3,height:32,borderRadius:2,background:'#54796b'}}/>
   <div style={{width:'100%',height:'100%',borderRadius:34,overflow:'hidden',position:'relative',background:'#f5f9f8',border:'1px solid #142b25'}}>
    <Img src={staticFile(t<.35 || t>8.95?'welcome-closed.png':'welcome.png')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover'}}/>
    <Sequence from={21} durationInFrames={108} layout="none"><OffthreadVideo muted src={staticFile('welcome-reveal.mp4')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover'}}/></Sequence>
    <Img src={staticFile('routine.png')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover',transform:`translateX(${(1-screenChange)*105}%)`}}/>
    <div style={{position:'absolute',left:0,right:0,top:0,height:37,overflow:'hidden'}}><Img src={staticFile('welcome-closed.png')} style={{width:'100%',height:h,objectFit:'cover'}}/></div>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(122deg,rgba(255,255,255,.3),transparent 42%,rgba(255,255,255,.02) 80%,rgba(255,255,255,.16))',pointerEvents:'none'}}/>
   </div>
   <div style={{position:'absolute',inset:2,borderRadius:37,border:'1px solid rgba(255,255,255,.45)',pointerEvents:'none'}}/>
 </div>;
}

function ProductThumb({index,size=66}:{index:number,size?:number}) {
 // Window onto the actual product image in the approved current app capture.
 // No invented product packaging or claims are painted into the film.
 const ys=[1267,1438,1609];
 const ratio=size/132;
 return <div style={{width:size,height:size,overflow:'hidden',borderRadius:17,background:'#fff',position:'relative',border:'1px solid #e4eeeb',flexShrink:0}}><Img src={staticFile('routine.png')} style={{position:'absolute',width:1206*ratio,height:2622*ratio,maxWidth:'none',left:-246*ratio,top:-ys[index]*ratio}}/></div>;
}

function Check({p}:{p:number}) {return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={24*(1-p)}/></svg>;}

function Routine({t}:{t:number}) {
 const enter=ramp(t,2.7,3.25); const leave=ramp(t,6.15,6.85); const visible=enter*(1-leave);
 const rows=[['Cleanser','Green Plum Refreshing Cleanser'],['Moisturizer','Dynasty Cream'],['Sunscreen','Birch Juice Moisturizing Sunscreen']];
 return <div style={{position:'absolute',left:546+mix(90,0,enter)+leave*116,top:113+leave*32,width:567,opacity:visible,transform:`perspective(1400px) rotateY(${mix(-9,0,enter)+leave*8}deg) scale(${mix(.79,1,enter)-leave*.22})`,transformOrigin:'right center'}}>
  <div style={{position:'absolute',inset:-19,bottom:-20,borderRadius:34,background:'linear-gradient(140deg,rgba(255,255,255,.88),rgba(239,248,242,.7))',border:'1.5px solid rgba(255,255,255,.98)',boxShadow:'0 24px 70px rgba(24,72,55,.12),inset 0 0 0 1px rgba(77,121,100,.03)'}}/>
  <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,height:44}}>
   <div style={{display:'flex',alignItems:'center',gap:10,color:C.teal,fontSize:22,fontWeight:650}}><Sun size={26}/> Morning</div>
   <div style={{color:C.soft,fontSize:17,letterSpacing:.4}}>ILLUSTRATIVE EXAMPLE</div>
  </div>
  {rows.map((row,i)=>{
    const p=settle(t,2.95+i*.12,.72);const done=ramp(t,4.1+i*.58,4.35+i*.58);
    return <div key={i} style={{position:'relative',display:'flex',alignItems:'center',height:99,marginBottom:11,padding:'13px 18px',gap:15,background:'rgba(255,255,255,.95)',borderRadius:22,border:'1px solid rgba(191,218,204,.55)',boxShadow:`0 ${mix(18,6,p)}px ${mix(25,15,p)}px rgba(33,92,67,.055)`,opacity:clamp(p),transform:`translate(${(1-p)*(50+i*14)}px,${(1-p)*32}px) scale(${mix(.94,1,p)})`}}>
     <div style={{width:31,height:31,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#e5f3ed',color:C.teal,fontSize:17,fontWeight:600,flexShrink:0}}>{i+1}</div>
     <ProductThumb index={i}/>
     <div style={{minWidth:0,flex:1}}><div style={{fontSize:24,fontWeight:650,letterSpacing:-.4,color:C.ink}}>{row[0]}</div><div style={{fontSize:16,color:C.soft,marginTop:5,whiteSpace:'nowrap'}}>{row[1]}</div></div>
     <div style={{width:32,height:32,flexShrink:0,borderRadius:'50%',border:`1.5px solid ${done>.01?C.teal:'#cedfd7'}`,background:done>.01?C.teal:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transform:`scale(${1+Math.sin(done*Math.PI)*.15})`}}><Check p={done}/></div>
    </div>;
  })}
  <div style={{position:'relative',display:'flex',alignItems:'center',gap:8,color:C.soft,fontSize:17,marginTop:20,opacity:ramp(t,3.65,4)}}><span style={{width:6,height:6,borderRadius:'50%',background:C.teal}}/> A place for the products you already own.</div>
 </div>;
}

function Title({t,start,end,lines,sub,initial=false}:{t:number,start:number,end:number,lines:string[],sub:string,initial?:boolean}) {
 const coming=initial?1:ramp(t,start,start+.48);
 const going=ramp(t,end-.42,end);
 const returnP=initial?ramp(t,9.05,9.65):0;
 const opacity=initial?Math.max(1-going,returnP):coming*(1-going);
 const pos=initial?(t>8.9?18*(1-returnP):-18*going):24*(1-coming)-18*going;
 return <div style={{position:'absolute',left:69,top:185,opacity,transform:`translateY(${pos}px)`,filter:`blur(${(1-opacity)*5}px)`}}>
  {lines.map((line,i)=><div key={line} style={{fontFamily:'Georgia,serif',fontSize:74,lineHeight:1.08,fontWeight:400,letterSpacing:-3.9,color:i===1?C.teal:C.ink,transform:`translateY(${initial?0:(1-ramp(t,start+i*.06,start+.45+i*.06))*12}px)`,whiteSpace:'nowrap'}}>{line}</div>)}
  <div style={{fontSize:22,color:C.soft,marginTop:25,letterSpacing:-.35,lineHeight:1.45,maxWidth:403}}>{sub}</div>
 </div>;
}

const Film:React.FC=()=>{
 const f=useCurrentFrame(); const t=f/FPS;
 const routine=show(t,2.65,6.9,.75); const final=show(t,6.1,9.55,.65);
 const phase=t/10*2*Math.PI;
 const lensX=mix(849,296,routine),lensY=mix(319,681,routine),lensS=mix(470,590,routine);
 const badge=show(t,.65,2.6,.4);
 return <AbsoluteFill style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif',color:C.ink,overflow:'hidden'}}>
  <Background t={t}/>
  <div style={{position:'absolute',left:lensX-lensS/2,top:lensY-lensS/2,width:lensS,height:lensS,opacity:mix(.8,.46,routine),transform:`scale(${1+Math.sin(phase)*.016})`}}><Lens t={t}/></div>
  <div style={{position:'absolute',left:64,top:46,display:'flex',alignItems:'center',gap:12}}><Img src={staticFile('icon.webp')} style={{width:39,height:39,borderRadius:11,boxShadow:'0 4px 12px rgba(23,75,59,.1)'}}/><span style={{fontSize:27,fontWeight:600,letterSpacing:-1.1}}>connie’s skin</span></div>
  <Title t={t} start={0} end={2.68} initial lines={['Get to know','your skin.']} sub="Find your starting point."/>
  <Title t={t} start={2.72} end={6.15} lines={['A routine,','in order.']} sub="One step. Then the next."/>
  <Title t={t} start={6.25} end={8.98} lines={['Make it','your own.']} sub="Your products. Your daily rhythm."/>
  <Phone t={t} routine={routine} final={final}/>
  <div style={{position:'absolute',left:1001,top:435,width:68,height:68,transform:`translate(${Math.sin(phase)*5}px,${Math.cos(phase)*7}px)`,opacity:(1-routine)*.7}}><Lens t={t} detail/></div>
  <div style={{position:'absolute',left:601,top:407,opacity:badge,transform:`translateY(${(1-badge)*18}px)`,display:'flex',alignItems:'center',gap:10,padding:'13px 20px',borderRadius:50,background:'rgba(255,255,255,.87)',border:'1px solid white',boxShadow:'0 9px 30px rgba(30,82,56,.09)',fontSize:19,color:C.teal}}><span style={{width:7,height:7,borderRadius:'50%',background:C.teal}}/> Made around you</div>
  <Routine t={t}/>
  <div style={{position:'absolute',left:638,top:446,display:'flex',gap:10,opacity:final,transform:`translateY(${(1-final)*18}px)`}}>
   <div style={{padding:'14px 18px',borderRadius:19,background:'rgba(255,255,255,.94)',boxShadow:'0 10px 25px rgba(30,82,56,.10)',border:'1px solid white',display:'flex',alignItems:'center',gap:10,fontSize:19,color:C.teal}}><Sun/> Morning</div>
   <div style={{padding:'14px 18px',borderRadius:19,background:'#173c3a',boxShadow:'0 10px 25px rgba(30,82,56,.10)',display:'flex',alignItems:'center',gap:10,fontSize:19,color:'#e5f2e9'}}><Moon/> Evening</div>
  </div>
  <div style={{position:'absolute',left:70,top:476,display:'flex',alignItems:'center',gap:12,padding:'14px 21px',borderRadius:32,background:C.teal,color:'#fff',fontSize:20,opacity:final,transform:`translateY(${(1-final)*15}px)`}}>Join the waitlist <Arrow/></div>
  <div style={{position:'absolute',left:70,bottom:47,display:'flex',alignItems:'center',gap:11,fontSize:18,color:C.soft}}><div style={{width:25,height:1,background:'#91b2a5'}}/> connieskin.com</div>
  <div style={{position:'absolute',right:67,bottom:49,display:'flex',gap:6}}>{[0,1,2].map((v)=><div key={v} style={{height:3,width:v===1?30:18,borderRadius:2,background:C.teal,opacity:v===0?1-ramp(t,2.5,3)+ramp(t,9,9.8):v===1?routine:final}}/>)}</div>
 </AbsoluteFill>;
};

registerRoot(()=> <Composition id="ConniePreview" component={Film} durationInFrames={DURATION} fps={FPS} width={1200} height={630}/>);
