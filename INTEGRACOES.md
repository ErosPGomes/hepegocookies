# InfinitePay + frete combinado pelo WhatsApp

O site continua estático. Todas as credenciais e chamadas externas ficam no Cloudflare Worker em `worker/`. Os pedidos, cotações, eventos e tokens OAuth ficam no D1.

## Fluxo principal implementado

1. Sem selecionar cartão, o cliente monta o carrinho e finaliza diretamente pelo WhatsApp.
2. Ao selecionar o banner de cartão, o cliente precisa confirmar que o frete não está incluído e será pago separadamente via Pix.
3. `POST /api/checkout` valida os itens e preços contra o catálogo do Worker, registra o aceite e cria um link InfinitePay somente com os produtos.
4. A InfinitePay chama `POST /api/webhook/infinitepay`. Como a InfinitePay não documenta assinatura para esse webhook, o Worker sempre confirma a transação em `payment_check` antes de marcar o pedido como pago.
5. A página `/obrigado/` confirma o pagamento e abre o WhatsApp com número do pedido, cliente, produtos, endereço e aviso de frete pendente.
6. O frete é combinado no WhatsApp e pago separadamente via Pix.

Os endpoints Uber Direct permanecem no Worker para eventual uso futuro, mas não participam do fluxo comercial acima e nenhuma entrega Uber é criada automaticamente para pedidos com `checkout_mode = card_whatsapp_freight`.

## Pré-requisitos de domínio

`hepego.com.br` está em uma zona Cloudflare ativa, com os registros do GitHub Pages usando proxy (nuvem laranja). A rota do Worker intercepta somente `hepego.com.br/api/*`; o restante continua sendo servido pelo site estático.

Estado atual da configuração:

- Zona Cloudflare ativa (`hepego.com.br`).
- Registros A do GitHub Pages, CNAME de `www` e TXT do Google já copiados.
- Nameservers atribuídos: `mckinley.ns.cloudflare.com` e `memphis.ns.cloudflare.com`.
- Worker de teste: `https://hepego-checkout.hepego-checkout.workers.dev`.
- API de produção: `https://hepego.com.br/api/*`.

Antes de trocar os nameservers no Registro.br, trate o DNSSEC existente conforme a orientação do registrador. Depois que a zona ficar `Active`, reative o DNSSEC pela Cloudflare e só então publique a rota definitiva do Worker.

## Criação do D1

Autentique o Wrangler e crie o banco:

```powershell
npx wrangler login
npx wrangler d1 create hepego-orders
```

Copie o `database_id` retornado para `wrangler.jsonc`. Depois aplique a migration:

```powershell
npm run db:migrate:remote
```

## Secrets de produção

Execute cada comando e cole o valor apenas no prompt do Wrangler:

```powershell
npx wrangler secret put INFINITEPAY_HANDLE
npx wrangler secret put UBER_CLIENT_ID
npx wrangler secret put UBER_CLIENT_SECRET
npx wrangler secret put UBER_CUSTOMER_ID
npx wrangler secret put UBER_WEBHOOK_SIGNING_KEY
npx wrangler secret put SITE_ORIGIN
npx wrangler secret put PICKUP_PHONE_NUMBER
npx wrangler secret put PICKUP_ADDRESS
npx wrangler secret put ADMIN_API_KEY
```

Valores conhecidos:

- `INFINITEPAY_HANDLE`: `hepego-cookies`
- `SITE_ORIGIN`: `https://hepego.com.br`
- `PICKUP_PHONE_NUMBER`: `+5541987172296`
- `PICKUP_ADDRESS`: endereço da cozinha no formato JSON abaixo.
- `PICKUP_LATITUDE`: `-25.4548376`
- `PICKUP_LONGITUDE`: `-49.0493385`

```json
{
  "street_address": ["Rua Alberto Ribeiro, 424", ""],
  "city": "Piraquara",
  "state": "PR",
  "zip_code": "83305310",
  "country": "BR"
}
```

`ADMIN_API_KEY` deve ser um valor aleatório longo. Ele protege a repetição manual de uma entrega. Exemplo de geração no PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

## Webhook da Uber

No painel do Uber Direct, abra **Developer → Webhooks**, crie um webhook para:

```text
https://hepego.com.br/api/webhook/uber
```

Selecione os eventos de status da entrega. Copie a Signing Key gerada e salve-a em `UBER_WEBHOOK_SIGNING_KEY` com o comando acima. O Worker valida `x-uber-signature`/`x-postmates-signature` usando HMAC-SHA256 sobre o corpo bruto.

O webhook da InfinitePay não precisa ser configurado no painel: sua URL é enviada ao criar cada checkout.

## Desenvolvimento local

Copie `.dev.vars.example` para `.dev.vars`, preencha apenas as credenciais de sandbox e aplique o banco local:

```powershell
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev:worker
```

Sirva os arquivos estáticos em outra janela:

```powershell
npx http-server . -p 8080
```

Para o frontend local alcançar o Worker, use um proxy local ou teste os endpoints diretamente em `http://localhost:8787`. Em produção, frontend e API compartilham `hepego.com.br`.

## Deploy e verificação

```powershell
npm run check
npx wrangler deploy --dry-run
npm run deploy:worker
```

Depois do deploy:

```powershell
Invoke-RestMethod https://hepego.com.br/api/health
```

Teste primeiro com as credenciais de sandbox Uber e uma compra controlada na InfinitePay. Só altere para as credenciais Uber de produção depois de validar cotação, reconciliação, idempotência e atualização do webhook.

## Reprocessamento administrativo da entrega

Use apenas quando o pedido estiver pago e a entrega estiver em `failed` ou `needs_review`:

```powershell
$headers = @{ Authorization = "Bearer SEU_ADMIN_API_KEY" }
$body = @{ order_nsu = "REFERENCIA_DO_PEDIDO" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri https://hepego.com.br/api/entrega/criar -Headers $headers -ContentType application/json -Body $body
```

Não coloque nenhuma credencial nos arquivos HTML/JS, no histórico do Git ou em mensagens públicas.
