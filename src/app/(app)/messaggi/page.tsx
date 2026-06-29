'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Store, User, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface UserConv {
  id: string
  last_message: string | null
  last_at: string
  unread_user: number
  shops: { id: string; name: string; image_url: string | null; city: string } | null
}

interface ShopConv {
  id: string
  last_message: string | null
  last_at: string
  unread_shop: number
  profiles: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null
}

function timeAgo(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'adesso'
  if (m < 60) return `${m} min fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  return `${Math.floor(h / 24)}g fa`
}

export default function MessaggiPage() {
  const router   = useRouter()
  const sbRef    = useRef(createClient())
  const supabase = sbRef.current

  const [userConvs, setUserConvs] = useState<UserConv[]>([])
  const [shopConvs, setShopConvs] = useState<ShopConv[]>([])
  const [myShop,    setMyShop]    = useState<{ id: string; name: string } | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: shop } = await supabase
        .from('shops').select('id, name').eq('owner_id', user.id).single()

      const [{ data: asUser }, { data: asShop }] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, last_message, last_at, unread_user, shops(id, name, image_url, city)')
          .eq('user_id', user.id)
          .order('last_at', { ascending: false })
          .limit(50),
        shop
          ? supabase
              .from('conversations')
              .select('id, last_message, last_at, unread_shop, profiles(id, username, full_name, avatar_url)')
              .eq('shop_id', shop.id)
              .order('last_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: null }),
      ])

      if (!mounted) return
      if (shop) setMyShop(shop)
      setUserConvs((asUser ?? []) as unknown as UserConv[])
      setShopConvs((asShop ?? []) as unknown as ShopConv[])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [])

  // Realtime separato — con cleanup corretto
  useEffect(() => {
    const channel = supabase
      .channel('inbox-convs')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, payload => {
        const u = payload.new as { id: string; last_message: string | null; last_at: string; unread_user: number; unread_shop: number }
        // Aggiorna solo i campi piatti — non toccare i join (shops/profiles)
        setUserConvs(prev =>
          prev.map(c => c.id === u.id
            ? { ...c, last_message: u.last_message, last_at: u.last_at, unread_user: u.unread_user }
            : c
          ).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
        )
        setShopConvs(prev =>
          prev.map(c => c.id === u.id
            ? { ...c, last_message: u.last_message, last_at: u.last_at, unread_shop: u.unread_shop }
            : c
          ).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const totalUnread = userConvs.reduce((s, c) => s + (c.unread_user ?? 0), 0)
                   + shopConvs.reduce((s, c) => s + (c.unread_shop ?? 0), 0)

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted text-sm">
      Caricamento messaggi...
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle size={22} className="text-sienna" />
        <h1 className="font-serif font-bold text-espresso text-[22px]">Messaggi</h1>
        {totalUnread > 0 && (
          <span className="text-[11px] font-bold bg-sienna text-white px-2 py-0.5 rounded-full">
            {totalUnread}
          </span>
        )}
      </div>

      {userConvs.length === 0 && shopConvs.length === 0 && (
        <div className="text-center py-20">
          <MessageCircle size={40} className="text-border mx-auto mb-4" />
          <p className="font-serif text-espresso text-[16px] mb-2">Nessun messaggio</p>
          <p className="text-muted text-[13px]">Inizia una conversazione dalla pagina di un negozio.</p>
          <Link href="/negozi"
            className="mt-6 inline-flex items-center gap-2 bg-espresso text-parchment font-semibold px-5 py-2.5 rounded-xl text-[13px] hover:bg-sienna transition-colors">
            Esplora negozi
          </Link>
        </div>
      )}

      {userConvs.length > 0 && (
        <div className="mb-8">
          {myShop && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-3 flex items-center gap-1.5">
              <User size={10} /> Come utente
            </p>
          )}
          <div className="space-y-2">
            {userConvs.map(c => {
              const shop = c.shops
              const unread = c.unread_user ?? 0
              return (
                <Link key={c.id} href={`/messaggi/${c.id}?as=user`}
                  className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3.5 hover:border-sienna/30 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-cream border border-border overflow-hidden flex-shrink-0">
                    {shop?.image_url
                      ? <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name ?? ''} />
                      : <div className="w-full h-full flex items-center justify-center"><Store size={16} className="text-muted" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[13px] font-bold text-espresso truncate group-hover:text-sienna transition-colors">
                        {shop?.name ?? 'Negozio'}
                      </p>
                      <span className="text-[10px] text-muted flex items-center gap-1 flex-shrink-0 ml-2">
                        <Clock size={9} /> {timeAgo(c.last_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted truncate">{c.last_message ?? 'Inizia la conversazione...'}</p>
                  </div>
                  {unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-sienna text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {unread}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {shopConvs.length > 0 && myShop && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-3 flex items-center gap-1.5">
            <Store size={10} /> Come {myShop.name}
          </p>
          <div className="space-y-2">
            {shopConvs.map(c => {
              const profile = c.profiles
              const unread  = c.unread_shop ?? 0
              const name    = profile?.full_name ?? profile?.username ?? 'Utente'
              return (
                <Link key={c.id} href={`/messaggi/${c.id}?as=shop`}
                  className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3.5 hover:border-sienna/30 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-cream border border-border overflow-hidden flex-shrink-0">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={name} />
                      : <div className="w-full h-full flex items-center justify-center font-bold text-muted text-[14px]">{name[0]}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[13px] font-bold text-espresso truncate group-hover:text-sienna transition-colors">{name}</p>
                      <span className="text-[10px] text-muted flex items-center gap-1 flex-shrink-0 ml-2">
                        <Clock size={9} /> {timeAgo(c.last_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted truncate">{c.last_message ?? 'Inizia la conversazione...'}</p>
                  </div>
                  {unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-sienna text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {unread}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
