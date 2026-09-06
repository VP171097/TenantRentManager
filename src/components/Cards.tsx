import { Link } from 'react-router-dom'
import type { Property, Room, Tenant } from '../types/database'

export function PropertyCard({ property, roomCount, tenantCount }: { property: Property; roomCount?: number; tenantCount?: number }) {
  return (
    <Link
      to={`/properties/${property.id}`}
      className="block overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-md active:scale-[0.98]"
    >
      {property.cover_image_url && (
        <img src={property.cover_image_url} alt="" className="h-32 w-full object-cover" />
      )}
      <div className="p-5">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{property.name}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{property.code}</p>
        {property.city && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{property.city}</p>}
        <div className="mt-3 flex gap-4 text-sm text-slate-600 dark:text-slate-300">
          {roomCount !== undefined && <span>{roomCount} rooms</span>}
          {tenantCount !== undefined && <span>{tenantCount} tenants</span>}
        </div>
      </div>
    </Link>
  )
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="block rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Room {room.room_number}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            room.status === 'occupied'
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {room.status === 'occupied' ? 'Occupied' : 'Vacant'}
        </span>
      </div>
      {room.floor && <p className="text-sm text-slate-500 dark:text-slate-400">Floor {room.floor}</p>}
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">₹{room.base_rent.toLocaleString('en-IN')}/month</p>
    </Link>
  )
}

export function TenantCard({ tenant }: { tenant: Tenant }) {
  return (
    <Link
      to={`/tenants/${tenant.id}`}
      className="block rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{tenant.full_name}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tenant.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {tenant.status === 'active' ? 'Active' : 'Moved Out'}
        </span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{tenant.phone || 'No phone on file'}</p>
    </Link>
  )
}
