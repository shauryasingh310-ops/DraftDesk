'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  BookOpen,
  Command,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ChevronsUpDown,
  Plus,
  UserPlus,
  Check,
  Link2,
  Trash2,
} from 'lucide-react'
import { CommandPalette, type PaletteTicket, type PaletteArticle } from '@/components/command-palette'
import { useToast } from '@/components/toast'
import { authClient } from '@/lib/auth-client'
import {
  createOrganization,
  joinOrganization,
  switchOrganization,
  deleteOrganization,
  type OrgSummary,
} from '@/app/actions/org'

function Avatar({ name, image, size = 'size-8' }: { name: string; image?: string; size?: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className={cn('shrink-0 rounded-full border border-border object-cover', size)}
      />
    )
  }
  return (
    <div className={cn('grid shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary', size)}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/dashboard' },
  { href: '/tickets', label: 'Inbox', icon: TicketIcon, match: (p: string) => p.startsWith('/tickets') },
  { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen, match: (p: string) => p.startsWith('/knowledge') },
]

export function UiShell({
  children,
  tickets,
  articles,
  agentName,
  agentEmail,
  agentImage,
  orgs,
  activeOrgId,
}: {
  children: ReactNode
  tickets: PaletteTicket[]
  articles: PaletteArticle[]
  agentName: string
  agentEmail: string
  agentImage?: string
  orgs: OrgSummary[]
  activeOrgId: string
}) {
  const pathname = usePathname()
  const { toast } = useToast()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [userPanelOpen, setUserPanelOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setCollapsed(c => !c)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await authClient.signOut()
      toast({ kind: 'success', message: 'Signed out.' })
      router.push('/sign-in')
      router.refresh()
    } catch {
      setSigningOut(false)
      toast({ kind: 'error', message: 'Failed to sign out.' })
    }
  }

  const activeOrg = orgs.find(o => o.id === activeOrgId) ?? orgs[0]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-collapse md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight text-foreground">DraftDesk</span>
          )}
          {collapsed && <span className="mx-auto text-base font-bold text-primary">D</span>}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Primary">
          {NAV.map(item => {
            const active = item.match(pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-fast',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <Icon className={cn('size-4 shrink-0', active && 'text-primary')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-fast hover:bg-muted hover:text-foreground"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>

          {/* User info — opens the org panel */}
          <button
            onClick={() => setUserPanelOpen(true)}
            className={cn(
              'mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-fast hover:bg-muted',
              collapsed && 'justify-center px-0',
            )}
          >
            <Avatar name={agentName} image={agentImage} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{agentName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeOrg ? activeOrg.name : 'No organization'}
                </p>
              </div>
            )}
            {!collapsed && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-fast hover:bg-muted"
          >
            <Command className="size-3.5" />
            <span className="hidden sm:inline">Search…</span>
            <kbd className="ml-2 hidden items-center gap-0.5 rounded-sm border border-border px-1.5 py-0.5 text-xs sm:flex">
              ⌘K
            </kbd>
          </button>
        </header>

        <main key={pathname} className="min-w-0 flex-1 animate-smoke-in">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        tickets={tickets}
        articles={articles}
      />

      {userPanelOpen && (
      <UserOrgPanel
          agentName={agentName}
          agentEmail={agentEmail}
          agentImage={agentImage}
          orgs={orgs}
          activeOrgId={activeOrg?.id ?? ''}
          signingOut={signingOut}
          onSignOut={handleSignOut}
          onClose={() => setUserPanelOpen(false)}
          onChanged={() => {
            setUserPanelOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function UserOrgPanel({
  agentName,
  agentEmail,
  agentImage,
  orgs,
  activeOrgId,
  signingOut,
  onSignOut,
  onClose,
  onChanged,
}: {
  agentName: string
  agentEmail: string
  agentImage?: string
  orgs: OrgSummary[]
  activeOrgId: string
  signingOut: boolean
  onSignOut: () => void
  onClose: () => void
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [tab, setTab] = useState<'orgs' | 'profile' | 'create' | 'join'>('orgs')
  const [busy, setBusy] = useState(false)

  // profile form
  const [profileName, setProfileName] = useState(agentName)
  const [profileEmail, setProfileEmail] = useState(agentEmail)
  const [profileImage, setProfileImage] = useState('')
  // create form
  const [createName, setCreateName] = useState('')
  const [createPass, setCreatePass] = useState('')
  // join form
  const [joinId, setJoinId] = useState('')
  const [joinPass, setJoinPass] = useState('')

  const handleCreate = async () => {
    setBusy(true)
    try {
      const org = await createOrganization({ name: createName, joinPass: createPass || undefined })
      toast({ kind: 'success', message: `Created “${org.name}”. You're now active there.` })
      onChanged()
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to create organization.' })
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    setBusy(true)
    try {
      const org = await joinOrganization({ identifier: joinId, joinPass: joinPass || undefined })
      toast({ kind: 'success', message: `Joined “${org.name}”. You're now active there.` })
      onChanged()
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to join organization.' })
    } finally {
      setBusy(false)
    }
  }

  const handleSwitch = async (orgId: string) => {
    setBusy(true)
    try {
      await switchOrganization(orgId)
      toast({ kind: 'success', message: 'Switched organization.' })
      onChanged()
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to switch.' })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (org: OrgSummary) => {
    if (orgs.length <= 1) {
      toast({ kind: 'error', message: 'You cannot delete your only organization. Create another one first.' })
      return
    }
    if (!window.confirm(`Delete “${org.name}” and all its tickets, knowledge base and data? This cannot be undone.`)) {
      return
    }
    setBusy(true)
    try {
      await deleteOrganization(org.id)
      toast({ kind: 'success', message: `Deleted “${org.name}”.` })
      onChanged()
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to delete organization.' })
    } finally {
      setBusy(false)
    }
  }

  const handleUpdateProfile = async () => {
    setBusy(true)
    try {
      const payload: { name?: string; email?: string; image?: string } = {}
      if (profileName.trim() && profileName !== agentName) payload.name = profileName.trim()
      if (profileEmail.trim() && profileEmail !== agentEmail) payload.email = profileEmail.trim()
      if (profileImage.trim()) payload.image = profileImage.trim()
      if (Object.keys(payload).length === 0) {
        toast({ kind: 'error', message: 'No changes to save.' })
        return
      }
      const { error } = await authClient.updateUser(payload)
      if (error) throw new Error(error.message ?? 'Failed to update profile')
      toast({ kind: 'success', message: 'Profile updated.' })
      onChanged()
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to update profile.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-panel-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={agentName} image={agentImage} size="size-10" />
            <div>
              <p className="text-sm font-semibold text-foreground">{agentName}</p>
              <p className="text-xs text-muted-foreground">{agentEmail}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-lg leading-none text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {([
            ['orgs', 'My Orgs'],
            ['profile', 'Profile'],
            ['create', 'Create'],
            ['join', 'Join'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 font-medium transition-fast',
                tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'orgs' && (
          <div className="space-y-2">
            {orgs.length === 0 && (
              <p className="text-sm text-muted-foreground">You’re not in any organization yet. Create one or join an existing org.</p>
            )}
            {orgs.map(org => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{org.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {org.slug}
                    {org.role === 'admin' ? ' · admin' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {org.id === activeOrgId ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-status-resolved">
                      <Check className="size-3.5" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSwitch(org.id)}
                      disabled={busy}
                      className="rounded-md border border-input px-2.5 py-1 text-xs text-foreground transition-fast hover:bg-muted disabled:opacity-50"
                    >
                      Switch
                    </button>
                  )}
                  {org.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(org)}
                      disabled={busy}
                      title="Delete workspace"
                      aria-label={`Delete ${org.name}`}
                      className="grid size-7 place-items-center rounded-md border border-input text-muted-foreground transition-fast hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setTab('create')}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90"
              >
                <Plus className="size-3.5" /> New org
              </button>
              <button
                onClick={() => setTab('join')}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm text-foreground transition-fast hover:bg-muted"
              >
                <UserPlus className="size-3.5" /> Join org
              </button>
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">Changing email may require re-verification.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Avatar image URL</label>
              <input
                value={profileImage}
                onChange={e => setProfileImage(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Or upload from device
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    if (typeof reader.result === 'string') setProfileImage(reader.result)
                  }
                  reader.readAsDataURL(file)
                }}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-foreground file:transition-fast hover:file:bg-muted/70"
              />
              {profileImage && (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profileImage}
                    alt="Avatar preview"
                    className="size-10 rounded-full border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setProfileImage('')}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleUpdateProfile}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        )}

        {tab === 'create' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Organization name</label>
              <input
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="Acme Support"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Join pass (optional)
              </label>
              <input
                value={createPass}
                onChange={e => setCreatePass(e.target.value)}
                type="password"
                placeholder="Leave blank for open"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={busy || !createName.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="size-3.5" /> Create organization
            </button>
            <p className="text-xs text-muted-foreground">
              A shareable org link (slug) is generated automatically.
            </p>
          </div>
        )}

        {tab === 'join' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Org name or link
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={joinId}
                  onChange={e => setJoinId(e.target.value)}
                  placeholder="acme-support or paste invite link"
                  className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Join pass (if required)
              </label>
              <input
                value={joinPass}
                onChange={e => setJoinPass(e.target.value)}
                type="password"
                placeholder="Required pass"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
              <button
              onClick={handleJoin}
              disabled={busy || !joinId.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50"
            >
              <UserPlus className="size-3.5" /> Join organization
            </button>
          </div>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground transition-fast hover:bg-muted disabled:opacity-50"
          >
            <LogOut className="size-4" /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  )
}
