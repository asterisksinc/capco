-- Prevent Production Head sessions from seeing the Super Admin profile.
-- Production Head keeps its workflow administration privileges through
-- public.is_admin_role(); this migration narrows only public.profiles reads.

drop policy if exists "profiles_read_scoped" on public.profiles;

create policy "profiles_read_scoped"
on public.profiles
for select
to authenticated
using (
  public.has_any_role(array['super_admin'])
  or id = public.current_profile_id()
  or reports_to = public.current_profile_id()
  or id = public.current_manager_profile_id()
);
