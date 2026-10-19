# Barbearia: agendamento pelo WhatsApp

Site de agendamento para barbearia. O cliente escolhe o serviço, o barbeiro, o dia e o horário, e o WhatsApp abre com a mensagem pronta para a barbearia. O barbeiro confirma e acompanha a agenda e os clientes no painel.

Não precisa instalar nada: são só arquivos HTML, CSS e JavaScript.

```
index.html            página do cliente
painel/index.html     painel do barbeiro (endereço /painel, com senha)
js/config.js          dados da barbearia: nome, endereço, serviços, preços, barbeiros, fotos, senha
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

## Limitações atuais

- Os agendamentos ficam salvos só no aparelho de quem abre. Para o barbeiro ver no painel o que os clientes marcam nos celulares deles, falta um servidor (por exemplo, Supabase).
- Lembretes e confirmações abrem o WhatsApp com a mensagem pronta, mas o envio é manual.
- A senha do painel fica no próprio código: serve para afastar curiosos, não é segurança de verdade.
