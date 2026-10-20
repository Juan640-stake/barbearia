# Barbearia: agendamento pelo WhatsApp

Site de agendamento para barbearia. O cliente escolhe o serviço, o barbeiro, o dia e o horário, e o WhatsApp abre com a mensagem pronta para a barbearia. O barbeiro confirma e acompanha a agenda e os clientes no painel.

Não precisa instalar nada: são só arquivos HTML, CSS e JavaScript.

```
index.html            página do cliente
painel/index.html     painel do barbeiro (endereço /painel, com senha)
js/config.js          dados da barbearia: nome, endereço, serviços, preços, barbeiros, fotos, senha, chaves do banco
js/db.js              ligação com o banco (Supabase)
js/app.js             funcionamento
css/style.css         visual
manifest.webmanifest  instalar como aplicativo no celular
sw.js                 abre o app mesmo sem internet
icons/                ícones do aplicativo
```

## Personalizar para um barbeiro

Edite o [js/config.js](js/config.js). Fotos e logo podem ir numa pasta `img/`, por exemplo `img/logo.png` e `img/fotos/1.jpg`.

Para uma demonstração rápida, sem editar arquivos, use o link:

```
https://SEU-SITE.vercel.app/?nome=Barbearia%20do%20Ze&end=Rua%20das%20Flores%2C%2045&insta=barbeariadoze&zap=85999990000&cor=b8862b&barbeiros=Ze,Carlos
```

| Opção       | O que faz                                                  |
|-------------|------------------------------------------------------------|
| `nome`      | Nome da barbearia                                          |
| `end`       | Endereço (o botão de mapa abre no Google Maps)             |
| `cidade`    | Cidade                                                     |
| `insta`     | Instagram, sem o @                                         |
| `zap`       | WhatsApp que recebe os agendamentos                        |
| `cor`       | Cor principal em hexadecimal, sem o # (ex.: `b8862b`)      |
| `logo`      | Endereço de uma imagem de logo                             |
| `barbeiros` | Nomes separados por vírgula. Com dois ou mais, o cliente escolhe |
| `demo`      | `1` mostra a etiqueta "Demonstração"                       |

O que vem pelo link fica salvo no aparelho, então o painel e o app instalado na tela inicial abrem já personalizados.

## Painel do barbeiro

Fica em `/painel` e não aparece no menu do cliente. A senha está no `js/config.js` (padrão `1234`). No painel ele confirma horários, bloqueia horários, manda lembrete pelo WhatsApp, ajusta os preços e vê a lista de clientes, com destaque para quem sumiu há mais de 30 dias.

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e escolha o repositório.
3. Deixe tudo como está (sem comando de build, sem pasta de saída) e clique em **Deploy**.

## Banco de dados (Supabase)

Com o banco ligado, o cliente marca no celular dele e o barbeiro vê na hora no painel. Sem ele, o site funciona como demonstração, guardando tudo só no aparelho.

```
supabase/migracao.sql  ajusta o banco que já existe (rodar uma vez no Supabase; pode rodar de novo)
js/db.js               toda a conversa do site com o banco
js/vendor/supabase.js  biblioteca do Supabase (cópia local, sem depender de CDN)
```

O `supabase/schema.sql` é de uma versão antiga e não deve ser usado.

A migração usa as tabelas que já existem (`clientes`, `barbeiros`, `servicos`, `agendamentos`) e só acrescenta o que falta. Ela não apaga dados.

Para ligar:

1. No Supabase, abra **SQL Editor**, cole o `supabase/migracao.sql` e clique em **Run**.
2. Defina a senha do painel (8 letras ou mais, é ela que protege os dados dos clientes):
   `update public.config set senha_painel = 'SUA-SENHA' where id = 1;`
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon** (ou **publishable**) e cole em `js/config.js`, no bloco `window.SUPABASE`. Nunca use a `service_role`.
4. Suba para o GitHub. A Vercel publica sozinha.

Pontos de atenção:

- **Nomes iguais:** o site e o banco se encontram pelo nome. Os serviços de `js/config.js` precisam ter o mesmo nome dos da tabela `servicos` (maiúsculas e acentos não importam), e o mesmo vale para os barbeiros. Se as tabelas estiverem vazias, a migração cria 1 barbeiro e os 9 serviços do `js/config.js`.
- **Tabelas trancadas:** a migração apaga as regras de acesso antigas dessas tabelas e fecha o acesso direto. O site só conversa com o banco por funções, então ninguém lê nome ou telefone de cliente sem estar logado como barbeiro.
- **Expediente:** a tabela `expediente` não é usada. Os horários de funcionamento (seg a sex 9h às 19h, sábado até 16h, almoço 12h às 13h, domingo fechado) estão em dois lugares: `nSlots()` no `js/app.js` e `slots_do_dia()` no `supabase/migracao.sql`. Se mudar um, mude o outro.

O que cada pessoa consegue fazer:

- **Cliente (sem login):** ver quais horários estão ocupados, agendar, consultar e cancelar os horários do próprio WhatsApp (até 2 horas antes) e avisar que fez o Pix. Não vê nome nem telefone de ninguém.
- **Barbeiro (senha em `/painel`):** vê a agenda e os clientes, confirma, dá baixa no pagamento, cancela, bloqueia horários e ajusta WhatsApp, Pix e preços.

O servidor também impede dois clientes no mesmo horário com o mesmo barbeiro, agendamento em domingo, almoço ou dia que já passou, e mais de 3 horários futuros por telefone.

## Limitações atuais

- A tela se atualiza a cada 30 segundos e quando a pessoa volta para o app. Não é em tempo real.
- Lembretes e confirmações abrem o WhatsApp com a mensagem pronta, mas o envio é manual.
- Quem souber o WhatsApp de um cliente consegue consultar e cancelar o horário dele. Para uma barbearia pequena isso é aceitável; para mais proteção, o próximo passo seria um código enviado por mensagem.
- Os preços não ficam gravados em cada agendamento: mudar o preço de um serviço muda o valor mostrado nos agendamentos antigos.
- Sem as chaves em `js/config.js`, os agendamentos ficam salvos só no aparelho de quem abre, e a senha do painel (`senha` no `js/config.js`) serve só para afastar curiosos.
