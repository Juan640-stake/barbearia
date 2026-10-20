-- Barbearia: liga o site ao banco que já existe no Supabase
-- (tabelas clientes, barbeiros, servicos, agendamentos e expediente).
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo inteiro e clique em Run.
-- Pode rodar de novo sem estragar nada. Não apaga nenhuma tabela nem nenhum dado.
--
-- O que ele faz:
--   * Acrescenta o que faltava: forma de pagamento e "pago" nos agendamentos, horários bloqueados,
--     WhatsApp e Pix da barbearia, e a lista de quem pode entrar no painel.
--   * Se a tabela de barbeiros ou de serviços estiver vazia, cria um barbeiro e os serviços de js/config.js.
--   * Tranca todas as tabelas: pelo site ninguém lê nem grava direto nelas. Tudo passa por funções que conferem as regras.
--     (Qualquer regra de acesso antiga nessas tabelas é removida. Quem usa a chave service_role, como automações, não é afetado.)
--
-- Regras:
--   * O cliente (sem login) só consegue: ver quais horários estão ocupados, agendar, consultar e cancelar os
--     horários do próprio WhatsApp e avisar que fez o Pix. Nunca vê nome nem telefone de outra pessoa.
--   * O barbeiro entra com uma senha (coluna senha_painel da tabela config). Sem senha definida, o painel fica desligado.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------- funções de apoio

-- Telefone só com números, sem o 55 do Brasil (igual ao que o site faz).
create or replace function public.normaliza_tel(t text) returns text
language sql immutable as $$
  select regexp_replace(regexp_replace(coalesce(t, ''), '\D', '', 'g'), '^55(?=\d{10,11}$)', '');
$$;

-- Hora de agora em Fortaleza.
create or replace function public.agora_local() returns timestamp
language sql stable as $$
  select now() at time zone 'America/Fortaleza';
$$;

-- Quantos horários de 30 min existem no dia: domingo fechado, sábado 9h às 16h, resto 9h às 19h.
-- (O site usa a mesma regra em nSlots(), no js/app.js. Se mudar uma, mude a outra.)
create or replace function public.slots_do_dia(d date) returns int
language sql immutable as $$
  select case extract(dow from d)::int when 0 then 0 when 6 then 14 else 20 end;
$$;

-- ---------------------------------------------------------------- o que faltava nas tabelas

