import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: bills } = await supabase.from('bills').select('id, billing_month, electricity_units, electricity_charge, tenant_id').order('billing_month', { ascending: false })
  const { data: readings } = await supabase.from('electricity_readings').select('*').order('billing_month', { ascending: false })
  console.log('Bills:')
  console.log(JSON.stringify(bills, null, 2))
  console.log('Readings:')
  console.log(JSON.stringify(readings, null, 2))
}
run()
