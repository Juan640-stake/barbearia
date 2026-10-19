(function(){
'use strict';

/* ---------- dados da barbearia (dá para trocar pelo link: ?nome=...&end=...&insta=...&zap=...&cidade=...&cor=...) ---------- */
var CFG={nome:'Barbearia',end:'Rua Exemplo, 123, Centro',insta:'',zap:'(85) 98888-0000',cidade:'Fortaleza',cor:'',pin:'1234'};
(function(){
  try{
    var q=new URLSearchParams(location.search);
    ['nome','end','insta','zap','cidade','cor'].forEach(function(k){var v=q.get(k);if(v&&v.trim())CFG[k]=v.trim().slice(0,80)});
  }catch(e){}
  CFG.insta=CFG.insta.replace(/^@/,'');
  document.title=CFG.nome+' | Agendamento';
  document.getElementById('brand').textContent=CFG.nome;
  var c=CFG.cor.replace(/^#?/,'#');
  if(/^#[0-9a-fA-F]{6}$/.test(c)){
    var r=document.documentElement.style;
    r.setProperty('--accent',c);
    r.setProperty('--accent-soft','color-mix(in srgb,'+c+' 14%,var(--surface))');
    document.querySelector('meta[name="theme-color"]').content=c;
  }
})();

var DIAS=['dom','seg','ter','qua','qui','sex','sáb'];
var KEY='barbearia-demo-v5';
var SVCS=[
  {id:'corte',nome:'Corte',min:30,desc:'Máquina e tesoura, com acabamento'},
  {id:'barba',nome:'Barba',min:30,desc:'Toalha quente e navalha'},
  {id:'combo',nome:'Corte e barba',min:60,desc:'O pacote completo'},
  {id:'sobrancelha',nome:'Sobrancelha',min:30,desc:'Rapidinho e bem feito'}
];
var STATUS={pendente:['p-await','Aguardando confirmação'],confirmado:['p-paid','Confirmado']};
var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function pad(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
function today(){var t=new Date();t.setHours(0,0,0,0);return t}
function hm(i){var t=540+i*30;return pad(Math.floor(t/60))+':'+pad(t%60)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function nSlots(d){var w=d.getDay();return w===0?0:(w===6?14:20)}
function dayLabel(ds){var d=parse(ds);return cap(DIAS[d.getDay()])+', '+d.getDate()+'/'+pad(d.getMonth()+1)}
function when(b){var d=parse(b.date);d.setHours(9+Math.floor(b.start/2),(b.start%2)*30,0,0);return d}
function canCancel(b){return when(b)-new Date()>=2*3600*1000}

function waNum(p){var d=String(p||'').replace(/\D/g,'');return d.length<=11?'55'+d:d}
function waLink(phone,msg){return 'https://wa.me/'+waNum(phone)+'?text='+encodeURIComponent(msg)}
function bookMsg(b){
  var sv=svcById(b.svc);
  return 'Olá! Quero agendar na '+CFG.nome+':\n'+sv.nome+'\n'+dayLabel(b.date)+' às '+hm(b.start)+'\nNome: '+b.name;
}

/* ---------- dados ---------- */
function seed(){
  var t=today(),list=[],n=1;
  function add(off,slot,svc,name,status){
    var d=addDays(t,off);
    if(d.getDay()===0)return;
    var len=svcById(svc).min/30;
    if(slot+len>nSlots(d))return;
    list.push({id:'s'+n,date:ymd(d),start:slot,slots:len,svc:svc,name:name,phone:'(85) 99999-00'+pad(n++),status:status});
  }
  add(0,2,'corte','Rafael M.','confirmado');
  add(0,9,'combo','Diego S.','confirmado');
  add(1,0,'corte','Lucas A.','confirmado');
  add(1,3,'combo','Thiago P.','pendente');
  add(1,10,'barba','Mateus C.','pendente');
  add(1,14,'corte','Felipe R.','confirmado');
  add(2,1,'corte','André L.','pendente');
  add(2,4,'combo','Bruno F.','confirmado');
  add(2,12,'barba','Gustavo N.','confirmado');
  add(3,2,'corte','Caio B.','pendente');
  return {day:ymd(t),bookings:list,blocks:{},zap:CFG.zap,mine:null,profile:{name:'',phone:''}};
}
function load(){
  try{
    var r=localStorage.getItem(KEY);
    if(r){var s=JSON.parse(r);if(s&&s.bookings&&s.day===ymd(today()))return s}
  }catch(e){}
  return seed();
}
function svcById(id){return SVCS.filter(function(s){return s.id===id})[0]}
var S=load();
try{if(new URLSearchParams(location.search).get('zap'))S.zap=CFG.zap}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

function mine(){return S.bookings.filter(function(b){return b.id===S.mine&&b.status!=='cancelado'})[0]}

function dayMap(ds){
  var d=parse(ds),n=nSlots(d),m=[],i;
  for(i=0;i<n;i++)m.push({s:'free'});
  [6,7].forEach(function(k){if(m[k])m[k]={s:'lunch'}});
  (S.blocks[ds]||[]).forEach(function(k){if(m[k]&&m[k].s==='free')m[k]={s:'blocked'}});
  S.bookings.filter(function(b){return b.date===ds&&b.status!=='cancelado'}).forEach(function(b){
    for(var k=0;k<b.slots;k++){if(m[b.start+k])m[b.start+k]={s:'booked',b:b,head:k===0}}
  });
  var now=new Date();
  if(ds===ymd(now)){
    var cur=(now.getHours()*60+now.getMinutes()-540)/30;
    for(i=0;i<n;i++){if(i<cur&&m[i].s==='free')m[i]={s:'past'}}
  }
  return m;
}
function fits(m,i,n){for(var k=0;k<n;k++){if(!m[i+k]||m[i+k].s!=='free')return false}return true}
function firstOpenFree(){
  for(var i=0;i<10;i++){
    var d=addDays(today(),i);
    if(nSlots(d)>0&&dayMap(ymd(d)).some(function(c){return c.s==='free'}))return ymd(d);
  }
  return ymd(today());
}
function firstOpen(){
  for(var i=0;i<10;i++){var d=addDays(today(),i);if(nSlots(d)>0)return ymd(d)}
  return ymd(today());
}

var ui={tab:'agendar',step:1,svc:null,date:firstOpenFree(),slot:null,name:S.profile.name||'',phone:S.profile.phone||'',
        bdate:firstOpen(),confirm:null,askReset:false,setOpen:false,unlocked:false};

/* ---------- peças de tela ---------- */
function dayChips(sel,act){
  var h='<div class="dayswrap"><button class="darr l" data-act="dscroll" data-v="-1" aria-label="Dias anteriores">‹</button>'+
        '<button class="darr r" data-act="dscroll" data-v="1" aria-label="Próximos dias">›</button>'+
        '<div class="days" role="group" aria-label="Escolher o dia">';
  for(var i=0;i<10;i++){
    var d=addDays(today(),i),ds=ymd(d),closed=d.getDay()===0;
    var lab=i===0?'hoje':(i===1?'amanhã':DIAS[d.getDay()]);
    h+='<button class="day" data-act="'+act+'" data-v="'+ds+'" aria-pressed="'+(sel===ds)+'"'+(closed?' disabled':'')+'>'+
       '<small>'+lab+'</small><strong>'+d.getDate()+'</strong></button>';
  }
  return h+'</div></div>';
}
function pill(status){var s=STATUS[status];return '<span class="pill '+s[0]+'">'+s[1]+'</span>'}

function hero(){
  var now=new Date(),n=nSlots(now),min=now.getHours()*60+now.getMinutes(),close=540+n*30;
  var open=n>0&&min>=540&&min<close;
  var st=open?'Aberto agora, fecha às '+hm(n)
            :(n>0&&min<540?'Fechado, abre hoje às 09:00':'Fechado agora');
  var h='<div class="hero"><span class="open '+(open?'on':'off')+'">'+st+'</span>'+
        '<p>'+esc(CFG.end)+'</p><p>Seg a sex, 9h às 19h. Sáb, 9h às 16h.</p><div class="actions">'+
        '<a class="btn sm ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(CFG.end+', '+CFG.cidade)+'">Como chegar</a>';
  if(CFG.insta)h+='<a class="btn sm ghost" target="_blank" rel="noopener" href="https://instagram.com/'+encodeURIComponent(CFG.insta)+'">Instagram</a>';
  h+='<a class="btn sm ghost" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,'Olá! Vim pelo site da '+CFG.nome+'.'))+'">WhatsApp</a></div></div>';
  return h;
}

function stepHead(){
  return '<div class="stephead">'+(ui.step>1?'<button class="back" data-act="back">‹ Voltar</button>':'<span></span>')+
         '<span class="stepname">Etapa '+ui.step+' de 3</span></div>'+
         '<div class="prog" aria-hidden="true"><i style="width:'+Math.round(ui.step/3*100)+'%"></i></div>';
}

function vAgendar(){
  var sv=ui.svc?svcById(ui.svc):null;
  if(!sv)ui.step=1;
  var h=stepHead();
  if(ui.step===1){
    h=hero()+h+'<section class="sec"><h2 class="h">Qual serviço você quer?</h2><p class="lead">Escolha o serviço e o horário. A confirmação vai pelo WhatsApp.</p><div class="list">';
    SVCS.forEach(function(s){
      h+='<button class="opt" data-act="svc" data-v="'+s.id+'" aria-pressed="'+(ui.svc===s.id)+'"><b>'+s.nome+'</b><span class="price">'+s.min+' min</span><span class="sub">'+s.desc+'</span></button>';
    });
    h+='</div></section>';
  }else if(ui.step===2){
    h+='<section class="sec"><h2 class="h">Escolha o dia e o horário</h2><p class="lead">'+sv.nome+', '+sv.min+' min.</p>'+dayChips(ui.date,'date');
    var m=dayMap(ui.date),n=sv.min/30,free=0,out='';
    [['Manhã',0,6],['Tarde',8,20]].forEach(function(g){
      var btns='';
      for(var i=g[1];i<g[2]&&i<m.length;i++){
        if(m[i].s==='lunch')continue;
        var ok=fits(m,i,n);if(ok)free++;
        btns+='<button class="slot" data-act="slot" data-v="'+i+'" aria-pressed="'+(ui.slot===i)+'"'+(ok?'':' disabled')+'>'+hm(i)+'</button>';
      }
      if(btns)out+='<h3 class="grp">'+g[0]+'</h3><div class="slots">'+btns+'</div>';
    });
    h+=free?out+'<p class="hint">Horários riscados já estão ocupados. Almoço das 12h às 13h.</p>'
            :'<p class="notice warn">Não há horário livre neste dia para '+sv.nome.toLowerCase()+'. Escolha outro dia.</p>';
    h+='</section>';
  }else{
    h+='<section class="sec"><h2 class="h">Quase lá</h2><p class="lead">Confira e diga quem vai ser atendido.</p>'+
       '<div class="list"><div class="kv"><span>Serviço</span><b>'+sv.nome+'</b></div><div class="kv"><span>Dia</span><b>'+dayLabel(ui.date)+'</b></div>'+
       '<div class="kv"><span>Horário</span><b>'+hm(ui.slot)+' às '+hm(ui.slot+sv.min/30)+'</b></div></div>'+
       '<label class="field"><span>Seu nome</span><input type="text" id="f-name" autocomplete="name" placeholder="Como você se chama" value="'+esc(ui.name)+'"></label>'+
       '<label class="field"><span>WhatsApp com DDD</span><input type="tel" inputmode="tel" id="f-phone" autocomplete="tel" placeholder="(00) 00000-0000" value="'+esc(ui.phone)+'"></label>'+
       '<p class="hint">Ao confirmar, o WhatsApp abre com a mensagem pronta para a barbearia.</p></section>';
  }
  return h;
}

function updateBar(){
  var bar=document.getElementById('bar'),el=document.getElementById('barin');
  var show=ui.tab==='agendar'&&ui.step>1&&ui.svc;
  bar.hidden=!show;
  if(!show||!el)return;
  var sv=svcById(ui.svc);
  if(ui.step===2){
    var ok=ui.slot!=null;
    el.innerHTML='<div class="bar-sum"><b>'+(ok?dayLabel(ui.date)+' às '+hm(ui.slot):'Escolha um horário')+'</b><span>'+sv.nome+'</span></div>'+
                 '<button class="btn" data-act="next"'+(ok?'':' disabled')+'>Continuar</button>';
  }else{
    var okName=ui.name.trim().length>=2,okPhone=ui.phone.replace(/\D/g,'').length>=10;
    var miss=!okName?'Digite seu nome':(!okPhone?'Digite seu WhatsApp com DDD':'');
    el.innerHTML='<div class="bar-sum"><b>'+sv.nome+' às '+hm(ui.slot)+'</b><span>'+(miss||dayLabel(ui.date))+'</span></div>'+
                 '<button class="btn" data-act="book"'+(miss?' disabled':'')+'>Confirmar</button>';
  }
}

function ticketTop(b,sv){
  return '<div class="tk"><div class="tk-name"><span>'+sv.nome+'</span>'+pill(b.status)+'</div>'+
         '<div class="tk-when"><strong>'+hm(b.start)+'</strong><span>'+dayLabel(b.date)+'<br>até '+hm(b.start+b.slots)+'</span></div></div>';
}

function vEnviado(){
  var b=mine();
  if(!b){ui.tab='meu';return vMeu()}
  var sv=svcById(b.svc);
  return '<div class="okhead"><span class="check">'+CHECK+'</span><h2 class="h">Horário reservado</h2><p class="lead" style="margin:0">Agora é só mandar a mensagem para a barbearia.</p></div>'+
    '<div class="ticket">'+ticketTop(b,sv)+'</div>'+
    '<div class="stack"><a class="btn block" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,bookMsg(b)))+'">Enviar no WhatsApp</a>'+
    '<button class="btn ghost block" data-act="go" data-v="meu">Ver meu horário</button></div>'+
    '<p class="hint">Se o WhatsApp não abriu sozinho, toque em "Enviar no WhatsApp".</p>';
}

function vMeu(){
  var b=mine();
  if(!b){
    return '<section class="sec"><h2 class="h">Meu horário</h2><p class="lead">Você ainda não tem horário marcado.</p>'+
           '<button class="btn block" data-act="go" data-v="agendar">Agendar agora</button></section>';
  }
  var sv=svcById(b.svc),past=when(b)<new Date(),can=canCancel(b);
  var h='<section class="sec"><h2 class="h">Meu horário</h2><p class="lead">'+esc(b.name)+'</p>'+
    '<div class="ticket">'+ticketTop(b,sv)+'<div class="perf"></div><div class="tk">';
  if(b.status==='pendente'){
    h+='<div>A barbearia vai confirmar pelo WhatsApp.</div><div class="actions"><a class="btn ghost" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,bookMsg(b)))+'">Mandar mensagem de novo</a></div>';
  }else{
    h+='<div>Horário confirmado. Até lá!</div>';
  }
  h+='</div></div>';
  var cancelMsg='Olá! Preciso cancelar meu horário de '+dayLabel(b.date)+' às '+hm(b.start)+' ('+sv.nome.toLowerCase()+'). Nome: '+b.name;
  if(past){
    h+='<p class="hint">Esse horário já passou.</p>';
  }else if(ui.confirm==='mine'){
    h+='<h3 class="sub-h">Cancelar este horário?</h3><p class="muted" style="margin:0">O WhatsApp abre para você avisar a barbearia.</p>'+
       '<div class="actions"><a class="btn danger" data-act="cancelyes" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,cancelMsg))+'">Sim, cancelar</a><button class="btn ghost" data-act="cancelno">Manter</button></div>';
  }else if(can){
    h+='<div class="actions"><button class="btn ghost" data-act="remarcar">Remarcar</button><button class="btn danger" data-act="cancelask">Cancelar horário</button></div>'+
       '<p class="hint">Dá para cancelar ou remarcar até 2 horas antes.</p>';
  }else{
    h+='<p class="notice warn">Faltam menos de 2 horas. Para mudar agora, fale com a barbearia.</p>'+
       '<div class="actions"><a class="btn ghost" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,'Olá! Preciso falar sobre o meu horário de '+dayLabel(b.date)+' às '+hm(b.start)+'.'))+'">Chamar no WhatsApp</a></div>';
  }
  return h+'</section>';
}

function vLock(){
  return '<section class="sec lock"><h2 class="h">Área do barbeiro</h2><p class="lead">Digite a senha para ver a agenda.</p>'+
         '<input type="tel" inputmode="numeric" id="pin" maxlength="4" autocomplete="off" aria-label="Senha" placeholder="••••">'+
         '<p class="hint">Na demonstração, a senha é '+CFG.pin+'.</p></section>';
}

function vPainel(){
  if(!ui.unlocked)return vLock();
  var ds=ui.bdate,m=dayMap(ds);
  var wk=0,t0=ymd(today()),t7=ymd(addDays(today(),7));
  S.bookings.forEach(function(b){if(b.status!=='cancelado'&&b.date>=t0&&b.date<t7)wk++});
  var list=S.bookings.filter(function(b){return b.date===ds&&b.status!=='cancelado'});
  var ok=list.filter(function(b){return b.status==='confirmado'}).length;
  var h='<section class="sec"><h2 class="h">Agenda do dia</h2><p class="lead">'+dayLabel(ds)+'</p>'+
    '<div class="week"><span>Próximos 7 dias</span><span><b>'+wk+'</b> clientes marcados</span></div>'+dayChips(ds,'bdate')+
    '<div class="stats"><div><strong>'+list.length+'</strong><span>Clientes</span></div>'+
    '<div><strong>'+ok+'</strong><span>Confirmados</span></div>'+
    '<div><strong>'+(list.length-ok)+'</strong><span>A confirmar</span></div></div><div class="agenda">';
  var rows='';
  m.forEach(function(c,i){
    if(c.s==='past')return;
    if(c.s==='lunch'){
      if(i===6)rows+='<div class="row lunch"><div class="time">'+hm(i)+'</div><div class="what">Almoço</div></div>';
      return;
    }
    if(c.s==='booked'){
      if(!c.head)return;
      var b=c.b,sv=svcById(b.svc);
      rows+='<div class="row"><div class="time">'+hm(i)+'</div><div><div class="who"><b>'+esc(b.name)+'</b>'+pill(b.status)+'</div>'+
         '<div class="meta">'+sv.nome+', até '+hm(b.start+b.slots)+'</div><div class="actions">';
      if(ui.confirm===b.id){
        rows+='<span class="muted" style="align-self:center;font-size:14px">Cancelar este horário?</span>'+
           '<button class="btn sm danger" data-act="bcancel" data-v="'+b.id+'">Sim, cancelar</button><button class="btn sm ghost" data-act="bno">Voltar</button>';
      }else{
        if(b.status==='pendente'){
          var okMsg='Olá '+b.name+'! Aqui é da '+CFG.nome+'. Seu horário está confirmado: '+dayLabel(b.date)+' às '+hm(b.start)+' ('+sv.nome.toLowerCase()+'). Até lá!';
          rows+='<a class="btn sm" data-act="confirm" data-v="'+b.id+'" target="_blank" rel="noopener" href="'+esc(waLink(b.phone,okMsg))+'">Confirmar</a>';
        }else if(b.phone){
          rows+='<a class="btn sm ghost" target="_blank" rel="noopener" href="'+esc(waLink(b.phone,'Olá '+b.name+'! Aqui é da '+CFG.nome+'. Lembrando do seu horário: '+dayLabel(b.date)+' às '+hm(b.start)+' ('+sv.nome.toLowerCase()+'). Até lá!'))+'">Lembrar no WhatsApp</a>';
        }
        rows+='<button class="btn sm ghost" data-act="bask" data-v="'+b.id+'">Cancelar</button>';
      }
      rows+='</div></div></div>';
      return;
    }
    if(c.s==='blocked'){
      rows+='<div class="row free"><div class="time">'+hm(i)+'</div><div class="what"><span>Bloqueado</span><button class="btn sm ghost" data-act="unblock" data-v="'+i+'">Liberar</button></div></div>';
      return;
    }
    rows+='<div class="row free"><div class="time">'+hm(i)+'</div><div class="what"><span>Livre</span><button class="btn sm ghost" data-act="block" data-v="'+i+'">Bloquear</button></div></div>';
  });
  h+=(rows||'<div class="empty">Nada para mostrar neste dia.</div>')+'</div></section>';

  h+='<details class="set" id="cfg"'+(ui.setOpen?' open':'')+'><summary>Configurações da barbearia</summary>'+
     '<label class="field"><span>WhatsApp da barbearia (recebe os agendamentos)</span><input type="tel" inputmode="tel" id="set-zap" value="'+esc(S.zap)+'"></label>'+
     '</details>';

  h+='<div class="reset">';
  if(ui.askReset){
    h+='<h3 class="sub-h">Voltar ao início da demonstração?</h3><p class="muted" style="margin:0">Apaga o que você marcou e traz os exemplos de novo.</p>'+
       '<div class="actions"><button class="btn danger" data-act="rdo">Sim, reiniciar</button><button class="btn ghost" data-act="rno">Voltar</button></div>';
  }else{
    h+='<button class="btn ghost block" data-act="rask">Reiniciar demonstração</button>';
  }
  h+='<button class="btn ghost block" style="margin-top:10px" data-act="lock">Sair do painel</button></div>';
  return h;
}

/* ---------- tela ---------- */
function render(keep){
  var y=window.scrollY,dEl=document.querySelector('.days'),dx=dEl?dEl.scrollLeft:0;
  var tabOf=ui.tab==='enviado'?'meu':ui.tab;
  ['agendar','meu','painel'].forEach(function(t){
    var b=document.getElementById('t-'+t);
    if(t===tabOf)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  var html;
  if(ui.tab==='agendar')html=vAgendar();
  else if(ui.tab==='enviado')html=vEnviado();
  else if(ui.tab==='painel')html=vPainel();
  else html=vMeu();
  document.getElementById('main').innerHTML=html;
  updateBar();
  window.scrollTo(0,keep===false?0:y);
  dEl=document.querySelector('.days');
  if(dEl){
    var sel=dEl.querySelector('[aria-pressed="true"]');
    dEl.scrollLeft=keep===false&&sel?sel.offsetLeft-dEl.clientWidth/2+sel.offsetWidth/2:dx;
  }
}

/* arrastar a fileira de dias com o mouse */
var drag=null;
document.addEventListener('pointerdown',function(e){
  var el=e.target.closest('.days');
  if(!el||e.pointerType!=='mouse')return;
  drag={el:el,x:e.clientX,left:el.scrollLeft,moved:false};
});
document.addEventListener('pointermove',function(e){
  if(!drag)return;
  var dx=e.clientX-drag.x;
  if(Math.abs(dx)>5){drag.moved=true;drag.el.classList.add('drag')}
  if(drag.moved)drag.el.scrollLeft=drag.left-dx;
});
document.addEventListener('pointerup',function(){
  if(!drag)return;
  var el=drag.el;drag=null;
  setTimeout(function(){el.classList.remove('drag')},0);
});
var tt;
function toast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('on');
  clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2200);
}

/* ---------- ações ---------- */
function byId(id){return S.bookings.filter(function(b){return b.id===id})[0]}
function book(){
  var sv=svcById(ui.svc);if(!sv||ui.slot==null)return;
  var m=dayMap(ui.date);
  if(!fits(m,ui.slot,sv.min/30)){toast('Esse horário acabou de ser ocupado');ui.slot=null;ui.step=2;render(false);return}
  var b={id:'b'+Date.now(),date:ui.date,start:ui.slot,slots:sv.min/30,svc:sv.id,name:ui.name.trim(),phone:ui.phone.trim(),status:'pendente'};
  S.bookings.push(b);S.mine=b.id;S.profile={name:ui.name.trim(),phone:ui.phone.trim()};
  save();ui.slot=null;ui.svc=null;ui.step=1;ui.tab='enviado';render(false);
  window.open(waLink(S.zap,bookMsg(b)),'_blank','noopener');
}
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-act],[data-tab]');
  if(!t||t.disabled)return;
  if(t.dataset.tab){ui.tab=t.dataset.tab;ui.confirm=null;ui.askReset=false;render(false);return}
  var a=t.dataset.act,v=t.dataset.v,b;
  switch(a){
    case 'svc':
      ui.svc=v;
      if(ui.slot!=null&&!fits(dayMap(ui.date),ui.slot,svcById(v).min/30))ui.slot=null;
      ui.step=2;render(false);break;
    case 'back':ui.step=Math.max(1,ui.step-1);render(false);break;
    case 'next':ui.step=3;render(false);break;
    case 'date':ui.date=v;ui.slot=null;render();break;
    case 'slot':ui.slot=Number(v);render();break;
    case 'book':book();break;
    case 'go':
      ui.tab=v;ui.confirm=null;
      if(v==='agendar'){ui.step=1;ui.svc=null;ui.slot=null}
      render(false);break;
    case 'cancelask':ui.confirm='mine';render();break;
    case 'cancelno':ui.confirm=null;render();break;
    case 'cancelyes':
      b=mine();if(b){b.status='cancelado';save()}
      ui.confirm=null;toast('Horário cancelado');setTimeout(render,0);break;
    case 'remarcar':
      b=mine();
      if(b){b.status='cancelado';save();ui.svc=b.svc;ui.name=S.profile.name||ui.name;ui.phone=S.profile.phone||ui.phone}
      ui.date=firstOpenFree();ui.slot=null;ui.step=2;ui.tab='agendar';toast('Escolha o novo horário');render(false);break;
    case 'dscroll':
      var row=t.parentNode.querySelector('.days');
      row.scrollBy({left:Number(v)*row.clientWidth*0.7,behavior:'smooth'});break;
    case 'bdate':ui.bdate=v;ui.confirm=null;render();break;
    case 'confirm':b=byId(v);if(b){b.status='confirmado';save();toast('Horário confirmado')}setTimeout(render,0);break;
    case 'bask':ui.confirm=v;render();break;
    case 'bno':ui.confirm=null;render();break;
    case 'bcancel':b=byId(v);if(b){b.status='cancelado';save();toast('Horário liberado')}ui.confirm=null;render();break;
    case 'block':
      (S.blocks[ui.bdate]=S.blocks[ui.bdate]||[]).push(Number(v));save();render();break;
    case 'unblock':
      S.blocks[ui.bdate]=(S.blocks[ui.bdate]||[]).filter(function(x){return x!==Number(v)});save();render();break;
    case 'lock':ui.unlocked=false;render(false);break;
    case 'rask':ui.askReset=true;render();break;
    case 'rno':ui.askReset=false;render();break;
    case 'rdo':
      S=seed();save();ui.svc=null;ui.slot=null;ui.step=1;ui.date=firstOpenFree();ui.bdate=firstOpen();ui.name='';ui.phone='';ui.askReset=false;ui.confirm=null;
      toast('Demonstração reiniciada');render();break;
  }
});
document.addEventListener('input',function(e){
  var id=e.target.id;
  if(id==='f-name'){ui.name=e.target.value;updateBar()}
  else if(id==='f-phone'){ui.phone=e.target.value;updateBar()}
  else if(id==='pin'){
    if(e.target.value===CFG.pin){ui.unlocked=true;toast('Bem-vindo');render(false)}
    else if(e.target.value.length>=4){e.target.value='';toast('Senha incorreta')}
  }
  else if(id==='set-zap'){S.zap=e.target.value;save()}
});
document.addEventListener('toggle',function(e){if(e.target&&e.target.id==='cfg')ui.setOpen=e.target.open},true);

render(false);
})();
