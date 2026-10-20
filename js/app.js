(function(){
'use strict';

/* Duas páginas usam este arquivo: index.html (cliente) e painel/index.html (barbeiro, com senha). */
var PAGE=document.body.getAttribute('data-page')||'cliente';
/* DBON: com o banco ligado (js/db.js + chaves em js/config.js) os dados vêm e vão para o Supabase. Sem isso, é a demonstração local. */
var DBON=!!(window.DB&&window.DB.on);
var KEY=DBON?'barbearia-dados-v1':'barbearia-demo-v7',LINKKEY='barbearia-link',LOCKKEY='barbearia-painel';
var DIAS=['dom','seg','ter','qua','qui','sex','sáb'];
var DIAS_LONGOS=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
var STATUS={pendente:['p-await','Aguardando confirmação'],confirmado:['p-paid','Confirmado']};
var PAID={enviado:['p-sent','Pix enviado'],pago:['p-paid','Pago']};
var CHEV='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
var SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var IC={
  map:SVG+'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  insta:'<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".3" stop-color="#FA7E1E"/><stop offset=".55" stop-color="#D62976"/><stop offset=".8" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs>'+
        '<g fill="none" stroke="url(#ig)" stroke-width="2.2"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.4"/></g><circle cx="17.6" cy="6.4" r="1.4" fill="url(#ig)"/></svg>',
  zap:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>'
};

/* ---------- configuração: js/config.js, que o link pode trocar ---------- */
var CFG=(function(){
  var c=Object.assign({nome:'Barbearia',slogan:'',tema:'',endereco:'',cidade:'',instagram:'',whatsapp:'',pix:'',cor:'',logo:'',fotos:[],barbeiros:[],senha:'1234',demo:false,servicos:[]},window.BARBEARIA||{});
  var LINK={nome:'nome',end:'endereco',cidade:'cidade',insta:'instagram',zap:'whatsapp',pix:'pix',cor:'cor',logo:'logo',barbeiros:'barbeiros',demo:'demo'};
  var got=null;
  try{
    var q=new URLSearchParams(location.search),p={};
    Object.keys(LINK).forEach(function(k){var v=q.get(k);if(v&&v.trim())p[k]=v.trim().slice(0,300)});
    if(Object.keys(p).length){got=p;localStorage.setItem(LINKKEY,JSON.stringify(p))}
    else got=JSON.parse(localStorage.getItem(LINKKEY)||'null');
  }catch(e){}
  if(got)Object.keys(got).forEach(function(k){
    if(!LINK[k])return;
    var v=got[k];
    if(k==='barbeiros')v=v.split(',').map(function(s){return s.trim()}).filter(Boolean);
    if(k==='demo')v=v!=='0';
    c[LINK[k]]=v;
  });
  c.instagram=String(c.instagram||'').replace(/^@/,'');
  return c;
})();
var PROS=CFG.barbeiros.length?CFG.barbeiros:[''];
var MULTI=PROS.length>1;

function applyBrand(){
  document.title=CFG.nome+(PAGE==='painel'?' | Painel':' | Agendamento');
  document.getElementById('brand').textContent=CFG.nome;
  var am=document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(am)am.content=CFG.nome;
  if(CFG.tema==='escuro'||CFG.tema==='claro')document.documentElement.setAttribute('data-theme',CFG.tema==='escuro'?'dark':'light');
  if(CFG.logo){
    var img=new Image();
    img.className='logoimg';img.alt='';
    img.onload=function(){var mk=document.querySelector('.mark');if(mk)mk.replaceWith(img)};
    img.src=CFG.logo;
  }
  var c=String(CFG.cor||'').replace(/^#?/,'#');
  if(/^#[0-9a-fA-F]{6}$/.test(c)){
    var r=document.documentElement.style,n=parseInt(c.slice(1),16);
    var lum=(0.299*(n>>16)+0.587*(n>>8&255)+0.114*(n&255))/255;
    r.setProperty('--accent',c);
    r.setProperty('--accent-ink',lum>0.6?'#12141D':'#FFFFFF');
    r.setProperty('--accent-soft','color-mix(in srgb,'+c+' 14%,var(--surface))');
    document.querySelector('meta[name="theme-color"]').content=c;
  }
  var tag=document.getElementById('demo');
  if(tag)tag.hidden=!CFG.demo;
}
applyBrand();

function pad(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
function today(){var t=new Date();t.setHours(0,0,0,0);return t}
function hm(i){var t=540+i*30;return pad(Math.floor(t/60))+':'+pad(t%60)}
function money(v){return v?v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):''}
function money0(v){return 'R$ '+Math.round(v).toLocaleString('pt-BR')}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function nSlots(d){var w=d.getDay();return w===0?0:(w===6?14:20)}
function dayLabel(ds){var d=parse(ds);return cap(DIAS[d.getDay()])+', '+d.getDate()+'/'+pad(d.getMonth()+1)}
function shortDate(ds){var d=parse(ds);return d.getDate()+'/'+pad(d.getMonth()+1)}
function when(b){var d=parse(b.date);d.setHours(9+Math.floor(b.start/2),(b.start%2)*30,0,0);return d}
function canCancel(b){return when(b)-new Date()>=2*3600*1000}
function firstName(s){return String(s).split(' ')[0]}

function waNum(p){var d=String(p||'').replace(/\D/g,'');return d.length<=11?'55'+d:d}
function waLink(phone,msg){return 'https://wa.me/'+waNum(phone)+'?text='+encodeURIComponent(msg)}

/* ---------- Pix (chave + valor, sem ligação com banco) ---------- */
function tlv(id,val){return id+pad(val.length)+val}
function crc16(str){
  var c=0xFFFF;
  for(var i=0;i<str.length;i++){
    c^=str.charCodeAt(i)<<8;
    for(var j=0;j<8;j++){c=(c&0x8000)?((c<<1)^0x1021):(c<<1);c&=0xFFFF}
  }
  return c.toString(16).toUpperCase().padStart(4,'0');
}
function normKey(k){
  k=String(k||'').trim();
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k))return k.toLowerCase();
  if(/^[\d\s()+\-]+$/.test(k)){
    var d=k.replace(/\D/g,'');
    var fmt=/[\s()+\-]/.test(k);
    if(fmt||d.length>=12){return '+'+((d.indexOf('55')===0&&d.length>=12)?d:'55'+d)}
  }
  return k;
}
function pixText(s,n){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').toUpperCase().trim().slice(0,n)||'BARBEARIA'}
function pixPayload(key,amount){
  var mai=tlv('00','BR.GOV.BCB.PIX')+tlv('01',key);
  var p=tlv('00','01')+tlv('01','11')+tlv('26',mai)+tlv('52','0000')+tlv('53','986')+
        tlv('54',amount.toFixed(2))+tlv('58','BR')+tlv('59',pixText(CFG.nome,25))+tlv('60',pixText(CFG.cidade||'BRASIL',15))+tlv('62',tlv('05','***'));
  p+='6304';
  return p+crc16(p);
}
function pixTest(){return !CFG.pix&&!S.pixEdited}
var PIXTESTE='00000000-0000-0000-0000-000000000000';
function clientUrl(){try{var u=new URL(PAGE==='painel'?'../':'./',location.href);return u.href}catch(e){return location.href}}
function proLabel(p){return p?'com '+p:''}

/* ---------- dados ---------- */
function seed(){
  var t=today(),list=[],n=1;
  var CLI=[['Rafael M.','(85) 99999-0101'],['Diego S.','(85) 99999-0102'],['Lucas A.','(85) 99999-0103'],['Thiago P.','(85) 99999-0104'],
           ['Mateus C.','(85) 99999-0105'],['Felipe R.','(85) 99999-0106'],['André L.','(85) 99999-0107'],['Bruno F.','(85) 99999-0108'],
           ['Gustavo N.','(85) 99999-0109'],['Caio B.','(85) 99999-0110'],['Pedro H.','(85) 99999-0111'],['João V.','(85) 99999-0112']];
  function add(off,slot,si,ci,status,pi,paid){
    var d=addDays(t,off),sv=CFG.servicos[si%CFG.servicos.length];
    if(!sv||d.getDay()===0)return;
    var len=Math.max(1,Math.round(sv.min/30));
    if(slot+len>nSlots(d))return;
    list.push({id:'s'+(n++),date:ymd(d),start:slot,slots:len,svc:sv.id,pro:PROS[(pi||0)%PROS.length],name:CLI[ci][0],phone:CLI[ci][1],status:status,
               pay:paid==='enviado'?'pix':'local',paid:off<0?'pago':(paid||'')});
  }
  /* histórico, para a lista de clientes */
  add(-62,3,0,7,'confirmado');add(-55,4,2,10,'confirmado');add(-47,2,0,0,'confirmado');add(-40,5,2,4,'confirmado');
  add(-38,10,0,11,'confirmado');add(-33,10,0,8,'confirmado');add(-26,4,2,1,'confirmado');add(-19,2,0,0,'confirmado');
  add(-12,9,1,6,'confirmado');add(-8,3,0,2,'confirmado');add(-4,12,2,5,'confirmado');
  /* próximos dias */
  add(0,2,0,0,'confirmado',0,'pago');add(0,9,2,1,'confirmado',1,'pago');
  add(1,0,0,2,'confirmado',0,'pago');add(1,3,2,3,'pendente',1,'enviado');add(1,10,1,4,'pendente',0);add(1,14,0,5,'confirmado',1);
  add(2,1,0,6,'pendente',0,'enviado');add(2,12,1,8,'confirmado',1);
  add(3,2,0,9,'pendente',0);
  return {day:ymd(t),bookings:list,blocks:{},zap:CFG.whatsapp,pix:CFG.pix||PIXTESTE,prices:{},mine:null,profile:{name:'',phone:''}};
}
function blank(){return {day:ymd(today()),bookings:[],blocks:{},zap:CFG.whatsapp,pix:CFG.pix||PIXTESTE,prices:{},mine:null,profile:{name:'',phone:''}}}
function load(){
  try{
    var r=localStorage.getItem(KEY);
    if(r){
      var s=JSON.parse(r);
      /* com o banco, o aparelho guarda só quem é o cliente (WhatsApp). A agenda vem do servidor. */
      if(DBON){var b0=blank();b0.me=s.me||null;b0.profile=s.profile||b0.profile;return b0}
      if(s&&s.bookings&&s.day===ymd(today()))return s;
    }
  }catch(e){}
  return DBON?blank():seed();
}
var S=load();
S.prices=S.prices||{};
if(!S.me&&S.profile&&S.profile.phone)S.me=S.profile.phone;
S.bookings.forEach(function(b){if(PROS.indexOf(b.pro)<0)b.pro=PROS[0]});
S.pix=S.pix||CFG.pix||PIXTESTE;
if(!DBON)try{
  var q0=new URLSearchParams(location.search);
  if(q0.get('zap'))S.zap=CFG.whatsapp;
  if(q0.get('pix'))S.pix=CFG.pix;
}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(DBON?{me:S.me,profile:S.profile}:S))}catch(e){}}

