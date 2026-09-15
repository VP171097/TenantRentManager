-- Add electricity_rate to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS electricity_rate numeric(10,2) not null default 0;