alter table public.agendamentos add column if not exists pagamento text not null default 'local';
alter table public.agendamentos add column if not exists pago text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_pagamento_ok') then
    alter table public.agendamentos add constraint agendamentos_pagamento_ok check (pagamento in ('local', 'pix'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_pago_ok') then
    alter table public.agendamentos add constraint agendamentos_pago_ok check (pago in ('', 'enviado', 'pago'));
  end if;
  -- "agendado" é o que o app chama de pendente (aguardando confirmação)
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_status_ok') then
    alter table public.agendamentos add constraint agendamentos_status_ok
      check (status in ('agendado', 'confirmado', 'cancelado')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_fim_depois_inicio') then
    alter table public.agendamentos add constraint agendamentos_fim_depois_inicio check (fim > inicio);
  end if;
  -- impede dois agendamentos sobrepostos do mesmo barbeiro, mesmo que dois clientes toquem ao mesmo tempo
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_sem_choque') then
    alter table public.agendamentos add constraint agendamentos_sem_choque
      exclude using gist (barbeiro_id with =, tstzrange(inicio, fim) with &&) where (status <> 'cancelado');
  end if;
end $$;

create index if not exists agendamentos_inicio on public.agendamentos (inicio);
create index if not exists agendamentos_cliente on public.agendamentos (cliente_id);

-- Horários que o barbeiro bloqueou (folga, compromisso). slot 0 = 9h00, 1 = 9h30, 2 = 10h00 ...
create table if not exists public.bloqueios (
  barbeiro_id bigint not null references public.barbeiros (id) on delete cascade,
  data date not null,
  slot int not null check (slot between 0 and 19),
  primary key (barbeiro_id, data, slot)
);

-- Uma linha só: WhatsApp e chave Pix que o barbeiro ajusta no painel. Os preços ficam em "servicos".
create table if not exists public.config (
  id int primary key default 1 check (id = 1),
  whatsapp text not null default '',
  pix text not null default ''
);
alter table public.config add column if not exists senha_painel text not null default '';
insert into public.config (id) values (1) on conflict do nothing;

-- E-mails que podem entrar no painel do barbeiro.
create table if not exists public.admins (
  email text primary key
);

-- Dados iniciais, só se as tabelas estiverem vazias. Ajuste os nomes e preços depois, no próprio Supabase.
-- IMPORTANTE: o nome do serviço aqui precisa ser igual ao "nome" em js/config.js (maiúsculas e acentos não importam).
insert into public.barbeiros (nome)
select 'Barbeiro' where not exists (select 1 from public.barbeiros);

insert into public.servicos (nome, preco, duracao_min)
select v.nome, v.preco, v.duracao
from (values
  ('Corte degradê', 25, 30),
  ('Corte social', 20, 30),
  ('Corte degradê + barba', 40, 60),
  ('Sobrancelha', 5, 30),
  ('Pigmentação', 15, 30),
  ('Nevou + corte', 90, 120),
  ('Luzes + corte', 60, 90),
  ('Botox + corte', 50, 90),
  ('Relaxamento + corte', 40, 60)
) as v(nome, preco, duracao)
where not exists (select 1 from public.servicos);

-- ---------------------------------------------------------------- agendamento "pronto para o site"

-- Cada agendamento com o jeito que o site entende: dia, número do horário (0 = 9h00), quantos blocos de 30 min,
-- nome do serviço e do barbeiro, dados do cliente. Fica trancada: só as funções abaixo leem daqui.
create or replace view public.v_agendamentos as
select a.id,
       l.t::date as data,
       ((extract(hour from l.t) * 60 + extract(minute from l.t) - 540) / 30)::int as inicio_slot,
       (extract(epoch from (a.fim - a.inicio)) / 1800)::int as blocos,
       s.nome as servico,
       b.nome as barbeiro,
       c.nome as nome,
       c.telefone as telefone,
       public.normaliza_tel(c.telefone) as tel_norm,
       case a.status when 'agendado' then 'pendente' else a.status end as status,
       a.pagamento,
       a.pago
from public.agendamentos a
join public.clientes c on c.id = a.cliente_id
join public.servicos s on s.id = a.servico_id
join public.barbeiros b on b.id = a.barbeiro_id
cross join lateral (select a.inicio at time zone 'America/Fortaleza' as t) l;

-- ---------------------------------------------------------------- tranca as tabelas

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('clientes', 'barbeiros', 'servicos', 'agendamentos', 'expediente', 'bloqueios', 'config', 'admins')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.clientes enable row level security;
alter table public.barbeiros enable row level security;
alter table public.servicos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.expediente enable row level security;
alter table public.bloqueios enable row level security;
alter table public.config enable row level security;
alter table public.admins enable row level security;

revoke all on public.clientes, public.barbeiros, public.servicos, public.agendamentos, public.expediente,
              public.bloqueios, public.config, public.admins, public.v_agendamentos
  from anon, authenticated;

-- ---------------------------------------------------------------- quem é o barbeiro

drop function if exists public.is_admin();
drop function if exists public._exige_admin();
drop function if exists public.sou_admin();

-- A senha do painel fica na tabela config (coluna senha_painel). Senha vazia = painel desligado.
create or replace function public._exige_admin(p_senha text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(p_senha, '') = '' or p_senha is distinct from (select c.senha_painel from public.config c where c.id = 1) then
    raise exception 'sem_permissao';
  end if;
end;
$$;

create or replace function public.sou_admin(p_senha text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._exige_admin(p_senha);
  return true;
exception when others then
  return false;
end;
$$;

-- ---------------------------------------------------------------- funções que o cliente usa

-- Horários ocupados (sem nome nem telefone) e bloqueados, de hoje até 60 dias.
create or replace function public.ocupados()
returns table (tipo text, data date, inicio int, blocos int, barbeiro text)
language sql stable security definer set search_path = public as $$
  select 'reserva'::text, v.data, v.inicio_slot, v.blocos, v.barbeiro
  from public.v_agendamentos v
  where v.status <> 'cancelado'
    and v.data between public.agora_local()::date and public.agora_local()::date + 60
  union all
  select 'bloqueio'::text, b.data, b.slot, 1, br.nome
  from public.bloqueios b
  join public.barbeiros br on br.id = b.barbeiro_id
  where b.data between public.agora_local()::date and public.agora_local()::date + 60;
$$;

-- WhatsApp, Pix e serviços (nome, preço e duração) que aparecem no site.
create or replace function public.catalogo() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'whatsapp', (select c.whatsapp from public.config c where c.id = 1),
    'pix', (select c.pix from public.config c where c.id = 1),
    'servicos', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', s.nome, 'preco', s.preco, 'min', s.duracao_min) order by s.id), '[]'::jsonb)
      from public.servicos s where s.ativo
    )
  );
$$;

-- Cria um agendamento. Confere tudo no servidor: horário, dia aberto, almoço, duplicidade e limite por telefone.
create or replace function public.agendar(
  p_data date, p_inicio int, p_blocos int, p_servico text, p_barbeiro text,
  p_nome text, p_telefone text, p_pagamento text
) returns public.v_agendamentos
language plpgsql security definer set search_path = public as $$
declare
  v_nome text := btrim(coalesce(p_nome, ''));
  v_tel text := btrim(coalesce(p_telefone, ''));
  v_norm text := public.normaliza_tel(p_telefone);
  v_barb text := btrim(coalesce(p_barbeiro, ''));
  v_serv text := btrim(coalesce(p_servico, ''));
  v_serv_id bigint;
  v_barb_id bigint;
  v_cli_id bigint;
  v_id bigint;
  v_local timestamp;
  v_ini timestamptz;
  v_row public.v_agendamentos;
  k int;
begin
  if p_data is null or p_inicio is null or p_blocos is null
     or char_length(v_nome) not between 2 and 80
     or char_length(v_norm) not between 10 and 11
     or char_length(v_serv) not between 1 and 80
     or char_length(v_barb) > 80
     or coalesce(p_pagamento, '') not in ('local', 'pix') then
    raise exception 'dados_invalidos';
  end if;

  if p_blocos < 1 or p_blocos > 8 or p_inicio < 0
     or p_inicio + p_blocos > public.slots_do_dia(p_data) then
    raise exception 'horario_invalido';
  end if;
  for k in p_inicio .. p_inicio + p_blocos - 1 loop
    if k in (6, 7) then raise exception 'horario_invalido'; end if;  -- almoço, 12h às 13h
  end loop;

  v_local := p_data + time '09:00' + p_inicio * interval '30 minutes';
  if v_local < public.agora_local() or p_data > public.agora_local()::date + 60 then
    raise exception 'horario_invalido';
  end if;
  v_ini := v_local at time zone 'America/Fortaleza';

  select s.id into v_serv_id from public.servicos s
  where s.ativo and lower(btrim(s.nome)) = lower(v_serv) order by s.id limit 1;
  if v_serv_id is null then raise exception 'servico_invalido'; end if;

  -- sem barbeiro informado, vale o primeiro barbeiro ativo
  if v_barb = '' then
    select min(b.id) into v_barb_id from public.barbeiros b where b.ativo;
  else
    select b.id into v_barb_id from public.barbeiros b
    where b.ativo and lower(btrim(b.nome)) = lower(v_barb) order by b.id limit 1;
  end if;
  if v_barb_id is null then raise exception 'barbeiro_invalido'; end if;

  if exists (
    select 1 from public.bloqueios b
    where b.barbeiro_id = v_barb_id and b.data = p_data
      and b.slot between p_inicio and p_inicio + p_blocos - 1
  ) then
    raise exception 'horario_ocupado';
  end if;

  if (
    select count(*) from public.agendamentos a
    join public.clientes c on c.id = a.cliente_id
    where public.normaliza_tel(c.telefone) = v_norm and a.status <> 'cancelado'
      and (a.inicio at time zone 'America/Fortaleza') >= public.agora_local()
  ) >= 3 then
    raise exception 'limite_por_telefone';
  end if;

  select c.id into v_cli_id from public.clientes c
  where public.normaliza_tel(c.telefone) = v_norm order by c.id limit 1;
  if v_cli_id is null then
    insert into public.clientes (nome, telefone) values (v_nome, v_tel) returning id into v_cli_id;
  else
    update public.clientes set nome = v_nome, telefone = v_tel where id = v_cli_id;
  end if;

  insert into public.agendamentos (cliente_id, servico_id, barbeiro_id, inicio, fim, status, pagamento)
  values (v_cli_id, v_serv_id, v_barb_id, v_ini, v_ini + p_blocos * interval '30 minutes', 'agendado', p_pagamento)
  returning id into v_id;

  select * into v_row from public.v_agendamentos where id = v_id;
  return v_row;
exception
  when exclusion_violation then
    raise exception 'horario_ocupado';
end;
$$;

-- Agendamentos do WhatsApp informado (de 90 dias atrás em diante, sem os cancelados).
create or replace function public.meus_horarios(p_telefone text)
returns setof public.v_agendamentos
language sql stable security definer set search_path = public as $$
  select v.*
  from public.v_agendamentos v
  where public.normaliza_tel(p_telefone) <> ''
    and v.tel_norm = public.normaliza_tel(p_telefone)
    and v.status <> 'cancelado'
    and v.data >= public.agora_local()::date - 90
  order by v.data, v.inicio_slot
  limit 50;
$$;

-- O cliente cancela o próprio horário, até 2 horas antes.
create or replace function public.cancelar_meu(p_id bigint, p_telefone text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.agendamentos;
  n text := public.normaliza_tel(p_telefone);
begin
  select a.* into v
  from public.agendamentos a join public.clientes c on c.id = a.cliente_id
  where a.id = p_id and n <> '' and public.normaliza_tel(c.telefone) = n and a.status <> 'cancelado';
  if not found then raise exception 'nao_encontrado'; end if;
  if (v.inicio at time zone 'America/Fortaleza') - public.agora_local() < interval '2 hours' then
    raise exception 'prazo_encerrado';
  end if;
  update public.agendamentos set status = 'cancelado' where id = p_id;
end;
$$;

-- O cliente escolhe como paga e avisa que fez o Pix. Só o barbeiro marca como "pago".
create or replace function public.atualizar_meu(p_id bigint, p_telefone text, p_pagamento text, p_pago text) returns void
language plpgsql security definer set search_path = public as $$
declare
  n text := public.normaliza_tel(p_telefone);
begin
  if coalesce(p_pagamento, '') not in ('local', 'pix') or coalesce(p_pago, '') not in ('', 'enviado') then
    raise exception 'dados_invalidos';
  end if;
  update public.agendamentos a
  set pagamento = p_pagamento,
      pago = case when a.pago = 'pago' then 'pago' else p_pago end
  from public.clientes c
  where a.id = p_id and c.id = a.cliente_id and n <> ''
    and public.normaliza_tel(c.telefone) = n and a.status <> 'cancelado';
  if not found then raise exception 'nao_encontrado'; end if;
end;
$$;

-- ---------------------------------------------------------------- funções do barbeiro (conferem o login)

create or replace function public.admin_agenda(p_senha text, p_desde date) returns setof public.v_agendamentos
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._exige_admin(p_senha);
  return query
    select v.* from public.v_agendamentos v
    where v.status <> 'cancelado' and v.data >= p_desde
    order by v.data, v.inicio_slot;
end;
$$;

create or replace function public.admin_bloqueios(p_senha text, p_desde date)
returns table (barbeiro text, data date, slot int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._exige_admin(p_senha);
  return query
    select br.nome, b.data, b.slot
    from public.bloqueios b join public.barbeiros br on br.id = b.barbeiro_id
    where b.data >= p_desde;
end;
$$;

-- Confirmar, cancelar ou dar baixa. Valor vazio (null) = não mexe naquele campo.
create or replace function public.admin_status(p_senha text, p_id bigint, p_status text, p_pago text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  perform public._exige_admin(p_senha);
  if p_status is not null and p_status not in ('pendente', 'confirmado', 'cancelado') then raise exception 'dados_invalidos'; end if;
  if p_pago is not null and p_pago not in ('', 'enviado', 'pago') then raise exception 'dados_invalidos'; end if;
  v_status := case p_status when 'pendente' then 'agendado' else p_status end;
  update public.agendamentos
  set status = coalesce(v_status, status), pago = coalesce(p_pago, pago)
  where id = p_id;
  if not found then raise exception 'nao_encontrado'; end if;
end;
$$;

create or replace function public.admin_bloquear(p_senha text, p_barbeiro text, p_data date, p_slot int) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_barb_id bigint;
  v_nome text := btrim(coalesce(p_barbeiro, ''));
begin
  perform public._exige_admin(p_senha);
  if p_slot is null or p_slot < 0 or p_slot > 19 or p_data is null then raise exception 'dados_invalidos'; end if;
  if v_nome = '' then
    select min(b.id) into v_barb_id from public.barbeiros b where b.ativo;
  else
    select b.id into v_barb_id from public.barbeiros b where lower(btrim(b.nome)) = lower(v_nome) order by b.id limit 1;
  end if;
  if v_barb_id is null then raise exception 'barbeiro_invalido'; end if;
  insert into public.bloqueios (barbeiro_id, data, slot) values (v_barb_id, p_data, p_slot) on conflict do nothing;
end;
$$;

create or replace function public.admin_desbloquear(p_senha text, p_barbeiro text, p_data date, p_slot int) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_barb_id bigint;
  v_nome text := btrim(coalesce(p_barbeiro, ''));
begin
  perform public._exige_admin(p_senha);
  if v_nome = '' then
    select min(b.id) into v_barb_id from public.barbeiros b where b.ativo;
  else
    select b.id into v_barb_id from public.barbeiros b where lower(btrim(b.nome)) = lower(v_nome) order by b.id limit 1;
  end if;
  delete from public.bloqueios where barbeiro_id = v_barb_id and data = p_data and slot = p_slot;
end;
$$;

-- WhatsApp, Pix e preços (p_precos: {"Nome do serviço": 30, ...}).
create or replace function public.admin_salvar_config(p_senha text, p_whatsapp text, p_pix text, p_precos jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  perform public._exige_admin(p_senha);
  update public.config set whatsapp = btrim(coalesce(p_whatsapp, '')), pix = btrim(coalesce(p_pix, '')) where id = 1;
  for r in select key, value from jsonb_each_text(coalesce(p_precos, '{}'::jsonb)) loop
    if r.value::numeric < 0 then raise exception 'dados_invalidos'; end if;
    update public.servicos set preco = r.value::numeric where lower(btrim(nome)) = lower(btrim(r.key));
  end loop;
end;
$$;

-- ---------------------------------------------------------------- quem pode chamar o quê

revoke all on function
  public.ocupados(), public.catalogo(),
  public.agendar(date, int, int, text, text, text, text, text),
  public.meus_horarios(text), public.cancelar_meu(bigint, text), public.atualizar_meu(bigint, text, text, text),
  public._exige_admin(text), public.sou_admin(text),
  public.admin_agenda(text, date), public.admin_bloqueios(text, date), public.admin_status(text, bigint, text, text),
  public.admin_bloquear(text, text, date, int), public.admin_desbloquear(text, text, date, int),
  public.admin_salvar_config(text, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function
  public.ocupados(), public.catalogo(),
  public.agendar(date, int, int, text, text, text, text, text),
  public.meus_horarios(text), public.cancelar_meu(bigint, text), public.atualizar_meu(bigint, text, text, text),
  public.sou_admin(text),
  public.admin_agenda(text, date), public.admin_bloqueios(text, date), public.admin_status(text, bigint, text, text),
  public.admin_bloquear(text, text, date, int), public.admin_desbloquear(text, text, date, int),
  public.admin_salvar_config(text, text, text, jsonb)
  to anon, authenticated;

-- ---------------------------------------------------------------- senha do barbeiro
-- Defina a senha do painel (use 8 letras ou mais; é ela que protege os dados dos clientes). Troque o texto e rode:
--
--    update public.config set senha_painel = 'TROQUE-ESTA-SENHA' where id = 1;
--
-- Para trocar depois, rode a mesma linha com a nova senha.

