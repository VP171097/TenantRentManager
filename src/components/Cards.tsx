import { Link } from 'react-router-dom'
import { MapPin, DoorOpen, Users, Layers } from 'lucide-react'
import type { Property, Room, Tenant } from '../types/database'

/* ─── Avatar helper ─────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/* ─── PropertyCard ──────────────────────────────────────────────────── */
export function PropertyCard({
  property,
  roomCount,
  tenantCount,
}: {
  property: Property
  roomCount?: number
  tenantCount?: number
}) {
  return (
    <Link
      to={`/properties/${property.id}`}
      className="group block overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]"
    >
      {/* Cover image or gradient placeholder */}
      {property.cover_image_url ? (
        <div className="relative h-36 overflow-hidden">
          <img src={property.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-3 left-4 text-base font-bold text-white drop-shadow">{property.name}</p>
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-brand-600 to-violet-600">
          <div className="flex flex-col items-center gap-1">
            <Layers size={28} className="text-white/80" />
            <p className="text-sm font-bold text-white/90">{property.name}</p>
          </div>
        </div>
      )}

      <div className="p-4">
        {!property.cover_image_url && (
          <p className="font-bold text-slate-900 dark:text-slate-100 hidden">{property.name}</p>
        )}
        <p className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">{property.code}</p>
        {property.city && (
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <MapPin size={12} />
            {property.city}
          </p>
        )}
        <div className="mt-3 flex gap-3">
          {roomCount !== undefined && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <DoorOpen size={11} /> {roomCount} rooms
            </span>
          )}
          {tenantCount !== undefined && (
            <span className="flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/30 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <Users size={11} /> {tenantCount} tenants
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ─── RoomCard ──────────────────────────────────────────────────────── */
export function RoomCard({ room }: { room: Room }) {
  const isOccupied = room.status === 'occupied'
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="group block rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Room {room.room_number}</p>
          {room.floor && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Layers size={11} /> Floor {room.floor}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isOccupied
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}
        >
          {isOccupied ? 'Occupied' : 'Vacant'}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">₹{room.base_rent.toLocaleString('en-IN')}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">/mo</span>
      </div>
    </Link>
  )
}

/* ─── TenantCard ────────────────────────────────────────────────────── */
export function TenantCard({ tenant }: { tenant: Tenant }) {
  const isActive = tenant.status === 'active'
  const color = avatarColor(tenant.full_name)
  const ini = initials(tenant.full_name)

  return (
    <Link
      to={`/tenants/${tenant.id}`}
      className="group block rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {tenant.avatar_url ? (
          <img src={tenant.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
        ) : (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${color}`}>
            {ini}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold text-slate-900 dark:text-slate-100">{tenant.full_name}</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {isActive ? 'Active' : 'Moved Out'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
            {tenant.phone || 'No phone on file'}
          </p>
          {tenant.move_in_date && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Moved in {new Date(tenant.move_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
