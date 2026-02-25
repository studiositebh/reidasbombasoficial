
# Sincronizar Usuarios da Tabela Profiles para Auth

## Problema
Os logins nao estao funcionando porque existem registros na tabela `profiles` sem usuarios correspondentes na tabela `auth.users` do Supabase.

## Solucao
Criar uma edge function administrativa que:
1. Le todos os perfis da tabela `profiles`
2. Para cada perfil que nao tenha um usuario auth valido, cria o usuario no `auth.users` com uma senha padrao
3. Retorna um relatorio de quantos usuarios foram sincronizados

## Plano de Implementacao

### 1. Criar Edge Function `sync-profiles-to-auth`

Nova edge function em `supabase/functions/sync-profiles-to-auth/index.ts` que:
- Usa o service role key para acessar auth.admin
- Busca todos os perfis da tabela `profiles`
- Para cada perfil, verifica se o usuario existe em auth.users (pelo `user_id`)
- Se nao existir, cria o usuario com:
  - Email baseado no nome ou documento (sera necessario ter email na profiles, ou perguntar ao usuario)
  - Senha padrao: `ReiDasBombas2024!` (igual para todos)
  - `email_confirm: true` para pular verificacao
- Se existir mas a senha nao funcionar, reseta a senha para a padrao

**Problema potencial**: A tabela `profiles` nao tem coluna `email`. O email fica em `auth.users`. Se os usuarios nao existem em auth, nao temos email para criar.

### 2. Abordagem Alternativa (mais provavel)
Se os usuarios ja existem em `auth.users` mas as senhas estao incorretas/esquecidas:
- Criar edge function que lista todos os usuarios de auth.users
- Reseta a senha de todos para uma senha padrao `ReiDasBombas2024!`
- Garante que todos tenham `email_confirmed = true`

### 3. Endpoint para chamar
- Adicionar um botao temporario na pagina de admin ou chamar via curl
- A function so pode ser chamada por um admin autenticado (ou usar service role diretamente)

## Detalhes Tecnicos

### Edge Function `sync-profiles-to-auth/index.ts`
```text
1. Recebe POST request (protegido por service role ou admin check)
2. Busca todos profiles com seus user_ids
3. Para cada user_id:
   a. Tenta buscar usuario em auth via admin.getUserById
   b. Se existir: reseta senha para "ReiDasBombas2024!"
   c. Se nao existir: log de erro (sem email nao da pra criar)
4. Retorna JSON com resultados
```

### Pagina Admin - Botao de Sync (temporario)
- Adicionar botao na pagina admin/Users ou admin/Dashboard
- Chama a edge function e mostra resultado via toast

### Senha Padrao
- Todos os usuarios terao a senha: `ReiDasBombas2024!`
- Atende requisito minimo de 6 caracteres
- Usuarios devem ser orientados a trocar a senha apos primeiro login
