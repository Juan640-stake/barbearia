# Barbearia: agendamento pelo WhatsApp

Site simples de agendamento para barbearia. O cliente escolhe o serviço, o dia e o horário, e o WhatsApp abre com a mensagem pronta para a barbearia. O barbeiro confirma e acompanha a agenda na aba **Barbeiro** (senha da demonstração: `1234`).

Não precisa instalar nada: são só arquivos HTML, CSS e JavaScript.

```
index.html      página
css/style.css   visual
js/app.js       funcionamento
```

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e escolha o repositório.
3. Deixe tudo como está (sem comando de build, sem pasta de saída) e clique em **Deploy**.

Para testar no computador, basta abrir o `index.html` no navegador.

## Link personalizado

Os dados da barbearia vão no final do endereço, sem mexer nos arquivos:

```
https://SEU-SITE.vercel.app/?nome=Barbearia%20do%20Ze&end=Rua%20das%20Flores%2C%2045&insta=barbeariadoze&zap=85999990000&cor=b8862b
```

| Opção    | O que faz                                                   |
|----------|-------------------------------------------------------------|
| `nome`   | Nome da barbearia (no topo e nas mensagens)                 |
| `end`    | Endereço (o botão "Como chegar" abre no Google Maps)        |
| `insta`  | Instagram, sem o @ (se não tiver, o botão some)             |
| `zap`    | WhatsApp que recebe os agendamentos                         |
| `cidade` | Cidade (usada no Google Maps)                               |
| `cor`    | Cor principal em hexadecimal, sem o # (ex.: `b8862b` dourado) |

Todas são opcionais. Para mudar os serviços ou o horário de funcionamento, edite o `js/app.js`.

## Limitações da demonstração

- Os agendamentos ficam salvos só no aparelho de quem abre. Para o barbeiro ver os horários marcados em outros celulares, é preciso um servidor (por exemplo, Supabase ou Firebase).
- A senha do painel é simples e fica no próprio código.
