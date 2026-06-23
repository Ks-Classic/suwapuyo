alter table display_state
add column if not exists display_event jsonb;
