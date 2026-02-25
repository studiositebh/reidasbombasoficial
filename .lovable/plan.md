
Objetivo: corrigir o erro `type "public.app_role" does not exist` e concluir a criação/atualização do admin sem depender desse enum no SQL.

Diagnóstico do problema
- O erro confirma que, no banco onde você executou o script, o tipo `public.app_role` não existe.
- O script anterior falhou por usar cast explícito (`'admin'::public.app_role`).
- Isso não significa falta de acesso ao seu banco por parte do app; significa apenas que o schema real desse projeto está diferente do schema esperado pelo código/migrations.
- Para evitar novos erros, a estratégia será usar SQL compatível com ambos cenários (coluna `role` como enum ou texto), comparando `role::text`.

Plano de ação
1) Verificação rápida de schema (não altera dados)
- Conferir se o enum existe e qual é o tipo da coluna `public.user_roles.role`.
- Isso evita tentativa às cegas e confirma a estrutura atual do seu projeto.

2) Aplicar script idempotente de admin (sem `::public.app_role`)
- Criar/atualizar o usuário `douglas@dradigital.com.br` em `auth.users` com senha `comPut3r18`.
- Garantir registro em `auth.identities`.
- Garantir role `admin` em `public.user_roles` com checagem `NOT EXISTS` por `role::text = 'admin'`.
- Sem cast para enum, então funciona mesmo se `app_role` não existir.

3) Validar o resultado
- Consultar `auth.users` + `public.user_roles` para confirmar:
  - usuário existe
  - email confirmado
  - role admin atribuída
- Testar login em `/login`.

4) Hardening posterior (opcional, recomendado)
- Padronizar schema via migration (criar enum `app_role` e alinhar `user_roles.role`) apenas se você quiser aderir ao modelo tipado.
- Importante: manter roles apenas em `user_roles` (não em `profiles`/`users`) para evitar risco de privilege escalation.

SQL técnico que será usado na execução (compatível com schema sem `app_role`)
```sql
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1) Busca usuário por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'douglas@dradigital.com.br'
  LIMIT 1;

  -- 2) Cria ou atualiza usuário
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'douglas@dradigital.com.br',
      crypt('comPut3r18', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Douglas Admin"}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    RETURNING id INTO v_user_id;
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt('comPut3r18', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 3) Garante identidade de email
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'douglas@dradigital.com.br'),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = v_user_id
      AND i.provider = 'email'
  );

  -- 4) Garante role admin (sem cast para public.app_role)
  INSERT INTO public.user_roles (user_id, role)
  SELECT v_user_id, 'admin'
  WHERE EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'user_roles'
      AND c.column_name = 'role'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role::text = 'admin'
  );
END
$$;
```

Validação pós-execução
```sql
SELECT u.id, u.email, u.email_confirmed_at
FROM auth.users u
WHERE u.email = 'douglas@dradigital.com.br';

SELECT ur.user_id, ur.role::text AS role
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'douglas@dradigital.com.br';
```

Se você aprovar, eu sigo com este procedimento exatamente nessa versão (sem cast em `public.app_role`) para eliminar o erro 42704.
