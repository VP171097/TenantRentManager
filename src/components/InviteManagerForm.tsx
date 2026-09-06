import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { generateManagerInvite, revokeManagerInvite } from '../services/managers'
import { friendlyError } from '../utils/errors'
import type { Manager } from '../types/database'

/** Mirrors InviteTenantForm — lets the owner generate a shareable link
 * the manager can open to set their own password, as an alternative to
 * the owner setting one directly. */
export function InviteManagerForm({ manager }: { manager: Manager }) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inviteMutation = useMutation({
    mutationFn: () => generateManagerInvite(manager.id),
    onSuccess: () => {
      setCopied(false)
      queryClient.invalidateQueries({ queryKey: ['managers'] })
    },
    onError: (err: unknown) => setError(friendlyError(err)),
  })

  const revokeMutation = useMutation({
    mutationFn: () => revokeManagerInvite(manager.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['managers'] }),
    onError: (err: unknown) => setError(friendlyError(err)),
  })

  const isExpired = manager.invite_token_expires_at
    ? new Date(manager.invite_token_expires_at).getTime() < Date.now()
    : true
  const hasActiveInvite = !!manager.invite_token && !isExpired

  const inviteLink = manager.invite_token
    ? `${window.location.origin}${import.meta.env.BASE_URL}#/join?type=manager&token=${manager.invite_token}`
    : null

  async function handleCopy() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard API can fail — the link text is still visible for manual copying.
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Or invite them to set up their own login</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Share this link any way you like (WhatsApp, SMS, email). They'll set their own password.
      </p>

      {hasActiveInvite && inviteLink && (
        <div className="space-y-2 rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
          <p className="break-all text-sm text-slate-700 dark:text-slate-200">{inviteLink}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Expires {new Date(manager.invite_token_expires_at!).toLocaleDateString('en-IN')}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleCopy} className="btn-secondary flex-1">
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              type="button"
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
              className="btn-secondary flex-1"
            >
              Revoke
            </button>
          </div>
        </div>
      )}

      {!hasActiveInvite && (
        <button
          type="button"
          onClick={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending}
          className="btn-primary w-full"
        >
          {inviteMutation.isPending ? 'Generating…' : 'Generate Invite Link'}
        </button>
      )}

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  )
}
