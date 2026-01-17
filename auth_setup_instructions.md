# Configuração de Autenticação Google (OAuth)

Siga estas etapas para configurar o Google como provedor de login no Supabase.

## 1. Google Cloud Console

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um novo projeto (ex: `LumoLeads Auth`).
3.  No menu lateral, vá para **APIs e Serviços** > **Tela de permissão OAuth**.
    - Tipo de usuário: **Externo**.
    - Preencha os campos obrigatórios (Nome do App, Email, etc).
    - Salve e continue (pode pular escopos por enquanto).
4.  Vá para **Credenciais**.
    - Clique em **+ CRIAR CREDENCIAIS** > **ID do cliente OAuth**.
    - Tipo de aplicativo: **Aplicação da Web**.
    - Nome: `LumoLeads Web Client`.
    - **Origens JavaScript autorizadas**:
        - `http://localhost:3000` (ou sua porta local)
        - `https://bxpwkapmzarpirgwxldb.supabase.co` (URL do seu projeto Supabase)
        - `https://lumoleads.vercel.app` (Seu domínio de produção)
    - **URIs de redirecionamento autorizados**:
        - `https://bxpwkapmzarpirgwxldb.supabase.co/auth/v1/callback`
5.  Copie o **Client ID** e a **Client Secret**.

## 2. Supabase Dashboard

1.  Acesse o dashboard do seu projeto **LumoLeads**.
2.  Vá para **Authentication** > **Providers**.
3.  Selecione **Google** e ative (Enable).
4.  Cole o **Client ID** e **Client Secret** obtidos no passo anterior.
5.  Clique em **Save**.

## 3. URL de Redirecionamento

1.  No Supabase, vá para **Authentication** > **URL Configuration**.
2.  Em **Site URL**, coloque sua URL de produção (ex: `https://lumoleads.vercel.app`) ou desenvolvimento (`http://localhost:3000`).
3.  Em **Redirect URLs**, adicione:
    - `http://localhost:3000/dashboard`
    - `https://lumoleads.vercel.app/dashboard`
    - `http://localhost:3000`
