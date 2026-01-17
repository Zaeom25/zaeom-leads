# Setting up Inbound Leads (Make.com Integration)

To get leads from `lumostudio.com.br` directly into LumoCRM, we use a Webhook.

## Overview
1.  **Form Submission**: User fills form on your site.
2.  **Make.com Scenario**: Catches the data.
3.  **Supabase Action**: Inserts the data into your `leads` table.

## Step 1: Prepare Database (Supabase)
Ensure you have created a table named `leads` in Supabase with these columns:
- `id` (uuid, primary key)
- `businessName` (text)
- `phoneNumber` (text)
- `source` (text, default 'inbound')
- `status` (text, default 'NEW')
- `created_at` (timestamp)

## Step 2: Make.com Scenario
1.  **Trigger**: Webhook "Custom Webhook".
    *   Copy the URL provided by Make.
    *   Set your website form to POST to this URL.
2.  **Action**: Supabase "Create a Row".
    *   **Connection**: Enter your Supabase URL and Key found in Project Settings > API.
    *   **Table**: Select `leads`.
    *   **Map Fields**:
        *   `businessName` -> Form Name/Company
        *   `phoneNumber` -> Form Phone
        *   `source` -> "inbound"
        *   `status` -> "NEW"

## Step 3: Test
Submit a form on your site and check LumoCRM "Pipeline" view. You should see a green badge marked "INBOUND".
