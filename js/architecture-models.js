(function(){
  var $=function(id){return document.getElementById(id)};
  var peak=$('rf-peak'), bw=$('rf-bw'), intensity=$('rf-int');
  function roof(){
    if(!peak||!bw||!intensity)return;
    var p=+peak.value, b=+bw.value, i=+intensity.value, ridge=p*1000/b;
    var x=function(v){return 75+(Math.log2(v/.25)/8)*605};
    var y=function(v){return 270-Math.log10(v/.005)/Math.log10(8/.005)*230};
    var roof=$('rf-roof'), band=$('rf-band'), dot=$('rf-dot');
    var knee=Math.max(.25,Math.min(64,ridge));
    roof.setAttribute('d','M'+x(.25)+' '+y(Math.min(p,.25*b/1000))+' L'+x(knee)+' '+y(Math.min(p,knee*b/1000))+' L'+x(64)+' '+y(Math.min(p,64*b/1000)));
    band.setAttribute('d','M'+x(.25)+' 270 L'+x(.25)+' '+y(Math.min(p,.25*b/1000))+' L'+x(knee)+' '+y(Math.min(p,knee*b/1000))+' L'+x(knee)+' 270 Z');
    $('rf-ridge').style.display=ridge<.25||ridge>64?'none':'';$('rf-ridge').setAttribute('x1',x(knee));$('rf-ridge').setAttribute('x2',x(knee));
    $('rf-ridge-label').setAttribute('x',Math.min(650,Math.max(110,x(knee))));$('rf-ridge-label').setAttribute('y',52);$('rf-ridge-label').textContent='ridge '+ridge.toFixed(1)+' FLOP/Byte'+(ridge<.25||ridge>64?'（图外）':'');
    var perf=Math.min(p,i*b/1000);dot.setAttribute('cx',x(i));dot.setAttribute('cy',y(perf));
    $('rf-point-label').setAttribute('x',Math.min(600,x(i)+10));$('rf-point-label').setAttribute('y',y(perf)-12);$('rf-point-label').textContent=perf.toPrecision(3)+' TFLOP/s 上界';
    $('rf-peak-out').textContent=p.toFixed(1)+' TFLOP/s';$('rf-bw-out').textContent=b+' GB/s';$('rf-int-out').textContent=i.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+' FLOP/Byte';
    $('rf-result').textContent='当前工作负载的 Roofline 上界约为 '+perf.toPrecision(3)+' TFLOP/s，受'+(i<ridge?'带宽':'计算')+'屋顶限制。ridge point ≈ '+ridge.toFixed(1)+' FLOP/Byte。';
  }
  [peak,bw,intensity].forEach(function(el){el&&el.addEventListener('input',roof)});
  var ams=$('am-s'), amk=$('am-k');
  function amdahl(){if(!ams||!amk)return;var s=+ams.value,k=+amk.value,sp=1/(s+(1-s)/k),limit=s?1/s:Infinity;
    $('am-s-out').textContent=Math.round(s*100)+'%';$('am-k-out').textContent=k+'×';
    $('am-serial').style.flexBasis=(s*100)+'%';$('am-parallel').style.flexBasis=((1-s)*100)+'%';
    $('am-result').textContent='整体加速比约 '+sp.toFixed(2)+'×；即使可加速部分无限快，上限仍是 '+(isFinite(limit)?limit.toFixed(2)+'×':'无限大')+'。';
  }
  [ams,amk].forEach(function(el){el&&el.addEventListener('input',amdahl)});
  document.querySelectorAll('[data-reset="roofline"]').forEach(function(button){button.addEventListener('click',function(){peak.value=1;bw.value=200;intensity.value=8;roof()})});
  var mb=$('mem-bw'), ml=$('mem-lat'), mn=$('mem-n'), ms=$('mem-size');
  function mem(){
    if(!mb||!ml||!mn||!ms)return;
    var B=+mb.value,L=+ml.value,N=+mn.value,S=+ms.value;
    var bdp=B*L, have=N*S, ach=Math.min(B,N*S/L), util=B?ach/B*100:0;
    var fmt=function(v){return v>=1000?(v/1000).toFixed(1)+' KB':v.toFixed(0)+' B'};
    $('mem-bw-out').textContent=B+' GB/s';
    $('mem-lat-out').textContent=L+' ns';
    $('mem-n-out').textContent=N;
    $('mem-size-out').textContent=S+' B';
    $('mem-bdp-bar').style.width='100%';
    $('mem-have-bar').style.width=Math.min(100,have/bdp*100)+'%';
    $('mem-bdp-out').textContent=fmt(bdp);
    $('mem-have-out').textContent=fmt(have);
    $('mem-result').textContent='保持 '+B+' GB/s 需要约 '+fmt(bdp)+' 在途；当前 '+N+' 个请求提供 '+fmt(have)+'，可达带宽约 '+ach.toFixed(1)+' GB/s（'+util.toFixed(0)+'%）。'+(have<bdp?'增加在途请求或每次请求的字节数，才可能填满这条链路。':'在途数据已足够，继续增加并发不会突破带宽上限。');
  }
  [mb,ml,mn,ms].forEach(function(el){el&&el.addEventListener('input',mem)});
  mem();
  var mlPeak=$('ml-peak'), mlInt=$('ml-int'), mlPreset=$('ml-preset');
  var mlLevels={l1:2000,l2:800,llc:300,hbm:100};
  var mlNames={l1:'L1',l2:'L2',llc:'LLC',hbm:'HBM'};
  var mlReuse={stream:[1,1,1,1],llc:[1,1,1,16],l2:[1,1,8,64]};
  var mlActive='hbm';
  function mlX(v){return 75+Math.log2(v/.25)/15*600}
  function mlY(v){return 280-Math.log10(v/.005)/Math.log10(24/.005)*240}
  function mlRoof(){
    if(!mlPeak||!mlInt||!mlPreset)return;
    var p=+mlPeak.value, I=+mlInt.value, ratios=mlReuse[mlPreset.value];
    var best=p, limits=[], rows=[];
    Object.keys(mlLevels).forEach(function(k,index){
      var b=mlLevels[k], knee=p*1000/b, path;
      var x0=.25, x1=8192;
      if(knee<=x0){path='M'+mlX(x0)+' '+mlY(p)+' L'+mlX(x1)+' '+mlY(p)}
      else if(knee>=x1){path='M'+mlX(x0)+' '+mlY(x0*b/1000)+' L'+mlX(x1)+' '+mlY(x1*b/1000)}
      else{path='M'+mlX(x0)+' '+mlY(x0*b/1000)+' L'+mlX(knee)+' '+mlY(p)+' L'+mlX(x1)+' '+mlY(p)}
      var el=$('ml-roof-'+k);el.setAttribute('d',path);el.classList.toggle('is-active',k===mlActive);
      var layerI=I*ratios[index], perf=Math.min(p,layerI*b/1000);
      best=Math.min(best,perf);limits.push({key:k,perf:perf});
      var dot=$('ml-dot-'+k);dot.setAttribute('cx',mlX(layerI));dot.setAttribute('cy',mlY(perf));
      dot.setAttribute('r',k===mlActive?7:4);dot.setAttribute('aria-label',mlNames[k]+': I='+layerI+', 上界 '+perf.toPrecision(3)+' TFLOP/s');
      rows.push('<tr><th scope="row">'+mlNames[k]+'</th><td>'+(1000/layerI).toFixed(3)+'</td><td>'+layerI.toFixed(2)+'</td><td>'+perf.toPrecision(3)+'</td></tr>');
      if(k===mlActive){
        var label=$('ml-point-label');label.setAttribute('x',Math.min(460,mlX(layerI)+10));label.setAttribute('y',mlY(perf)-12);label.textContent=mlNames[k]+' '+perf.toPrecision(3)+' TFLOP/s';
      }
    });
    $('ml-flows').innerHTML=rows.join('');
    $('ml-peak-out').textContent=p.toFixed(1)+' TFLOP/s';$('ml-int-out').textContent=I.toFixed(2)+' FLOP/Byte';
    var bound=best===p?'计算峰值':limits.filter(function(l){return Math.abs(l.perf-best)<1e-10}).map(function(l){return mlNames[l.key]}).join(' / ');
    $('ml-result').textContent='各层使用 I=W/Q，简化整体上界为 '+best.toPrecision(3)+' TFLOP/s，限制项：'+bound+'。'+(mlPreset.value==='stream'?'当前假设各层流量相同，适合比较带宽上界；不代表所有真实程序。':'缓存复用减少下层流量，因此四层工作点的横坐标不同。');
  }
  [mlPeak,mlInt,mlPreset].forEach(function(el){el&&el.addEventListener('input',mlRoof)});
  document.querySelectorAll('#multi-roofline-lab [data-level]').forEach(function(btn){btn.addEventListener('click',function(){mlActive=btn.dataset.level;document.querySelectorAll('#multi-roofline-lab [data-level]').forEach(function(b){b.setAttribute('aria-pressed',String(b===btn))});mlRoof()})});
  if(mlPeak) mlRoof();
  var ah=$('amat-hit'), amr=$('amat-miss'), ap=$('amat-penalty');
  function amat(){
    if(!ah||!amr||!ap)return;
    var h=+ah.value,m=+amr.value,p=+ap.value,cost=m*p,total=h+cost;
    $('amat-hit-val').textContent=h.toFixed(1)+' ns';
    $('amat-miss-val').textContent=(m*100).toFixed(1)+'%';
    $('amat-pen-val').textContent=p+' ns';
    $('amat-hit-cost').textContent=h.toFixed(1)+' ns';
    $('amat-miss-cost').textContent=cost.toFixed(1)+' ns';
    $('amat-hit-bar').style.width=(h/total*100)+'%';
    $('amat-miss-bar').style.width=(cost/total*100)+'%';
    $('amat-result').textContent='AMAT = '+h.toFixed(1)+' ns + '+(m*100).toFixed(1)+'% × '+p+' ns = '+total.toFixed(2)+' ns；缺失代价占 '+(cost/total*100).toFixed(0)+'%。';
  }
  [ah,amr,ap].forEach(function(el){el&&el.addEventListener('input',amat)});
  if(ah) amat();
  var archMap=document.querySelector('.arch-map');
  if(archMap){
    var mapNotes={roofline:'Roofline：计算单元、缓存与内存带宽共同决定屋顶。',amdahl:'Amdahl：多核或专用单元加速，串行路径决定上限。',cpi:'CPI：前端供给、执行端口与缓存停顿共同累积周期。',bdp:'BDP / Little：MSHR、队列与 NoC credit 决定在途请求。'};
    var mapButtons=document.querySelectorAll('.arch-map-picker [data-map]');
    function mapSelect(key){
      archMap.dataset.mapActive=key;
      var targets={roofline:'.am-gpu,.am-matrix,.am-mem,.am-cache',amdahl:'.am-cpu',cpi:'.am-cpu',bdp:'.am-mem,.am-noc'};
      document.querySelectorAll('.arch-map .am-block,.arch-map .am-core,.arch-map .am-tag').forEach(function(el){el.style.opacity='.25';el.style.strokeWidth='1.2'});
      document.querySelectorAll(targets[key]||'').forEach(function(el){el.style.opacity='1';el.style.strokeWidth='2.5'});
      mapButtons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.map===key))});
      var note=$('map-note');if(note)note.textContent=mapNotes[key]||'';
    }
    mapButtons.forEach(function(b){b.addEventListener('click',function(){mapSelect(b.dataset.map)})});
    mapSelect('roofline');
  }
  roof();amdahl();
})();