function svcs(){return CFG.servicos.map(function(s){var o=S.prices[s.id];return Object.assign({},s,{preco:typeof o==='number'?o:(s.preco||0)})})}
function svcById(id){var l=svcs();return l.filter(function(s){return s.id===id})[0]||l[0]}
function len(sv){return Math.max(1,Math.round(sv.min/30))}
function mine(){return S.bookings.filter(function(b){return b.id===S.mine&&b.status!=='cancelado'})[0]}
/* o cliente é identificado pelo WhatsApp que informou ao agendar */
function digits(p){return String(p||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'')}
function myBookings(){
  var me=digits(S.me);
  if(!me)return [];
  return S.bookings.filter(function(b){return b.status!=='cancelado'&&digits(b.phone)===me}).sort(function(a,b){return when(a)-when(b)});
}
function byId(id){return S.bookings.filter(function(b){return b.id===id})[0]}

function dayMap(ds,pro){
  var d=parse(ds),n=nSlots(d),m=[],i;
  for(i=0;i<n;i++)m.push({s:'free'});
  [6,7].forEach(function(k){if(m[k])m[k]={s:'lunch'}});
  (S.blocks[pro+'|'+ds]||[]).forEach(function(k){if(m[k]&&m[k].s==='free')m[k]={s:'blocked'}});
  S.bookings.filter(function(b){return b.date===ds&&b.pro===pro&&b.status!=='cancelado'}).forEach(function(b){
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
/* devolve o barbeiro livre naquele horário ('*' = qualquer um), ou null */
function freePro(ds,i,n,want){
  var list=want==='*'?PROS:[want];
  for(var k=0;k<list.length;k++){if(fits(dayMap(ds,list[k]),i,n))return list[k]}
  return null;
}
function firstOpenFree(){
  for(var i=0;i<10;i++){
    var d=addDays(today(),i),ds=ymd(d);
    if(nSlots(d)>0&&PROS.some(function(p){return dayMap(ds,p).some(function(c){return c.s==='free'})}))return ds;
  }
  return ymd(today());
}
function firstOpen(){
  for(var i=0;i<10;i++){var d=addDays(today(),i);if(nSlots(d)>0)return ymd(d)}
  return ymd(today());
}
function isUnlocked(){try{return sessionStorage.getItem(LOCKKEY)==='1'}catch(e){return false}}

var ui={tab:'agendar',step:1,svc:null,pro:MULTI?'*':PROS[0],date:firstOpenFree(),slot:null,name:S.profile.name||'',phone:S.profile.phone||'',
        pay:'local',sheet:false,bdate:firstOpen(),bpro:PROS[0],ptab:'agenda',lookup:'',lookupMiss:false,confirm:null,askReset:false,setOpen:false,unlocked:DBON?false:isUnlocked(),
        loaded:!DBON,loadErr:false,busy:false,booting:DBON&&PAGE==='painel',email:'',pass:'',loginErr:''};

/* ---------- peças de tela ---------- */
function dayChips(sel,act){
  var h='<div class="days" role="group" aria-label="Escolher o dia">';
  for(var i=0;i<10;i++){
    var d=addDays(today(),i),ds=ymd(d),closed=d.getDay()===0;
    var lab=i===0?'hoje':(i===1?'amanhã':DIAS[d.getDay()]);
    h+='<button class="day" data-act="'+act+'" data-v="'+ds+'" aria-pressed="'+(sel===ds)+'"'+(closed?' disabled':'')+'>'+
       '<small>'+lab+'</small><strong>'+d.getDate()+'</strong></button>';
  }
  return h+'</div>';
}
function chips(act,items,sel){
  var h='<div class="chips" role="group">';
  items.forEach(function(it){h+='<button class="chip" data-act="'+act+'" data-v="'+esc(it[0])+'" aria-pressed="'+(sel===it[0])+'">'+esc(it[1])+'</button>'});
  return h+'</div>';
}
function pill(status){var s=STATUS[status];return '<span class="pill '+s[0]+'">'+s[1]+'</span>'}
function paidPill(p){var s=PAID[p];return s?'<span class="pill '+s[0]+'">'+s[1]+'</span>':''}

function openState(){
  var now=new Date(),n=nSlots(now),min=now.getHours()*60+now.getMinutes();
  if(n&&min>=540&&min<540+n*30)return {on:true,txt:'Aberto até '+hm(n).replace(':00','h')};
  if(n&&min<540)return {on:false,txt:'Abre hoje às 9h'};
  for(var i=1;i<8;i++){var d=addDays(today(),i);if(nSlots(d))return {on:false,txt:'Abre '+(i===1?'amanhã':DIAS_LONGOS[d.getDay()])+' às 9h'}}
  return {on:false,txt:'Fechado'};
}
function iconLink(href,label,icon,cls){return '<a class="ib'+(cls?' '+cls:'')+'" target="_blank" rel="noopener" href="'+esc(href)+'">'+icon+'<span>'+label+'</span></a>'}
function hero(){
  var st=openState(),maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(CFG.endereco+(CFG.cidade?', '+CFG.cidade:''));
  var h='<div class="hero"><p class="hstat"><span class="open '+(st.on?'on':'off')+'">'+st.txt+'</span></p>'+
        '<p class="hours"><span>Seg a sex 9h–19h</span> · <span>Sáb 9h–16h</span></p>';
  if(CFG.endereco)h+='<p class="addr">'+esc(CFG.endereco)+(CFG.cidade?', '+esc(CFG.cidade):'')+'</p>';
  h+='<div class="hbtns">';
  if(CFG.endereco)h+=iconLink(maps,'Como chegar',IC.map);
  h+=iconLink('https://instagram.com/'+(CFG.instagram?encodeURIComponent(CFG.instagram):''),'Instagram',IC.insta);
  if(S.zap)h+=iconLink(waLink(S.zap,'Olá! Vim pelo site da '+CFG.nome+'.'),'WhatsApp',IC.zap,'zap');
  return h+'</div></div>';
}
function capa(){
  if(!CFG.logo&&!CFG.slogan)return '';
  var parts=CFG.nome.split(' '),last=parts.pop();
  var selo='<div class="selo" aria-hidden="true"><small>Barbearia</small><strong>'+esc(parts.join(' '))+(parts.length?'<i>·</i>':'')+esc(last)+'</strong>'+(CFG.slogan?'<small>'+esc(CFG.slogan)+'</small>':'')+'</div>';
  return '<div class="capa'+(CFG.logo?'':' nologo')+'">'+
    (CFG.logo?'<img src="'+esc(CFG.logo)+'" alt="'+esc(CFG.nome)+'" onerror="this.parentNode.classList.add(\'nologo\')">':'')+selo+
    (CFG.slogan?'<p class="slogan">'+esc(CFG.slogan)+'</p>':'')+'</div>';
}
function fotos(){
  if(!CFG.fotos||!CFG.fotos.length)return '';
  return '<div class="fotos">'+CFG.fotos.map(function(f){return '<img src="'+esc(f)+'" alt="Foto da '+esc(CFG.nome)+'" loading="lazy">'}).join('')+'</div>';
}

/* ---------- página do cliente ---------- */
function bookMsg(b){
  var sv=svcById(b.svc),l=['Olá! Quero agendar na '+CFG.nome+':','Serviço: '+sv.nome+(sv.preco?' ('+money(sv.preco)+')':'')];
  if(MULTI)l.push('Barbeiro: '+b.pro);
  l.push('Dia: '+dayLabel(b.date)+' às '+hm(b.start),'Nome: '+b.name);
  if(sv.preco)l.push('Pagamento: '+(b.paid==='enviado'?'Pix, já enviei':(b.paid==='pago'?'pago':'na barbearia')));
  return l.join('\n');
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
    h+='<section class="sec"><h2 class="h">Nossos serviços</h2><p class="lead">Selecione o serviço desejado para ver os horários disponíveis. A confirmação do agendamento é enviada pelo WhatsApp.</p><div class="list">';
    svcs().forEach(function(s){
      h+='<button class="opt" data-act="svc" data-v="'+esc(s.id)+'"><b>'+esc(s.nome)+'</b><span class="price">'+money(s.preco)+'</span><span class="sub">'+esc(s.desc||'')+(s.desc?' · ':'')+s.min+' min</span></button>';
    });
    h+='</div></section>';
  }else if(ui.step===2){
    h+='<section class="sec"><h2 class="h">Escolha o dia e o horário</h2><p class="lead">'+esc(sv.nome)+', '+sv.min+' min.</p>';
    if(MULTI)h+='<h3 class="grp" style="margin-top:0">Com quem?</h3>'+chips('pro',[['*','Sem preferência']].concat(PROS.map(function(p){return [p,p]})),ui.pro);
    h+=dayChips(ui.date,'date');
    if(DBON&&!ui.loaded){
      return h+'<p class="hint">'+(ui.loadErr?'Não foi possível carregar os horários. Confira a internet.':'Carregando horários...')+'</p>'+
             (ui.loadErr?'<div class="actions"><button class="btn ghost" data-act="retry">Tentar de novo</button></div>':'')+'</section>';
    }
    var m=dayMap(ui.date,PROS[0]),n=len(sv),free=0,out='';
    [['Manhã',0,6],['Tarde',8,20]].forEach(function(g){
      var btns='';
      for(var i=g[1];i<g[2]&&i<m.length;i++){
        if(m[i].s==='lunch')continue;
        var ok=freePro(ui.date,i,n,ui.pro)!=null;if(ok)free++;
        btns+='<button class="slot" data-act="slot" data-v="'+i+'" aria-pressed="'+(ui.slot===i)+'"'+(ok?'':' disabled')+'>'+hm(i)+'</button>';
      }
      if(btns)out+='<h3 class="grp">'+g[0]+'</h3><div class="slots">'+btns+'</div>';
    });
    h+=free?out+'<p class="hint">Horários riscados já estão ocupados. Almoço das 12h às 13h.</p>'
            :'<p class="notice warn">Não há horário livre neste dia para '+esc(sv.nome.toLowerCase())+'. Escolha outro dia.</p>';
    h+='</section>';
  }else{
    h+='<section class="sec"><h2 class="h">Quase lá</h2><p class="lead">Confira e diga quem vai ser atendido.</p>'+
       summary(sv)+
       '<label class="field"><span>Seu nome</span><input type="text" id="f-name" autocomplete="name" placeholder="Como você se chama" value="'+esc(ui.name)+'"></label>'+
       '<label class="field"><span>WhatsApp com DDD</span><input type="tel" inputmode="tel" id="f-phone" autocomplete="tel" placeholder="(00) 00000-0000" value="'+esc(ui.phone)+'"></label>'+
       (sv.preco?'<h3 class="grp">Como quer pagar?</h3>'+payChips():'')+
       '<p class="notice">Você pode cancelar ou remarcar até 2 horas antes, em "Meu horário". Depois disso, só falando com a barbearia.</p>'+
       '<p class="hint">'+(ui.pay==='pix'&&sv.preco?'Ao confirmar, aparece o Pix para pagar.':'Ao confirmar, o WhatsApp abre com a mensagem pronta para a barbearia.')+'</p></section>';
  }
  return h;
}
function payChips(){return chips('pay',[['local','Na barbearia'],['pix','Pix agora']],ui.pay)}
function summary(sv){
  var pro=ui.slot!=null?freePro(ui.date,ui.slot,len(sv),ui.pro):null;
  return '<div class="list"><div class="kv"><span>Serviço</span><b>'+esc(sv.nome)+'</b></div>'+
    (MULTI?'<div class="kv"><span>Barbeiro</span><b>'+esc(ui.pro==='*'?(pro||'Sem preferência'):ui.pro)+'</b></div>':'')+
    '<div class="kv"><span>Dia</span><b>'+dayLabel(ui.date)+'</b></div>'+
    '<div class="kv"><span>Horário</span><b>'+(ui.slot!=null?hm(ui.slot)+' às '+hm(ui.slot+len(sv)):'A escolher')+'</b></div>'+
    (sv.preco?'<div class="kv"><span>Valor</span><b>'+money(sv.preco)+'</b></div>':'')+'</div>';
}
/* barra de baixo: tocar no resumo sobe o que a pessoa escolheu */
function updateBar(){
  var bar=document.getElementById('bar'),el=document.getElementById('barin');
  if(!bar)return;
  var show=ui.tab==='agendar'&&ui.step>1&&ui.svc;
  bar.hidden=!show;
  if(!show){ui.sheet=false;return}
  var sv=svcById(ui.svc),price=sv.preco?', '+money(sv.preco):'',top,sub,btn;
  if(ui.step===2){
    var ok=ui.slot!=null;
    top=ok?dayLabel(ui.date)+' às '+hm(ui.slot):'Escolha um horário';sub=esc(sv.nome)+price;
    btn='<button class="btn" data-act="next"'+(ok?'':' disabled')+'>Continuar</button>';
  }else{
    var okName=ui.name.trim().length>=2,okPhone=ui.phone.replace(/\D/g,'').length>=10;
    var miss=!okName?'Digite seu nome':(!okPhone?'Digite seu WhatsApp com DDD':'');
    top=esc(sv.nome)+' às '+hm(ui.slot);sub=miss||dayLabel(ui.date)+price;
    btn='<button class="btn" data-act="book"'+(miss?' disabled':'')+'>'+(ui.pay==='pix'&&sv.preco?'Ir para o Pix':'Confirmar')+'</button>';
  }
  el.innerHTML=(ui.sheet?'<div class="sheet"><h3 class="sub-h">Seu agendamento</h3>'+summary(sv)+(sv.preco?'<h3 class="grp">Como quer pagar?</h3>'+payChips():'')+'</div>':'')+
    '<div class="bar-row"><button class="bar-sum" data-act="sheet" aria-expanded="'+ui.sheet+'" aria-label="Ver o que escolhi"><b>'+top+CHEV+'</b><span>'+sub+'</span></button>'+btn+'</div>';
}
function ticketTop(b,sv){
  return '<div class="tk"><div class="tk-name"><span>'+esc(sv.nome)+(MULTI?' <span class="muted">'+esc(proLabel(b.pro))+'</span>':'')+'</span><span class="pills">'+pill(b.status)+(b.paid?paidPill(b.paid):'')+'</span></div>'+
         '<div class="tk-when"><strong>'+hm(b.start)+'</strong><span>'+dayLabel(b.date)+'<br>até '+hm(b.start+b.slots)+'</span></div></div>';
}
function vEnviado(){
  var b=mine();
  if(!b){ui.tab='meu';return vMeu()}
  return '<div class="okhead"><span class="check">'+CHECK+'</span><h2 class="h">Horário reservado</h2><p class="lead" style="margin:0">Agora é só mandar a mensagem para a barbearia.</p></div>'+
    '<div class="ticket">'+ticketTop(b,svcById(b.svc))+'</div>'+
    '<div class="stack"><a class="btn block" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,bookMsg(b)))+'">Enviar no WhatsApp</a>'+
    '<button class="btn ghost block" data-act="go" data-v="meu">Ver meu horário</button></div>'+
    '<p class="hint">Se o WhatsApp não abriu sozinho, toque em "Enviar no WhatsApp".</p>';
}
function vPix(){
  var b=mine();
  if(!b){ui.tab='meu';return vMeu()}
  var sv=svcById(b.svc),key=normKey(S.pix),code=pixPayload(key,sv.preco);
  var sentMsg=b.sent?'Olá! Segue o comprovante do Pix de '+b.name+': '+sv.nome+', '+dayLabel(b.date)+' às '+hm(b.start)+'.'
                    :bookMsg(Object.assign({},b,{paid:'enviado'}))+'\nSegue o comprovante do Pix.';
  var h='<div class="okhead"><span class="check">'+CHECK+'</span><h2 class="h">Horário reservado</h2><p class="lead" style="margin:0">Pague com Pix para garantir.</p></div>'+
    '<div class="ticket">'+ticketTop(b,sv)+'<div class="perf"></div><div class="tk">'+
    (pixTest()?'<p class="notice warn" style="margin:0 0 14px">Pix de teste. Não pague de verdade.</p>':'')+
    '<div class="muted">Valor a pagar</div><div class="amount">'+money(sv.preco)+'</div>'+
    '<div class="qrwrap"><div class="qrbox" id="qr" aria-label="QR Code do Pix"></div></div>'+
    '<div class="keyrow"><div><small>Chave Pix</small><b>'+(pixTest()?'Chave de teste':esc(S.pix))+'</b></div><button class="btn sm" data-act="copy" data-text="'+esc(key)+'">Copiar</button></div>'+
    '<textarea class="code" id="pixcode" readonly aria-label="Pix copia e cola">'+esc(code)+'</textarea>'+
    '<button class="btn sm ghost block" data-act="copy" data-text="'+esc(code)+'">Copiar código copia e cola</button></div></div>'+
    '<h3 class="sub-h">Como pagar</h3><ol class="how"><li>Abra o app do seu banco e escolha Pix.</li><li>Leia o QR Code ou cole o código.</li><li>Toque em "Já fiz o Pix" e mande o comprovante no WhatsApp.</li></ol>'+
    '<div class="stack"><a class="btn block" data-act="pixsent" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,sentMsg))+'">Já fiz o Pix</a>';
  h+=b.sent?'<button class="btn ghost block" data-act="go" data-v="meu">Pagar depois, na barbearia</button>'
           :'<a class="btn ghost block" data-act="paylater" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,bookMsg(b)))+'">Pagar depois, na barbearia</a>';
  return h+'</div>';
}
function vLookup(){
  return '<section class="sec"><h2 class="h">Meus horários</h2><p class="lead">Informe o WhatsApp usado no agendamento para consultar seus horários.</p>'+
    '<label class="field"><span>WhatsApp com DDD</span><input type="tel" inputmode="tel" id="f-lookup" autocomplete="tel" placeholder="(00) 00000-0000" value="'+esc(ui.lookup)+'"></label>'+
    (ui.lookupMiss?'<p class="notice warn">Não encontramos horários para esse número. Confira o número ou faça um agendamento.</p>':'')+
    '<div class="stack" style="margin-top:16px"><button class="btn block" data-act="lookup"'+(digits(ui.lookup).length>=10?'':' disabled')+'>Ver meus horários</button>'+
    '<button class="btn ghost block" data-act="go" data-v="agendar">Agendar um horário</button></div></section>';
}
function vMeu(){
  if(!S.me)return vLookup();
  var all=myBookings(),now=new Date();
  var up=all.filter(function(b){return when(b)>=now}),old=all.filter(function(b){return when(b)<now}).reverse();
  var b=mine();
  if(!b||up.indexOf(b)<0)b=up[0];
  S.mine=b?b.id:null;
  var who=all.length?all[all.length-1].name:(S.profile.name||'');
  var h='<section class="sec"><h2 class="h">Meus horários</h2><p class="lead">'+(who?esc(who)+' · ':'')+esc(S.me)+
        ' <button class="linkbtn" data-act="logout">Trocar número</button></p>';
  if(b)h+=meuTicket(b);
  else h+='<p class="muted" style="margin:0 0 14px">Nenhum horário marcado.</p>';
  var rest=up.filter(function(x){return x!==b});
  if(rest.length){
    h+='<h3 class="grp">Próximos horários</h3><div class="list">';
    rest.forEach(function(x){
      var s=svcById(x.svc);
      h+='<button class="opt" data-act="pick" data-v="'+x.id+'"><b>'+esc(s.nome)+'</b><span class="price">'+hm(x.start)+'</span><span class="sub">'+dayLabel(x.date)+'</span></button>';
    });
    h+='</div>';
  }
  if(old.length){
    h+='<h3 class="grp">Histórico</h3><div class="list">';
    old.slice(0,5).forEach(function(x){
      var s=svcById(x.svc);
      h+='<div class="kv"><span>'+dayLabel(x.date)+' · '+esc(s.nome)+'</span><b>'+(s.preco?money(s.preco):'')+'</b></div>';
    });
    h+='</div>';
  }
  return h+'<div style="margin-top:20px"><button class="btn ghost block" data-act="go" data-v="agendar">Agendar outro horário</button></div></section>';
}
function meuTicket(b){
  var sv=svcById(b.svc),past=when(b)<new Date(),can=canCancel(b);
  var h='<div class="ticket">'+ticketTop(b,sv)+'<div class="perf"></div><div class="tk">';
  if(b.status==='pendente'){
    h+='<div>A barbearia vai confirmar pelo WhatsApp.</div><div class="actions"><a class="btn ghost" target="_blank" rel="noopener" href="'+esc(waLink(S.zap,bookMsg(b)))+'">Mandar mensagem de novo</a></div>';
  }else{
    h+='<div>Horário confirmado. Até lá!</div>';
  }
  if(sv.preco){
    if(b.paid==='pago')h+='<p class="pay ok">Pagamento confirmado.</p>';
    else if(b.paid==='enviado')h+='<p class="pay">Pix enviado. A barbearia vai dar baixa.</p>';
    else if(!past)h+='<div class="actions"><button class="btn" data-act="go" data-v="pix">Pagar agora com Pix</button></div><p class="pay">Ou pague na barbearia.</p>';
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
  return h;
}

/* ---------- painel do barbeiro ---------- */
function vLock(){
  return '<section class="sec lock"><h2 class="h">Área do barbeiro</h2><p class="lead">Digite a senha para ver a agenda.</p>'+
         '<input type="password" inputmode="numeric" id="pin" maxlength="'+String(CFG.senha).length+'" autocomplete="off" aria-label="Senha" placeholder="••••">'+
         (CFG.demo?'<p class="hint">Na demonstração, a senha é '+esc(CFG.senha)+'.</p>':'')+'</section>';
}
function vLogin(){
  return '<section class="sec login"><h2 class="h">Área do barbeiro</h2><p class="lead">Digite a senha para ver a agenda.</p>'+
         '<label class="field"><span>Senha</span><input type="password" id="adm-pass" autocomplete="off" value="'+esc(ui.pass)+'"></label>'+
         (ui.loginErr?'<p class="notice warn">'+esc(ui.loginErr)+'</p>':'')+
         '<div class="stack" style="margin-top:16px"><button class="btn block" data-act="login"'+(ui.busy?' disabled':'')+'>'+(ui.busy?'Entrando...':'Entrar')+'</button></div></section>';
}
function vAgenda(){
  var ds=ui.bdate,pro=ui.bpro,m=dayMap(ds,pro);
  var wk=0,wkv=0,t0=ymd(today()),t7=ymd(addDays(today(),7));
  S.bookings.forEach(function(b){if(b.status!=='cancelado'&&b.date>=t0&&b.date<t7){wk++;wkv+=svcById(b.svc).preco}});
  var list=S.bookings.filter(function(b){return b.date===ds&&b.pro===pro&&b.status!=='cancelado'});
  var rec=0,rem=0;
  list.forEach(function(b){var v=svcById(b.svc).preco;if(b.paid==='pago')rec+=v;else rem+=v});
  var h='<div class="week"><span>Próximos 7 dias</span><span><b>'+wk+'</b> clientes'+(wkv?', <b>'+money0(wkv)+'</b>':'')+'</span></div>';
  if(MULTI)h+=chips('bpro',PROS.map(function(p){return [p,p]}),pro);
  h+='<p class="lead" style="margin:0 0 10px">'+dayLabel(ds)+'</p>'+dayChips(ds,'bdate')+
    '<div class="stats"><div><strong>'+list.length+'</strong><span>Clientes</span></div>'+
    '<div><strong>'+money0(rec)+'</strong><span>Recebido</span></div>'+
    '<div><strong>'+money0(rem)+'</strong><span>A receber</span></div></div><div class="agenda">';
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
      rows+='<div class="row"><div class="time">'+hm(i)+'</div><div><div class="who"><b>'+esc(b.name)+'</b><span class="pills">'+pill(b.status)+paidPill(b.paid)+'</span></div>'+
         '<div class="meta">'+esc(sv.nome)+', até '+hm(b.start+b.slots)+(sv.preco?', '+money(sv.preco):'')+'</div><div class="actions">';
      if(ui.confirm===b.id){
        rows+='<span class="muted" style="align-self:center;font-size:14px">Cancelar este horário?</span>'+
           '<button class="btn sm danger" data-act="bcancel" data-v="'+b.id+'">Sim, cancelar</button><button class="btn sm ghost" data-act="bno">Voltar</button>';
      }else{
        if(b.status==='pendente'){
          var okMsg='Olá '+firstName(b.name)+'! Aqui é da '+CFG.nome+'. Seu horário está confirmado: '+dayLabel(b.date)+' às '+hm(b.start)+' ('+sv.nome.toLowerCase()+'). Até lá!';
          rows+='<a class="btn sm" data-act="confirm" data-v="'+b.id+'" target="_blank" rel="noopener" href="'+esc(waLink(b.phone,okMsg))+'">Confirmar</a>';
        }else if(b.phone){
          rows+='<a class="btn sm ghost" target="_blank" rel="noopener" href="'+esc(waLink(b.phone,'Olá '+firstName(b.name)+'! Aqui é da '+CFG.nome+'. Lembrando do seu horário: '+dayLabel(b.date)+' às '+hm(b.start)+' ('+sv.nome.toLowerCase()+'). Até lá!'))+'">Lembrar no WhatsApp</a>';
        }
        if(sv.preco&&b.paid!=='pago')rows+='<button class="btn sm'+(b.paid==='enviado'?'':' ghost')+'" data-act="baixa" data-v="'+b.id+'">Dar baixa no pagamento</button>';
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
  return h+(rows||'<div class="empty">Nada para mostrar neste dia.</div>')+'</div>';
}
function clientes(){
  var now=new Date(),map={};
  S.bookings.forEach(function(b){
    if(b.status==='cancelado')return;
    var k=String(b.phone||'').replace(/\D/g,'')||b.name.toLowerCase();
    var c=map[k]||(map[k]={name:b.name,phone:b.phone,visits:0,last:null,next:null});
    if(when(b)<now){c.visits++;if(!c.last||b.date>c.last){c.last=b.date;c.name=b.name}}
    else if(!c.next||when(b)<when(c.next))c.next=b;
  });
  return Object.keys(map).map(function(k){
    var c=map[k];
    c.days=c.last?Math.round((today()-parse(c.last))/864e5):null;
    c.gone=!c.next&&c.days!=null&&c.days>30;
    return c;
  }).sort(function(a,b){return (b.gone-a.gone)||a.name.localeCompare(b.name)});
}
function vClientes(){
  var list=clientes(),gone=list.filter(function(c){return c.gone}).length;
  var h='<div class="week"><span>Sumidos há mais de 30 dias</span><span><b>'+gone+'</b> de '+list.length+' clientes</span></div><div class="agenda">';
  list.forEach(function(c){
    var meta=c.visits?c.visits+(c.visits===1?' visita':' visitas')+', a última em '+shortDate(c.last):'Primeira vez';
    if(c.next)meta+='. Próximo: '+dayLabel(c.next.date)+' às '+hm(c.next.start);
    h+='<div class="crow"><div class="who"><b>'+esc(c.name)+'</b>'+(c.gone?'<span class="pill p-await">Sumiu há '+c.days+' dias</span>':'')+'</div>'+
       '<div class="meta">'+meta+'</div>';
    if(c.phone){
      var msg=c.gone?'Olá '+firstName(c.name)+'! Aqui é da '+CFG.nome+'. Faz um tempinho que você não aparece. Bora marcar um horário? É só escolher aqui: '+clientUrl()
                    :'Olá '+firstName(c.name)+'! Aqui é da '+CFG.nome+'.';
      h+='<div class="actions"><a class="btn sm'+(c.gone?'':' ghost')+'" target="_blank" rel="noopener" href="'+esc(waLink(c.phone,msg))+'">'+(c.gone?'Chamar de volta':'WhatsApp')+'</a></div>';
    }
    h+='</div>';
  });
  return h+(list.length?'':'<div class="empty">Nenhum cliente ainda.</div>')+'</div>';
}
function vPainel(){
  if(DBON){
    if(ui.booting)return '<p class="hint" style="text-align:center;margin-top:40px">Carregando...</p>';
    if(!ui.unlocked)return vLogin();
  }else if(!ui.unlocked)return vLock();
  var h='<section class="sec"><h2 class="h">Painel</h2>'+
    chips('ptab',[['agenda','Agenda'],['clientes','Clientes']],ui.ptab)+
    (ui.ptab==='clientes'?vClientes():vAgenda())+'</section>';

  h+='<details class="set" id="cfg"'+(ui.setOpen?' open':'')+'><summary>Configurações da barbearia</summary>'+
     '<label class="field"><span>WhatsApp da barbearia (recebe os agendamentos)</span><input type="tel" inputmode="tel" id="set-zap" value="'+esc(S.zap)+'"></label>'+
     '<label class="field"><span>Chave Pix (aparece para o cliente)</span><input type="text" id="set-pix" value="'+esc(S.pix)+'"></label>'+
     '<div class="prices">';
  svcs().forEach(function(s){
    h+='<label class="field"><span>Preço: '+esc(s.nome.toLowerCase())+'</span><input type="number" inputmode="decimal" min="0" step="1" id="set-price-'+esc(s.id)+'" value="'+s.preco+'"></label>';
  });
  h+='</div><div class="keyrow"><div><small>Link para os clientes</small><b>'+esc(clientUrl())+'</b></div><button class="btn sm" data-act="copy" data-text="'+esc(clientUrl())+'">Copiar</button></div></details>';

  h+='<div class="reset">';
  if(DBON){
    /* com o banco ligado não existe "voltar aos exemplos" */
  }else if(ui.askReset){
    h+='<h3 class="sub-h">Voltar aos exemplos?</h3><p class="muted" style="margin:0">Apaga o que foi marcado e traz os clientes de exemplo de novo.</p>'+
       '<div class="actions"><button class="btn danger" data-act="rdo">Sim, apagar</button><button class="btn ghost" data-act="rno">Voltar</button></div>';
  }else{
    h+='<button class="btn ghost block" data-act="rask">Voltar aos exemplos</button>';
  }
  h+='<a class="btn ghost block" style="margin-top:10px" href="'+esc(clientUrl())+'">Ver a página do cliente</a>'+
     '<button class="btn ghost block" style="margin-top:10px" data-act="lock">Sair do painel</button></div>';
  return h;
}

/* ---------- tela ---------- */
function edge(el){el.classList.toggle('end',el.scrollLeft>=el.scrollWidth-el.clientWidth-4)}
function render(keep){
  var y=window.scrollY,dEl=document.querySelector('.days'),dx=dEl?dEl.scrollLeft:0,html;
  if(PAGE==='painel'){
    html=vPainel();
  }else{
    var tabOf=ui.tab==='enviado'||ui.tab==='pix'?'meu':ui.tab;
    ['agendar','meu'].forEach(function(t){
      var b=document.getElementById('t-'+t);
      if(t===tabOf)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    if(ui.tab==='agendar')html=vAgendar();
    else if(ui.tab==='enviado')html=vEnviado();
    else if(ui.tab==='pix')html=vPix();
    else html=vMeu();
  }
  document.getElementById('main').innerHTML=html;
  /* logo e informações: em cima da lista no celular, coluna fixa à esquerda no computador */
  var side=document.getElementById('side');
  if(side){
    if(!side.innerHTML)side.innerHTML=capa()+'<div id="herobox"></div>'+fotos();
    document.getElementById('herobox').innerHTML=hero();
    side.classList.toggle('show',ui.tab==='agendar'&&ui.step===1);
  }
  updateBar();
  if(ui.tab==='pix')makeQR();
  window.scrollTo(0,keep===false?0:y);
  dEl=document.querySelector('.days');
  if(dEl){
    var sel=dEl.querySelector('[aria-pressed="true"]');
    dEl.scrollLeft=dx;
    if(sel){
      /* o dia escolhido nunca fica cortado na ponta nem escondido pelo esmaecido */
      var l=sel.offsetLeft,r=l+sel.offsetWidth,fade=56;
      if(keep===false)dEl.scrollLeft=l-dEl.clientWidth/2+sel.offsetWidth/2;
      else if(r>dEl.scrollLeft+dEl.clientWidth-fade)dEl.scrollTo({left:r-dEl.clientWidth+fade,behavior:'smooth'});
      else if(l<dEl.scrollLeft)dEl.scrollTo({left:l-8,behavior:'smooth'});
    }
    edge(dEl);
  }
}
function makeQR(){
  var el=document.getElementById('qr'),b=mine();
  if(!el||!b)return;
  el.innerHTML='';
  if(typeof QRCode==='undefined'){el.style.lineHeight='1.4';el.textContent='QR Code indisponível. Use o código abaixo.';return}
  try{
    new QRCode(el,{text:pixPayload(normKey(S.pix),svcById(b.svc).preco),width:176,height:176,colorDark:'#12141D',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M});
  }catch(e){el.textContent='QR Code indisponível. Use o código abaixo.'}
}
var tt;
function toast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('on');
  clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2200);
}
function copy(text){
  try{navigator.clipboard.writeText(text).then(function(){toast('Copiado')},function(){toast('Não deu para copiar')})}
  catch(e){toast('Não deu para copiar')}
}

/* fileira de dias: arrastar com o mouse e rolar com a roda */
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
document.addEventListener('wheel',function(e){
  var el=e.target.closest&&e.target.closest('.days');
  if(!el||Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;
  var max=el.scrollWidth-el.clientWidth;
  if((e.deltaY<0&&el.scrollLeft<=0)||(e.deltaY>0&&el.scrollLeft>=max))return;
  el.scrollLeft+=e.deltaY;e.preventDefault();
},{passive:false});
document.addEventListener('scroll',function(e){if(e.target.classList&&e.target.classList.contains('days'))edge(e.target)},true);

/* ---------- banco de dados ---------- */
var ERR={
  horario_ocupado:'Esse horário acabou de ser ocupado. Escolha outro.',
  horario_invalido:'Esse horário não está disponível. Escolha outro.',
  limite_por_telefone:'Esse número já tem 3 horários marcados.',
  dados_invalidos:'Confira o nome e o WhatsApp.',
  servico_invalido:'Esse serviço não está disponível agora.',
  barbeiro_invalido:'Esse barbeiro não está disponível agora.',
  nao_encontrado:'Não encontramos esse horário.',
  prazo_encerrado:'Faltam menos de 2 horas. Fale com a barbearia.'
};
function errMsg(e){return ERR[e&&e.code]||'Não deu certo. Confira a internet e tente de novo.'}
function typing(){var a=document.activeElement;return !!(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'))}
function applyData(d){
  S.bookings=d.bookings;
  S.bookings.forEach(function(b){if(PROS.indexOf(b.pro)<0)b.pro=PROS[0]});
  /* bloqueios chegam como lista. O barbeiro do banco vira o barbeiro do site (ou o primeiro, se o site não tiver nomes) */
  S.blocks={};
  d.blocks.forEach(function(r){
    var p=PROS.indexOf(r.barbeiro)<0?PROS[0]:r.barbeiro,k=p+'|'+r.data;
    (S.blocks[k]=S.blocks[k]||[]).push(r.slot);
  });
  if(d.cfg.zap)S.zap=d.cfg.zap;
  if(d.cfg.pix){S.pix=d.cfg.pix;S.pixEdited=true}
  S.prices=d.cfg.prices||{};
  ui.loaded=true;ui.loadErr=false;
}
/* busca os dados no servidor e desenha de novo. quiet: não mexe na tela se a pessoa estiver digitando */
function refresh(opts){
  if(!DBON)return Promise.resolve();
  var job;
  if(PAGE==='painel'){
    if(!ui.unlocked)return Promise.resolve();
    job=DB.loadAdmin(ymd(addDays(today(),-120)));
  }else job=DB.loadPublic(S.me);
  return job.then(applyData).catch(function(){if(!ui.loaded)ui.loadErr=true}).then(function(){
    if(opts&&opts.quiet&&typing())return;
    render();
  });
}
function fail(msg){toast(msg||'Não salvou. Confira a internet.');refresh()}
var cfgT;
function saveCfg(){
  if(!DBON||PAGE!=='painel')return;
  clearTimeout(cfgT);
  cfgT=setTimeout(function(){
    DB.saveConfig({zap:S.zap,pix:pixTest()?'':S.pix,prices:S.prices}).catch(function(){toast('Não salvou as configurações. Confira a internet.')});
  },700);
}

/* ---------- ações ---------- */
function book(){
  var sv=svcById(ui.svc);if(!sv||ui.slot==null||ui.busy)return;
  var pro=freePro(ui.date,ui.slot,len(sv),ui.pro);
  if(pro==null){toast('Esse horário acabou de ser ocupado');ui.slot=null;ui.step=2;render(false);return}
  var b={id:'b'+Date.now(),date:ui.date,start:ui.slot,slots:len(sv),svc:sv.id,pro:pro,name:ui.name.trim(),phone:ui.phone.trim(),status:'pendente',
         pay:sv.preco?ui.pay:'local',paid:'',sent:false};
  if(!DBON){afterBook(b);return}
  ui.busy=true;toast('Reservando...');
  DB.agendar(b).then(function(row){
    b.id=row.id;b.status=row.status;ui.busy=false;afterBook(b);
  }).catch(function(e){
    ui.busy=false;toast(errMsg(e));
    if(e&&(e.code==='horario_ocupado'||e.code==='horario_invalido')){ui.slot=null;ui.step=2}
    refresh();
  });
}
function afterBook(b){
  S.bookings.push(b);S.mine=b.id;S.me=b.phone;S.profile={name:b.name,phone:b.phone};
  ui.slot=null;ui.svc=null;ui.step=1;ui.sheet=false;
  if(b.pay==='pix'){save();ui.tab='pix';render(false);return}
  b.sent=true;save();ui.tab='enviado';render(false);
  window.open(waLink(S.zap,bookMsg(b)),'_blank','noopener');
}
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-act],[data-tab]');
  if(!t||t.disabled)return;
  if(t.dataset.tab){ui.tab=t.dataset.tab;ui.confirm=null;render(false);return}
  var a=t.dataset.act,v=t.dataset.v,b;
  switch(a){
    case 'svc':
      ui.svc=v;
      if(ui.slot!=null&&freePro(ui.date,ui.slot,len(svcById(v)),ui.pro)==null)ui.slot=null;
      ui.step=2;render(false);break;
    case 'pro':
      ui.pro=v;
      if(ui.slot!=null&&freePro(ui.date,ui.slot,len(svcById(ui.svc)),v)==null)ui.slot=null;
      render();break;
    case 'back':ui.step=Math.max(1,ui.step-1);ui.sheet=false;render(false);break;
    case 'next':ui.step=3;ui.sheet=false;render(false);break;
    case 'sheet':ui.sheet=!ui.sheet;updateBar();break;
    case 'pay':ui.pay=v;render();break;
    case 'pixsent':
      b=mine();if(b){b.paid='enviado';b.pay='pix';b.sent=true;save();if(DBON)DB.avisar(b.id,b.phone,'pix','enviado').catch(function(){fail()})}
      ui.tab='meu';toast('Pix avisado à barbearia');setTimeout(function(){render(false)},0);break;
    case 'paylater':
      b=mine();if(b){b.pay='local';b.sent=true;save();if(DBON)DB.avisar(b.id,b.phone,'local',b.paid||'').catch(function(){fail()})}
      ui.tab='meu';setTimeout(function(){render(false)},0);break;
    case 'date':ui.date=v;ui.slot=null;render();break;
    case 'slot':ui.slot=Number(v);render();break;
    case 'book':book();break;
    case 'lookup':
      if(DBON){
        DB.loadPublic(ui.lookup).then(function(d){
          if(d.bookings.some(function(x){return !x.occ})){applyData(d);S.me=ui.lookup.trim();S.mine=null;ui.lookupMiss=false;save()}
          else ui.lookupMiss=true;
          render(false);
        }).catch(function(e){toast(errMsg(e))});
        break;
      }
      if(S.bookings.some(function(x){return x.status!=='cancelado'&&digits(x.phone)===digits(ui.lookup)})){
        S.me=ui.lookup.trim();S.mine=null;ui.lookupMiss=false;save();
      }else ui.lookupMiss=true;
      render(false);break;
    case 'logout':if(DBON)S.bookings=S.bookings.filter(function(x){return x.occ});S.me=null;S.mine=null;ui.lookup='';ui.lookupMiss=false;ui.confirm=null;save();render(false);break;
    case 'pick':S.mine=v;ui.confirm=null;render(false);break;
    case 'go':
      ui.tab=v;ui.confirm=null;
      if(v==='agendar'){ui.step=1;ui.svc=null;ui.slot=null}
      render(false);break;
    case 'cancelask':ui.confirm='mine';render();break;
    case 'cancelno':ui.confirm=null;render();break;
    case 'cancelyes':
      b=mine();if(b){b.status='cancelado';save();if(DBON)DB.cancelar(b.id,b.phone).then(function(){refresh({quiet:true})},function(e){fail(errMsg(e))})}
      ui.confirm=null;toast('Horário cancelado');setTimeout(render,0);break;
    case 'remarcar':
      b=mine();
      if(b){b.status='cancelado';save();if(DBON)DB.cancelar(b.id,b.phone).catch(function(e){fail(errMsg(e))});ui.svc=b.svc;ui.name=S.profile.name||ui.name;ui.phone=S.profile.phone||ui.phone}
      ui.date=firstOpenFree();ui.slot=null;ui.step=2;ui.tab='agendar';toast('Escolha o novo horário');render(false);break;
    case 'ptab':ui.ptab=v;ui.confirm=null;render(false);break;
    case 'bpro':ui.bpro=v;ui.confirm=null;render();break;
    case 'bdate':ui.bdate=v;ui.confirm=null;render();break;
    case 'confirm':b=byId(v);if(b){b.status='confirmado';save();toast('Horário confirmado');if(DBON)DB.setStatus(b.id,{status:'confirmado'}).catch(function(){fail()})}setTimeout(render,0);break;
    case 'baixa':b=byId(v);if(b){b.paid='pago';save();toast('Pagamento recebido');if(DBON)DB.setStatus(b.id,{paid:'pago'}).catch(function(){fail()})}render();break;
    case 'bask':ui.confirm=v;render();break;
    case 'bno':ui.confirm=null;render();break;
    case 'bcancel':b=byId(v);if(b){b.status='cancelado';save();toast('Horário liberado');if(DBON)DB.setStatus(b.id,{status:'cancelado'}).catch(function(){fail()})}ui.confirm=null;render();break;
    case 'block':
      (S.blocks[ui.bpro+'|'+ui.bdate]=S.blocks[ui.bpro+'|'+ui.bdate]||[]).push(Number(v));save();
      if(DBON)DB.block(ui.bpro,ui.bdate,Number(v)).catch(function(){fail()});
      render();break;
    case 'unblock':
      S.blocks[ui.bpro+'|'+ui.bdate]=(S.blocks[ui.bpro+'|'+ui.bdate]||[]).filter(function(x){return x!==Number(v)});save();
      if(DBON)DB.unblock(ui.bpro,ui.bdate,Number(v)).catch(function(){fail()});
      render();break;
    case 'copy':copy(t.dataset.text);break;
    case 'lock':
      ui.unlocked=false;try{sessionStorage.removeItem(LOCKKEY)}catch(e){}
      if(DBON){DB.logout();S.bookings=[];S.blocks={}}
      render(false);break;
    case 'login':
      if(ui.busy)break;
      ui.busy=true;ui.loginErr='';render(false);
      DB.login(ui.pass).then(function(){
        ui.busy=false;ui.unlocked=true;ui.pass='';return refresh();
      }).catch(function(er){
        ui.busy=false;
        ui.loginErr=er&&er.code==='login'?'Senha incorreta.':('Não deu para entrar. Confira a internet.');
        render(false);
      });
      break;
    case 'retry':ui.loadErr=false;render();refresh();break;
    case 'rask':ui.askReset=true;render();break;
    case 'rno':ui.askReset=false;render();break;
    case 'rdo':
      S=seed();save();ui.svc=null;ui.slot=null;ui.step=1;ui.date=firstOpenFree();ui.bdate=firstOpen();ui.name='';ui.phone='';ui.askReset=false;ui.confirm=null;
      toast('Exemplos de volta');render();break;
  }
});
document.addEventListener('input',function(e){
  var id=e.target.id;
  if(id==='f-name'){ui.name=e.target.value;updateBar()}
  else if(id==='f-phone'){ui.phone=e.target.value;updateBar()}
  else if(id==='f-lookup'){
    ui.lookup=e.target.value;ui.lookupMiss=false;
    var lb=document.querySelector('[data-act="lookup"]');if(lb)lb.disabled=digits(ui.lookup).length<10;
  }
  else if(id==='pin'){
    if(e.target.value===String(CFG.senha)){
      ui.unlocked=true;try{sessionStorage.setItem(LOCKKEY,'1')}catch(e2){}
      toast('Bem-vindo');render(false);
    }else if(e.target.value.length>=String(CFG.senha).length){e.target.value='';toast('Senha incorreta')}
  }
  else if(id==='adm-email'){ui.email=e.target.value}
  else if(id==='adm-pass'){ui.pass=e.target.value}
  else if(id==='set-zap'){S.zap=e.target.value;save();saveCfg()}
  else if(id==='set-pix'){S.pix=e.target.value;S.pixEdited=true;save();saveCfg()}
  else if(id&&id.indexOf('set-price-')===0){
    var n=parseFloat(e.target.value);
    S.prices[id.slice(10)]=isNaN(n)?0:Math.max(0,n);save();saveCfg();
  }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&e.target.id==='f-lookup'){var lb=document.querySelector('[data-act="lookup"]');if(lb&&!lb.disabled)lb.click()}
  if(e.key==='Enter'&&(e.target.id==='adm-pass')){var lg=document.querySelector('[data-act="login"]');if(lg&&!lg.disabled)lg.click()}
});
document.addEventListener('toggle',function(e){if(e.target&&e.target.id==='cfg')ui.setOpen=e.target.open},true);

if(PAGE==='cliente'&&'serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(function(){});
}
render(false);
if(DBON){
  if(PAGE==='painel'){
    DB.session().then(function(v){ui.unlocked=v;ui.booting=false;if(v)refresh();else render(false)});
  }else refresh();
  /* mantém a tela em dia: a cada 30 segundos e quando a pessoa volta para o app */
  var watch=function(){
    if(document.hidden||ui.busy)return;
    if(PAGE==='painel'){if(ui.unlocked)refresh({quiet:true})}
    else if((ui.tab==='agendar'&&ui.step===2)||ui.tab==='meu')refresh({quiet:true});
  };
  setInterval(watch,30000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)watch()});
}
})();
