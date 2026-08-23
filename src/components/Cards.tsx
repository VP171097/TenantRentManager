import { Link } from 'react-router-dom'
import type { Property, Room, Tenant } from '../types/database'

export function PropertyCard({ property, roomCount, tenantCount }: { property: Property; roomCount?: number; tenantCount?: number }) {
  return (
    <Link
      to={`/properties/${property.id}`}
      className="block rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <p className="text-lg font-bold text-slate-900">{property.name}</p>
      <p className="text-sm text-slate-500">{property.code}</p>
      {property.city && <p className="mt-1 text-sm text-slate-500">{property.city}</p>}
      <div className="mt-3 flex gap-4 text-sm text-slate-600">
        {roomCount !== undefined && <span>{roomCount} rooms</span>}
        {tenantCount !== undefined && <span>{tenantCount} tenants</span>}
      </div>
    </Link>
  )
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="block rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-slate-900">Room {room.room_number}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            room.status === 'occupied' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {room.status === 'occupied' ? 'Occupied' : 'Vacant'}
        </span>
      </div>
      {room.floor && <p className="text-sm text-slate-500">Floor {room.floor}</p>}
      <p className="mt-2 text-sm text-slate-600">₹{room.base_rent.toLocaleString('en-IN')}/month</p>
    </Link>
  )
}

export function TenantCard({ tenant }: { tenant: Tenant }) {
  return (
    <Link
      to={`/tenants/${tenant.id}`}
      className="block rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-slate-900">{tenant.full_name}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {tenant.status === 'active' ? 'Active' : 'Moved Out'}
        </span>
      </div>
      <p className="text-sm text-slate-500">{tenant.phone}</p>
    </Link>
  )
}
