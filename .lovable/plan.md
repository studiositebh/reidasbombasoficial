

# Resetar Senhas via Migration SQL

## Problema Identificado
As Edge Functions (como `check-admin` e `sync-profiles-to-auth`) retornam **404** porque nao estao sendo deployadas ao projeto Supabase (`kpkxnqlrgkmgbbmishaw`). As alteracoes no codigo das functions nao chegam ao servidor.

## Solucao: Migration SQL
Em vez de depender de Edge Functions, vamos usar uma **migration SQL** que e aplicada diretamente no banco de dados. O Supabase permite atualizar senhas diretamente na tabela `auth.users` usando a funcao `crypt()` do PostgreSQL.

## Plano

### 1. Criar migration SQL
Criar um arquivo em `supabase/migrations/` que:
- Atualiza o campo `encrypted_password` de todos os usuarios em `auth.users` que possuem um perfil correspondente na tabela `profiles`
- Define a senha padrao `ReiDasBombas2024!` para todos
- Garante que `email_confirmed_at` esteja preenchido (confirma todos os emails)

### 2. Limpar codigo temporario
- Remover o botao "Sincronizar usuarios" da pagina de Login
- Remover o estado `showSyncAction` e `isSyncingUsers`
- Simplificar o `handleLogin` removendo a logica de sync

### 3. Detalhes tecnicos da migration

```text
SQL Migration:
- UPDATE auth.users
- SET encrypted_password = crypt('ReiDasBombas2024!', gen_salt('bf'))
- SET email_confirmed_at = NOW() (para usuarios sem confirmacao)
- WHERE id IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL)
```

A funcao `crypt()` com `gen_salt('bf')` usa bcrypt, que e o mesmo algoritmo usado pelo Supabase Auth internamente.

### Resultado esperado
Apos a migration ser aplicada, todos os usuarios que tem perfil na tabela `profiles` poderao fazer login com a senha `ReiDasBombas2024!`.
