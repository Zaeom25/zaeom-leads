# Zaeom Leads Manager 💎

Plataforma inteligente de prospecção B2B com enriquecimento de dados via IA.

## 🚀 Guia de Deploy

### 1. Frontend (Vercel)

1. Conecte seu repositório do GitHub na Vercel.
2. Configure as seguintes **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GROQ_API_KEY`
   - `VITE_FIRECRAWL_API_KEY`
   - `VITE_SERPER_API_KEY`
   - `VITE_TAVILY_API_KEY`
3. O arquivo `vercel.json` incluído garante que as rotas do React funcionem corretamente (SPA).

### 2. Backend (Supabase Edge Functions)

Para que o enriquecimento e o Stripe funcionem, você deve configurar os segredos no Supabase via CLI:

```bash
# Autenticação
supabase login

# Configurar segredos do Stripe
supabase secrets set STRIPE_SECRET_KEY=sua_chave_aqui
supabase secrets set STRIPE_WEBHOOK_SECRET=seu_segredo_webhook_aqui

# Configurar chaves de IA (usadas nas Edge Functions)
supabase secrets set TAVILY_API_KEY=sua_chave_aqui
supabase secrets set FIRECRAWL_API_KEY=sua_chave_aqui
supabase secrets set GROQ_API_KEY=sua_chave_aqui

# Deploy das funções
supabase functions deploy enrich-lead
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
```

### 3. Stripe Setup

1. No painel do Stripe, aponte o Webhook para: `https://[seu-projeto].supabase.co/functions/v1/stripe-webhook`
2. Ative os eventos: `checkout.session.completed`, `charge.refunded`, `invoice.payment_succeeded`, `customer.subscription.deleted`.

---
Desenvolvido por **Lumo Studio**.
