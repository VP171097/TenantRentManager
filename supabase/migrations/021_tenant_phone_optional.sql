-- Allow owners to add a tenant with minimal details (name, property, room, rent)
-- and invite them to fill in their own phone/email later via the existing
-- invite-link flow. No CHECK constraints reference phone beyond NOT NULL.
alter table tenants alter column phone drop not null;
