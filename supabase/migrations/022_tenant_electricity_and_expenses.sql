-- Add electricity fields to tenants
ALTER TABLE tenants
ADD COLUMN electricity_start_reading numeric DEFAULT 0 NOT NULL,
ADD COLUMN electricity_rate numeric DEFAULT 0 NOT NULL;

-- Add charge_to_tenant field to expenses
ALTER TABLE expenses
ADD COLUMN charge_to_tenant boolean DEFAULT false NOT NULL;
