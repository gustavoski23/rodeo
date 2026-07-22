-- ═══════════════════════════════════════════════════════════════════════
-- Higiene de seguridad — silenciar las 2 warnings del Security Advisor
-- ---------------------------------------------------------------------
-- public.rls_auto_enable() la crea Supabase sola al activar "automatic RLS"
-- en el proyecto: es un event trigger que pone RLS a cada tabla nueva del
-- schema public. Al ser SECURITY DEFINER y quedar EXECUTE-able por los roles
-- anon/authenticated, el advisor la marca (0028/0029) aunque el riesgo real
-- es nulo (invocarla suelta por la API no expone datos; a lo sumo intenta
-- ACTIVAR seguridad).
--
-- Revocar el EXECUTE a los roles públicos NO rompe el auto-RLS: el event
-- trigger se dispara con los privilegios del owner cuando ocurre el DDL, no
-- depende de que anon/authenticated tengan EXECUTE. Con esto las 2 warnings
-- desaparecen. `revoke` es idempotente: si el permiso ya no está, no falla.
--
-- Nota: la función solo existe si "automatic RLS" está activo. El guard
-- evita romper `db reset` en un entorno donde no exista.
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end $$;
