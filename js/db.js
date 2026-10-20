/* Ligação com o banco (Supabase). Todo o contato com o banco passa por aqui.
   Sem URL e chave em js/config.js (window.SUPABASE), o site continua em modo demonstração, guardando tudo no aparelho.
   O site nunca lê nem grava direto nas tabelas: tudo vai por funções do banco (supabase/migracao.sql). */
(function(){
'use strict';
var C=window.SUPABASE||{};
var lib=window.supabase;
var DB={on:!!(C.url&&C.key&&lib&&lib.createClient)};
window.DB=DB;
if(!DB.on)return;

var sb=lib.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});

/* o servidor responde com códigos curtos (horario_ocupado, prazo_encerrado...). O app traduz. */
function ok(r){
  if(r.error){var e=new Error(r.error.message||'erro');e.code=r.error.message||'erro';throw e}
  return r.data;
}

/* Os serviços do site (js/config.js) e do banco se encontram pelo nome, sem ligar para maiúsculas e acentos. */
function key(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase()}
function cfgServicos(){return (window.BARBEARIA&&window.BARBEARIA.servicos)||[]}
function appSvcId(nome){
  var k=key(nome),l=cfgServicos();
  for(var i=0;i<l.length;i++){if(key(l[i].nome)===k)return l[i].id}
  return nome;
}
function svcNome(id){
  var l=cfgServicos();
  for(var i=0;i<l.length;i++){if(l[i].id===id)return l[i].nome}
  return id;
}

function fromRow(r){
  return {id:String(r.id),date:r.data,start:r.inicio_slot,slots:r.blocos,svc:appSvcId(r.servico),pro:r.barbeiro,name:r.nome,phone:r.telefone,
          status:r.status,pay:r.pagamento,paid:r.pago,sent:true};
}
/* horário ocupado que vem sem nome nem telefone: serve só para marcar o horário como indisponível */
function occRow(r,i){
  return {id:'o'+i,date:r.data,start:r.inicio,slots:r.blocos,svc:'',pro:r.barbeiro,name:'',phone:'',status:'confirmado',pay:'local',paid:'',sent:true,occ:true};
}
function cfgOut(c){
  c=c||{};
  var prices={};
  (c.servicos||[]).forEach(function(s){prices[appSvcId(s.nome)]=Number(s.preco)});
  return {zap:c.whatsapp||'',pix:c.pix||'',prices:prices};
}

/* ---------- cliente ---------- */
DB.loadPublic=function(phone){
  var jobs=[sb.rpc('ocupados'),sb.rpc('catalogo')];
  if(phone)jobs.push(sb.rpc('meus_horarios',{p_telefone:phone}));
  return Promise.all(jobs).then(function(rs){
    var occ=ok(rs[0])||[],blocks=[],res=[];
    occ.forEach(function(r,i){if(r.tipo==='bloqueio')blocks.push({barbeiro:r.barbeiro,data:r.data,slot:r.inicio});else res.push(occRow(r,i))});
    var own=rs[2]?(ok(rs[2])||[]).map(fromRow):[];
    return {bookings:res.concat(own),blocks:blocks,cfg:cfgOut(ok(rs[1]))};
  });
};
DB.agendar=function(b){
  return sb.rpc('agendar',{p_data:b.date,p_inicio:b.start,p_blocos:b.slots,p_servico:svcNome(b.svc),p_barbeiro:b.pro||'',
                           p_nome:b.name,p_telefone:b.phone,p_pagamento:b.pay}).then(ok).then(fromRow);
};
DB.cancelar=function(id,phone){return sb.rpc('cancelar_meu',{p_id:id,p_telefone:phone}).then(ok)};
DB.avisar=function(id,phone,pay,paid){
  return sb.rpc('atualizar_meu',{p_id:id,p_telefone:phone,p_pagamento:pay,p_pago:paid}).then(ok);
};

/* ---------- barbeiro ---------- */
/* A senha do painel é conferida no servidor a cada chamada. Fica guardada só enquanto a aba estiver aberta. */
var PASS='';
try{PASS=sessionStorage.getItem('barbearia-painel')||''}catch(e){}
function setPass(p){PASS=p||'';try{if(p)sessionStorage.setItem('barbearia-painel',p);else sessionStorage.removeItem('barbearia-painel')}catch(e){}}
DB.session=function(){
  if(!PASS)return Promise.resolve(false);
  return sb.rpc('sou_admin',{p_senha:PASS}).then(ok).then(function(v){if(v!==true)setPass('');return v===true}).catch(function(){return false});
};
DB.login=function(pass){
  return sb.rpc('sou_admin',{p_senha:pass||''}).then(ok).then(function(v){
    if(v!==true){var e=new Error('login');e.code='login';throw e}
    setPass(pass);return true;
  });
};
DB.logout=function(){setPass('');return Promise.resolve()};
DB.loadAdmin=function(from){
  return Promise.all([sb.rpc('admin_agenda',{p_senha:PASS,p_desde:from}),sb.rpc('admin_bloqueios',{p_senha:PASS,p_desde:from}),sb.rpc('catalogo')]).then(function(rs){
    return {bookings:(ok(rs[0])||[]).map(fromRow),blocks:ok(rs[1])||[],cfg:cfgOut(ok(rs[2]))};
  });
};
DB.setStatus=function(id,patch){
  return sb.rpc('admin_status',{p_senha:PASS,p_id:id,p_status:patch.status||null,p_pago:patch.paid||null}).then(ok);
};
DB.block=function(pro,date,slot){return sb.rpc('admin_bloquear',{p_senha:PASS,p_barbeiro:pro||'',p_data:date,p_slot:slot}).then(ok)};
DB.unblock=function(pro,date,slot){return sb.rpc('admin_desbloquear',{p_senha:PASS,p_barbeiro:pro||'',p_data:date,p_slot:slot}).then(ok)};
DB.saveConfig=function(c){
  var precos={};
  Object.keys(c.prices||{}).forEach(function(id){precos[svcNome(id)]=c.prices[id]});
  return sb.rpc('admin_salvar_config',{p_senha:PASS,p_whatsapp:c.zap||'',p_pix:c.pix||'',p_precos:precos}).then(ok);
};
})();
