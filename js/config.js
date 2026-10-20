/* Dados da barbearia. Troque aqui para deixar o site com a cara do cliente.
   Para mostrar a outro barbeiro sem mexer neste arquivo, use o link:
   ?nome=...&end=...&cidade=...&insta=...&zap=...&pix=...&cor=...&logo=...&barbeiros=Zé,Carlos&demo=1
   O que vier pelo link fica salvo no aparelho, então o app instalado na tela inicial abre já personalizado. */
/* Banco de dados (Supabase). Cole aqui a URL do projeto e a chave pública (anon ou publishable).
   Essas duas podem ficar no site. NUNCA coloque a chave service_role aqui.
   Vazio = modo demonstração, com tudo guardado só no aparelho. */
window.SUPABASE={
  url:'https://fdjbugicpxlcpemilosd.supabase.co',   // ex.: 'https://abcdefghij.supabase.co'
  key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkamJ1Z2ljcHhsY3BlbWlsb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTE1NTEsImV4cCI6MjEwODA4NzU1MX0.zqagLeUMwq0ruim-FbMGoW0ohau4Qm2bM2HLFHHsCsg'    // ex.: 'eyJhbGciOi...' ou 'sb_publishable_...'
};

window.BARBEARIA={
  nome:'Barber Club',
  slogan:'Moderno é ser clássico',
  endereco:'Rua Joaquim Manuel de Macêdo, 2098, João XXIII',
  cidade:'Fortaleza',
  instagram:'medeiroz_dev',  // por enquanto, o Instagram do desenvolvedor. Sem o @
  whatsapp:'(85) 99634-4457',        // recebe os agendamentos
  pix:'',                    // chave Pix de verdade. Vazio mostra um Pix de teste
  cor:'#E0C48A',             // dourado da tabela de valores
  tema:'escuro',             // 'escuro', 'claro' ou '' (segue o celular)
  logo:'img/logo.png',       // se a imagem não existir, aparece um selo com o nome
  fotos:[],                  // ex.: ['img/fotos/1.jpg','img/fotos/2.jpg']. Vazio esconde a faixa
  barbeiros:[],              // ex.: ['William','Carlos']. Com um só, o cliente não precisa escolher
  senha:'1234',              // senha do painel (endereço /painel)
  demo:false,                // true mostra a etiqueta "Demonstração"
  /* Tabela de valores 2026 (Instagram @williambarberoficial_). Os tempos são estimativa: confirmar com ele. */
  servicos:[
    {id:'degrade',nome:'Corte degradê',min:30,preco:25,desc:'Máquina, tesoura e acabamento'},
    {id:'social',nome:'Corte social',min:30,preco:20,desc:'Corte clássico na tesoura e máquina'},
    {id:'degrade-barba',nome:'Corte degradê + barba',min:60,preco:40,desc:'Inclui sobrancelha'},
    {id:'sobrancelha',nome:'Sobrancelha',min:30,preco:5,desc:'Rapidinho e bem feito'},
    {id:'pigmentacao',nome:'Pigmentação',min:30,preco:15,desc:'Realça o desenho do corte'},
    {id:'nevou',nome:'Nevou + corte',min:120,preco:90,desc:'Platinado. Inclui sobrancelha'},
    {id:'luzes',nome:'Luzes + corte',min:90,preco:60,desc:'Inclui sobrancelha'},
    {id:'botox',nome:'Botox + corte',min:90,preco:50,desc:'Inclui sobrancelha'},
    {id:'relaxamento',nome:'Relaxamento + corte',min:60,preco:40,desc:'Inclui sobrancelha'}
  ]
};
