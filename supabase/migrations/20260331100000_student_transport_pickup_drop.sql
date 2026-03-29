-- Pickup/drop stop mapping and transport fee on students (route mapping module).

ALTER TABLE students ADD COLUMN IF NOT EXISTS transport_pickup_stop_id UUID REFERENCES transport_stops(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS transport_dropoff_stop_id UUID REFERENCES transport_stops(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS transport_custom_fare NUMERIC(12,2);
ALTER TABLE students ADD COLUMN IF NOT EXISTS transport_fee NUMERIC(12,2);

COMMENT ON COLUMN students.transport_pickup_stop_id IS 'Stop where student boards; fare uses pickup_fare from transport_stops.';
COMMENT ON COLUMN students.transport_dropoff_stop_id IS 'Stop where student alights; fare uses drop_fare from transport_stops.';
COMMENT ON COLUMN students.transport_custom_fare IS 'Optional override: when NOT NULL, replaces computed pickup+drop total for billing.';
COMMENT ON COLUMN students.transport_fee IS 'Effective recurring transport charge (computed from stops or custom_fare).';
