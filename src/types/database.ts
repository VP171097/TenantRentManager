// Core domain types mirroring the Supabase/Postgres schema.
// All money fields are stored as numeric(12,2) in Postgres and represented
// as plain `number` here; utils/money.ts provides safe arithmetic helpers
// that avoid floating point drift by working in integer paise internally.

export type Role = 'owner' | 'manager' | 'tenant'

export interface Profile {
  id: string // = auth.users.id
  role: Role
  full_name: string
  email: string | null
  phone: string | null
  owner_id: string | null // for managers/tenants: the owner they belong to
  upi_id: string | null // owner's UPI ID for collecting rent payments (only meaningful on owner rows)
  created_at: string
}

export interface Property {
  id: string
  owner_id: string
  name: string
  code: string // short code used in receipt numbers, e.g. KR
  address: string | null
  city: string | null
  created_at: string
}

export type RoomStatus = 'vacant' | 'occupied'

export interface Room {
  id: string
  property_id: string
  room_number: string
  floor: string | null
  status: RoomStatus
  base_rent: number
  notes: string | null
  created_at: string
}

export type TenantStatus = 'active' | 'moved_out'

export interface Tenant {
  id: string
  owner_id: string
  property_id: string
  room_id: string | null
  profile_id: string | null // linked auth user for tenant login, nullable
  full_name: string
  phone: string
  email: string | null
  status: TenantStatus
  move_in_date: string
  move_out_date: string | null
  security_deposit: number
  created_at: string
}

export interface TenantDocument {
  id: string
  tenant_id: string
  owner_id: string
  file_path: string
  file_name: string
  uploaded_at: string
  expires_at: string | null
}

export interface RentRevision {
  id: string
  tenant_id: string
  effective_date: string
  rent_amount: number
  change_type: 'initial' | 'fixed' | 'percentage'
  change_value: number | null
  created_at: string
  created_by: string | null
}

export interface ElectricityReading {
  id: string
  room_id: string
  tenant_id: string
  billing_month: string // YYYY-MM-01
  previous_reading: number
  current_reading: number
  rate_per_unit: number
  is_meter_reset: boolean
  reset_explanation: string | null
  created_at: string
}

export type BillStatus = 'paid' | 'partial' | 'unpaid' | 'overdue'

export interface Bill {
  id: string
  tenant_id: string
  property_id: string
  room_id: string
  billing_month: string // YYYY-MM-01
  rent_amount: number
  electricity_units: number
  electricity_charge: number
  other_charges: number
  late_fee: number
  previous_balance: number // positive = carried outstanding
  previous_credit: number // positive = carried credit
  total_due: number
  total_paid: number
  balance: number // positive = outstanding, negative = credit
  status: BillStatus
  generated_at: string
  notes: string | null
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'

export interface Payment {
  id: string
  bill_id: string
  tenant_id: string
  amount: number
  payment_date: string
  method: PaymentMethod
  reference: string | null
  recorded_by: string | null
  created_at: string
}

export interface Receipt {
  id: string
  receipt_number: string
  payment_id: string
  tenant_id: string
  property_id: string
  generated_at: string
}

export interface Manager {
  id: string
  profile_id: string
  owner_id: string
  full_name: string
  email: string | null
  phone: string | null
  created_at: string
}

export interface ManagerPermission {
  id: string
  manager_id: string
  property_id: string
  can_view_tenants: boolean
  can_edit_tenants: boolean
  can_enter_electricity: boolean
  can_record_payments: boolean
  can_generate_receipts: boolean
  can_view_ledger: boolean
  can_edit_rent: boolean
  can_manage_rooms: boolean
}

export interface TenantRoomHistory {
  id: string
  tenant_id: string
  from_room_id: string | null
  to_room_id: string
  transfer_date: string
  reason: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  owner_id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      properties: { Row: Property; Insert: Partial<Property>; Update: Partial<Property> }
      rooms: { Row: Room; Insert: Partial<Room>; Update: Partial<Room> }
      tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant> }
      tenant_documents: { Row: TenantDocument; Insert: Partial<TenantDocument>; Update: Partial<TenantDocument> }
      rent_revisions: { Row: RentRevision; Insert: Partial<RentRevision>; Update: Partial<RentRevision> }
      electricity_readings: { Row: ElectricityReading; Insert: Partial<ElectricityReading>; Update: Partial<ElectricityReading> }
      bills: { Row: Bill; Insert: Partial<Bill>; Update: Partial<Bill> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      receipts: { Row: Receipt; Insert: Partial<Receipt>; Update: Partial<Receipt> }
      managers: { Row: Manager; Insert: Partial<Manager>; Update: Partial<Manager> }
      manager_permissions: { Row: ManagerPermission; Insert: Partial<ManagerPermission>; Update: Partial<ManagerPermission> }
      tenant_room_history: { Row: TenantRoomHistory; Insert: Partial<TenantRoomHistory>; Update: Partial<TenantRoomHistory> }
      audit_log: { Row: AuditLogEntry; Insert: Partial<AuditLogEntry>; Update: Partial<AuditLogEntry> }
    }
  }
}
