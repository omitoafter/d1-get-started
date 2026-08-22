import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  ArrowRight, Ban, BookOpen, Check, ChevronDown, CirclePlus, Compass, Dot, EyeOff,
  FileText, Flag, Hash, Heart, Image as ImageIcon, Instagram, Layers3, LayoutDashboard, MapPin, Menu,
  MessageCircle, Pencil, Plus, RotateCcw, ScrollText, Search, Send, ShieldCheck, Sparkles,
  TrendingUp, UserCheck, UserCog, UserRound, UsersRound, X, Zap,
} from 'lucide-react';
import {
  getGetAdminArticlesQueryKey, getGetAdminAuditQueryKey, getGetAdminBannersQueryKey, getGetAdminCommentsQueryKey,
  getGetAdminDashboardQueryKey, getGetAdminPostsQueryKey, getGetAdminReportsQueryKey, getGetAdminUsersQueryKey,
  getGetChatMessagesQueryKey, getGetChatsQueryKey,
  getGetCurrentUserQueryKey, getGetFeedQueryKey, getGetPostCommentsQueryKey,
  getGetProfileQueryKey, getGetTrendingQueryKey, getHealthCheckQueryKey, getSearchSocialQueryKey,
  useCreateAdminArticle, useCreateAdminBanner, useCreatePost, useCreatePostComment, useGetAdminArticles,
  useGetAdminAudit, useGetAdminBanners, useGetAdminComments, useGetAdminDashboard, useGetAdminPosts, useGetAdminReports,
  useGetAdminUsers, useModerateAdminComment, useModerateAdminPost,
  useCreateChat, useGetChatMessages, useGetChats, useGetCurrentUser, useGetFeed, useGetPostComments,
  useGetProfile, useGetTrending, useHealthCheck, useSearchSocial, useSendChatMessage,
  useResolveAdminReport, useToggleFollow, useTogglePostLike, useUpdateAdminArticle, useUpdateAdminBanner, useUpdateAdminUser, useUpdateProfile,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { PromoBanner } from '@/components/promo-banner';
import { BlogArticlePage, BlogPage } from '@/pages/blog';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import type { FormEvent, ReactNode } from 'react';

const queryClient = new QueryClient();
const OFFICIAL_LOGO_URL = `${import.meta.env.BASE_URL}by-omito-official-logo.png`;

function Avatar({ user, size = 'md' }: { user?: any; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (user?.displayName || user?.username || 'OM').split(' ').map((part: string) => part[0]).slice(0, 2).join('').toUpperCase();
  const sizes = { sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-20 w-20 text-xl' };
  return user?.avatarUrl ? (
    <img data-testid={`img-avatar-${user.id ?? 'current'}`} src={user.avatarUrl} alt={user.displayName || user.username} className={`${sizes[size]} shrink-0 rounded-full object-cover ring-2 ring-[#281b35]`} />
  ) : (
    <div data-testid={`avatar-fallback-${user?.id ?? 'current'}`} className={`${sizes[size]} shrink-0 rounded-full bg-[linear-gradient(135deg,#d79aff,#7c35d3)] text-[#160e1d] flex items-center justify-center font-extrabold ring-2 ring-[#281b35]`}>{initials}</div>
  );
}

function Logo() {
  return <Link href="/" data-testid="link-logo" className="group inline-flex items-center rounded-2xl bg-[#100a16]/70 p-1.5 shadow-[0_0_28px_rgba(213,156,255,.16)]"><img src={OFFICIAL_LOGO_URL} alt="BY OMITO" className="h-16 w-16 object-contain transition-transform group-hover:scale-[1.04] sm:h-[76px] sm:w-[76px]" /></Link>;
}

function Topbar({ user, onMenu }: { user?: any; onMenu?: () => void }) {
  return <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#291c36] bg-[#120d18]/90 px-5 backdrop-blur-xl md:px-8">
    <div className="flex items-center gap-4"><button data-testid="button-open-menu" onClick={onMenu} className="rounded-lg p-2 text-[#93849f] hover:bg-[#21152b] md:hidden"><Menu size={20} /></button><Logo /></div>
    <div className="hidden max-w-[360px] flex-1 md:block" />
    <div className="flex items-center gap-3">
      <Link href="/explore" data-testid="link-top-explore" className="hidden rounded-full border border-[#39274a] p-2.5 text-[#a99ab4] transition hover:border-[#d59cff] hover:text-[#d59cff] sm:block"><Search size={17} /></Link>
      {user && <Link href={`/profile/${user.username}/edit`} data-testid="link-top-edit-profile" className="rounded-full border border-[#39274a] p-2.5 text-[#a99ab4] transition hover:border-[#d59cff] hover:text-[#d59cff]"><Pencil size={16} /></Link>}
      <Link href={user ? `/profile/${user.username}` : '/sign-in'} data-testid="link-current-profile"><Avatar user={user} size="sm" /></Link>
    </div>
  </header>;
}

function SideNav({ user, mobileOpen, close }: { user?: any; mobileOpen?: boolean; close?: () => void }) {
  const [location] = useLocation();
  const items = [
    { href: '/', label: 'The room', icon: Layers3 },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/blog', label: 'Journal', icon: BookOpen },
    { href: '/chat', label: 'Messages', icon: MessageCircle },
  ];
  return <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[#291c36] bg-[#100b15] px-5 py-7 transition-transform duration-300 md:static md:translate-x-0`}>
    <div className="mb-12 flex items-center justify-between px-2"><Logo /><button data-testid="button-close-menu" onClick={close} className="rounded-lg p-2 text-[#81718d] md:hidden"><X size={18} /></button></div>
    <p className="mono mb-3 px-3 text-[10px] uppercase tracking-[.22em] text-[#776780]">Navigate</p>
    <nav className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${location === href ? 'bg-[#29193a] text-[#f1dfff] shadow-[inset_3px_0_0_#d59cff]' : 'text-[#94859f] hover:bg-[#1d1426] hover:text-[#f0dffb]'}`}><Icon size={18} strokeWidth={location === href ? 2.3 : 1.7} /><span>{label}</span></Link>)}
    </nav>
    <p className="mono mb-3 mt-10 px-3 text-[10px] uppercase tracking-[.22em] text-[#776780]">Your corner</p>
    <nav className="space-y-1">
      <Link href={user ? `/profile/${user.username}` : '/sign-in'} data-testid="link-nav-profile" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#94859f] transition hover:bg-[#1d1426] hover:text-[#f0dffb]"><UserRound size={18} /><span>My profile</span></Link>
      {user && <Link href={`/profile/${user.username}/edit`} data-testid="link-nav-edit-profile" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#94859f] transition hover:bg-[#1d1426] hover:text-[#f0dffb]"><Pencil size={18} /><span>Edit profile</span></Link>}
      <Link href="/admin" data-testid="link-nav-admin" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#94859f] transition hover:bg-[#1d1426] hover:text-[#f0dffb]"><ShieldCheck size={18} /><span>Moderation</span></Link>
    </nav>
    <div className="mt-auto rounded-2xl border border-[#33213f] bg-[#1b1224] p-4"><div className="mb-3 flex items-center gap-2 text-[#d59cff]"><Zap size={14} fill="currentColor" /><span className="mono text-[10px] uppercase tracking-[.16em]">After dark tip</span></div><p className="text-xs leading-5 text-[#a99ab4]">The best nights are usually one introduction away.</p></div>
  </aside>;
}

function MobileNav() {
  const [location] = useLocation();
  return <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-[68px] items-center justify-around border-t border-[#291c36] bg-[#100b15]/95 px-5 backdrop-blur-xl md:hidden">
    {[['/', Layers3, 'Room'], ['/explore', Compass, 'Explore'], ['/blog', BookOpen, 'Journal'], ['/chat', MessageCircle, 'Chat']].map(([href, Icon, label]) => {
      const ActiveIcon = Icon as any;
      return <Link key={href as string} href={href as string} data-testid={`link-mobile-${label}`} className={`flex flex-col items-center gap-1 text-[10px] ${location === href ? 'text-[#d59cff]' : 'text-[#75667f]'}`}><ActiveIcon size={19} /><span>{label as string}</span></Link>;
    })}
  </nav>;
}

function AppShell({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const { data: user } = useGetCurrentUser({ query: { enabled: Boolean(isSignedIn), retry: false, queryKey: getGetCurrentUserQueryKey() } });
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="app-noise min-h-[100dvh]"><div className="flex min-h-[100dvh]"><SideNav user={user} mobileOpen={mobileOpen} close={() => setMobileOpen(false)} /><div className="min-w-0 flex-1"><Topbar user={user} onMenu={() => setMobileOpen(true)} /><main className="mx-auto max-w-[1380px] px-5 py-7 pb-24 md:px-10 md:py-10 md:pb-10">{children}</main></div></div><MobileNav /></div>;
}

function LoadingState({ label = 'Opening the room' }: { label?: string }) {
  return <div data-testid="status-loading" className="space-y-5"><div className="skeleton h-9 w-48 rounded-lg" /><div className="skeleton h-4 w-72 rounded" /><div className="soft-card overflow-hidden rounded-2xl p-4"><div className="skeleton h-10 w-44 rounded-full" /><div className="skeleton mt-5 aspect-[4/3] w-full rounded-xl" /><div className="mt-4 flex gap-3"><div className="skeleton h-8 w-16 rounded" /><div className="skeleton h-8 w-20 rounded" /></div></div><p className="mono text-center text-[10px] uppercase tracking-[.18em] text-[#75667f]">{label}</p></div>;
}

function ErrorState({ retry, label = 'Could not connect to the room.' }: { retry?: () => void; label?: string }) {
  return <div data-testid="status-error" className="soft-card rounded-2xl border-[#6a315f] p-8 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#32182f] text-[#ff74c7]"><Zap size={21} /></div><h3 className="display text-lg font-bold">The signal got lost.</h3><p className="mt-2 text-sm text-[#9c8da6]">{label}</p>{retry && <button data-testid="button-retry" onClick={retry} className="mt-5 rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d] transition hover:bg-[#e6c2ff]">Try again</button>}</div>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div data-testid="status-empty" className="soft-card rounded-2xl border-dashed p-12 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#5b3b6d] text-[#d59cff]"><Sparkles size={20} /></div><h3 className="display text-xl font-bold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#95869f]">{body}</p>{action}</div>;
}

function PostCard({ post }: { post: any }) {
  const queryClient = useQueryClient();
  const like = useTogglePostLike();
  const commentMutation = useCreatePostComment();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const { data: comments, isLoading: commentsLoading } = useGetPostComments(post.id, { query: { enabled: showComments, queryKey: getGetPostCommentsQueryKey(post.id) } });
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likes, setLikes] = useState(post.likes ?? 0);
  const [shareStatus, setShareStatus] = useState('');
  const submitLike = () => like.mutate({ id: post.id }, { onSuccess: (state) => { setLiked(state.liked); setLikes(state.likes); queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetTrendingQueryKey() }); } });
  const submitComment = () => { if (!comment.trim()) return; commentMutation.mutate({ id: post.id, data: { body: comment.trim() } }, { onSuccess: () => { setComment(''); setShowComments(true); queryClient.invalidateQueries({ queryKey: getGetPostCommentsQueryKey(post.id) }); queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetTrendingQueryKey() }); } }); };
  const share = async () => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const url = `${window.location.origin}${basePath}/profile/${post.author?.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Profile link copied');
    } catch {
      setShareStatus('Could not copy the link');
    }
  };
  return <article data-testid={`card-post-${post.id}`} className="soft-card animate-rise min-w-0 max-w-full overflow-hidden rounded-2xl">
    <div className="flex items-center justify-between gap-3 p-4 md:p-5"><Link href={`/profile/${post.author?.username}`} data-testid={`link-post-author-${post.id}`} className="flex min-w-0 flex-1 items-center gap-3"><Avatar user={post.author} size="md" /><span className="min-w-0"><strong className="block truncate text-sm">{post.author?.displayName || post.author?.username || 'Unknown creator'}</strong><span className="mono flex min-w-0 items-center gap-1 text-[10px] text-[#897993]"><span className="truncate text-[#d59cff]">@{post.author?.username}</span><Dot className="shrink-0" size={12} /><span className="truncate">{post.location || 'Somewhere after dark'}</span></span></span></Link><button type="button" data-testid={`button-post-share-${post.id}`} onClick={share} aria-label="Copy creator profile link" className="shrink-0 rounded-lg p-2 text-[#84748e] transition hover:bg-[#281932] hover:text-white"><Send size={16} /></button></div>
    {post.imageUrl ? <img data-testid={`img-post-${post.id}`} src={post.imageUrl} alt={post.caption} className="aspect-[4/3] w-full object-cover" /> : <div data-testid={`visual-post-${post.id}`} className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_75%_20%,#b766ed,transparent_30%),linear-gradient(135deg,#251538,#100b15)]"><div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full border-[22px] border-[#ff74c7]/30" /><div className="absolute right-10 top-12 h-28 w-28 rotate-12 rounded-3xl border border-[#d59cff]/50 bg-[#d59cff]/10 backdrop-blur" /><span className="display absolute bottom-5 left-5 max-w-[240px] text-3xl font-bold leading-[.95] text-[#f5e8ff]">{post.caption?.split(' ').slice(0, 4).join(' ')}</span></div>}
    <div className="p-4 md:p-5"><p data-testid={`text-caption-${post.id}`} className="break-anywhere text-sm leading-6 text-[#d4c7dc]">{post.caption}</p><div className="mt-4 flex items-center gap-5"><button data-testid={`button-like-${post.id}`} onClick={submitLike} disabled={like.isPending} className={`flex items-center gap-2 text-xs transition hover:text-[#ff74c7] ${liked ? 'text-[#ff74c7]' : 'text-[#9c8ca6]'}`}><Heart size={17} fill={liked ? 'currentColor' : 'none'} />{likes}</button><button data-testid={`button-comments-${post.id}`} onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-xs text-[#9c8ca6] transition hover:text-[#d59cff]"><MessageCircle size={17} />{post.comments ?? 0}</button></div>
      {(like.error || commentMutation.error || shareStatus) && <p className={`mt-3 text-xs ${shareStatus ? 'text-[#bba5c8]' : 'text-[#ff9abf]'}`}>{shareStatus || (like.error as any)?.data?.error || (commentMutation.error as any)?.data?.error || 'This action could not be completed.'}</p>}
      {showComments && <div className="mt-5 border-t border-[#33223f] pt-4"><div className="max-h-36 space-y-3 overflow-auto">{commentsLoading ? <p className="mono text-[10px] text-[#786983]">Reading the room...</p> : comments?.length ? comments.map((item: any) => <div key={item.id} className="flex gap-2 text-xs"><Avatar user={item.author} size="sm" /><p className="leading-5 text-[#b9a9c3]"><strong className="mr-1 text-[#eadcf1]">{item.author?.username}</strong>{item.body}</p></div>) : <p className="text-xs text-[#786983]">No one has said it yet.</p>}</div><div className="mt-4 flex gap-2"><input data-testid={`input-comment-${post.id}`} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitComment()} placeholder="Add to the conversation" className="min-w-0 flex-1 rounded-lg border border-[#3b2749] bg-[#160e1e] px-3 py-2 text-xs text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /><button data-testid={`button-submit-comment-${post.id}`} onClick={submitComment} className="rounded-lg bg-[#d59cff] px-3 text-[#170d1d]"><Send size={14} /></button></div></div>}
    </div>
  </article>;
}

function ComposeCard({ user, onCreated }: { user?: any; onCreated?: () => void }) {
  const create = useCreatePost();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<'influencer' | 'bartender'>('influencer');
  const [location, setPostLocation] = useState('');
  const submit = () => { if (!caption.trim() || !imageUrl.trim()) return; create.mutate({ data: { caption: caption.trim(), imageUrl: imageUrl.trim(), category, location: location.trim() || undefined } }, { onSuccess: () => { setCaption(''); setImageUrl(''); setPostLocation(''); setOpen(false); onCreated?.(); } }); };
  return <div className="soft-card mb-6 rounded-2xl p-4 md:p-5"><div className="flex items-center gap-3"><Avatar user={user} size="md" /><button data-testid="button-open-composer" onClick={() => setOpen(!open)} className="flex-1 rounded-xl border border-[#352340] bg-[#160e1e] px-4 py-3 text-left text-sm text-[#796a84] transition hover:border-[#8b50af]">What happened after midnight?</button><button data-testid="button-add-photo" onClick={() => setOpen(true)} className="rounded-xl border border-[#352340] p-3 text-[#b87aee] hover:bg-[#281932]"><ImageIcon size={18} /></button></div>{open && <div className="mt-4 space-y-3 border-t border-[#33223f] pt-4"><textarea data-testid="input-post-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Tell the room what they missed..." rows={3} className="w-full resize-none rounded-xl border border-[#3b2749] bg-[#160e1e] p-3 text-sm text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /><div className="grid gap-3 sm:grid-cols-2"><input data-testid="input-post-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" className="rounded-lg border border-[#3b2749] bg-[#160e1e] px-3 py-2 text-xs text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /><input data-testid="input-post-location" value={location} onChange={(e) => setPostLocation(e.target.value)} placeholder="Location" className="rounded-lg border border-[#3b2749] bg-[#160e1e] px-3 py-2 text-xs text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /></div><div className="flex items-center justify-between gap-3"><div className="flex rounded-lg border border-[#3b2749] p-0.5">{(['influencer', 'bartender'] as const).map((kind) => <button key={kind} data-testid={`button-category-${kind}`} onClick={() => setCategory(kind)} className={`px-3 py-1.5 text-[10px] capitalize ${category === kind ? 'rounded-md bg-[#d59cff] font-bold text-[#170d1d]' : 'text-[#927e9e]'}`}>{kind}</button>)}</div><div className="flex gap-2"><button data-testid="button-cancel-composer" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-xs text-[#9b8aa5]">Cancel</button><button data-testid="button-submit-post" disabled={create.isPending || !caption.trim() || !imageUrl.trim()} onClick={submit} className="rounded-lg bg-[#d59cff] px-4 py-2 text-xs font-bold text-[#170d1d] disabled:opacity-40">{create.isPending ? 'Posting...' : 'Post to room'}</button></div></div>{create.error && <p data-testid="status-post-create-error" className="rounded-lg border border-[#7a395a] bg-[#301729] px-3 py-2 text-xs text-[#ffb4cf]">{(create.error as any)?.data?.error || 'Your post could not be published. Try again.'}</p>}</div>}</div>;
}

function FeedPage() {
  const { data: user } = useGetCurrentUser({ query: { retry: false, queryKey: getGetCurrentUserQueryKey() } });
  const feed = useGetFeed({ category: 'all' }, { query: { queryKey: getGetFeedQueryKey({ category: 'all' }), retry: 1 } });
  const [filter, setFilter] = useState<'all' | 'influencers' | 'bartenders'>('all');
  const filteredItems = (feed.data?.items || []).filter((post: any) => filter === 'all' || `${post.category}s` === filter);
  return <AppShell><div className="mb-8 flex min-w-0 flex-col justify-between gap-5 md:flex-row md:items-end"><div className="animate-rise min-w-0"><p className="mono mb-3 text-[10px] uppercase tracking-[.25em] text-[#d59cff]">Thursday, 11:47 PM</p><h1 data-testid="heading-feed" className="display text-4xl font-extrabold tracking-[-.06em] md:text-6xl">Inside the <span className="text-[#d59cff]">room.</span></h1><p className="mt-3 max-w-md text-sm leading-6 text-[#95869f]">A live cut of who is out, what is pouring, and where the night is moving.</p></div><div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-[#33223f] bg-[#1b1224] p-1">{(['all', 'influencers', 'bartenders'] as const).map((item) => <button key={item} data-testid={`button-filter-${item}`} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] capitalize transition ${filter === item ? 'bg-[#d59cff] font-bold text-[#170d1d]' : 'text-[#95869f] hover:text-white'}`}>{item === 'all' ? 'Everyone' : item}</button>)}</div></div><PromoBanner placement="room" /><div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,720px)_310px]"><div className="min-w-0"><ComposeCard user={user} onCreated={() => feed.refetch()} />{feed.isLoading ? <LoadingState /> : feed.isError ? <ErrorState retry={() => feed.refetch()} /> : filteredItems.length ? <div className="min-w-0 space-y-6">{filteredItems.map((post: any) => <PostCard key={post.id} post={post} />)}</div> : <EmptyState title="Quiet, for now." body="No posts have found the room yet. Be the first person to leave a trace." action={<button data-testid="button-empty-compose" onClick={() => document.querySelector<HTMLButtonElement>('[data-testid=button-open-composer]')?.click()} className="mt-5 rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">Make an entrance</button>} />}</div><FeedRail /></div></AppShell>;
}

function FeedRail() {
  const trending = useGetTrending({ query: { queryKey: getGetTrendingQueryKey(), retry: false } });
  const trendItems = trending.data?.slice(0, 3) || [];
  return <aside className="hidden space-y-5 xl:block"><div className="soft-card rounded-2xl p-5"><div className="mb-5 flex items-center justify-between"><h2 className="display text-lg font-bold">What’s moving</h2><TrendingUp size={17} className="text-[#ff74c7]" /></div>{trendItems.length ? trendItems.map((post: any, i: number) => <Link href={`/profile/${post.author?.username}`} key={post.id} data-testid={`link-trending-${post.id}`} className="group mb-4 flex gap-3"><span className="mono pt-1 text-[10px] text-[#6f6079]">0{i + 1}</span><div><p className="text-xs leading-5 text-[#d1c0db] transition group-hover:text-[#d59cff]">{post.caption}</p><p className="mono mt-1 text-[9px] uppercase tracking-[.08em] text-[#796a84]">{post.likes} signals</p></div></Link>) : <p className="text-sm leading-6 text-[#897993]">The room is warming up. Check back in a minute.</p>}<Link href="/explore" data-testid="link-see-trending" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#d59cff]">See all movement <ArrowRight size={14} /></Link></div><div className="rounded-2xl bg-[#d59cff] p-5 text-[#1a0d21]"><p className="mono text-[9px] uppercase tracking-[.2em]">A note from the door</p><h3 className="display mt-7 text-2xl font-bold leading-6">Be curious.<br />Be kind.<br />Stay late.</h3><div className="mt-8 flex justify-end"><Sparkles size={26} /></div></div></aside>;
}

function LandingPage() {
  useHealthCheck({ query: { retry: false, queryKey: getHealthCheckQueryKey() } });
  const [, setLocation] = useLocation();
  return <div className="app-noise min-h-[100dvh] overflow-hidden"><header className="flex items-center justify-between px-6 py-7 md:px-12"><Logo /><div className="flex items-center gap-3"><Link href="/sign-in" data-testid="link-landing-sign-in" className="hidden px-3 py-2 text-xs text-[#b9a9c3] sm:block">Sign in</Link><Link href="/sign-up" data-testid="link-landing-sign-up" className="rounded-full border border-[#73558a] px-4 py-2 text-xs font-bold transition hover:border-[#d59cff] hover:bg-[#281936]">Get inside <ArrowRight size={13} className="ml-1 inline" /></Link></div></header><main><section className="relative mx-auto max-w-[1380px] px-6 pb-20 pt-12 md:px-12 md:pb-32 md:pt-20"><div className="absolute -right-48 top-0 h-[560px] w-[560px] rounded-full bg-[#7b32cf]/20 blur-[100px]" /><div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]"><div className="animate-rise"><p className="mono mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[.25em] text-[#ff74c7]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff74c7]" />The city is still awake</p><h1 data-testid="heading-landing" className="display max-w-3xl text-[clamp(3.6rem,10vw,8.5rem)] font-extrabold leading-[.82] tracking-[-.1em]">Your people.<br /><span className="text-[#d59cff]">After dark.</span></h1><p className="mt-9 max-w-[430px] text-base leading-7 text-[#aa9bad]">BY OMITO is the insider pass to the city’s best nights — from the people behind the bar to the people who know where to stand.</p><div className="mt-9 flex flex-wrap gap-3"><button data-testid="button-landing-join" onClick={() => setLocation('/sign-up')} className="rounded-full bg-[#d59cff] px-6 py-3 text-xs font-bold text-[#170d1d] transition hover:-translate-y-0.5 hover:bg-[#e8c2ff]">Find your night <ArrowRight size={14} className="ml-2 inline" /></button><button data-testid="button-landing-explore" onClick={() => setLocation('/explore')} className="rounded-full border border-[#4a3459] px-6 py-3 text-xs font-bold text-[#d9c5e4] transition hover:border-[#d59cff]">Explore the room</button></div></div><div className="relative mx-auto h-[420px] w-full max-w-[440px] animate-rise delay-2"><div className="absolute right-2 top-7 h-[310px] w-[240px] rotate-[7deg] rounded-[2rem] border border-[#8551aa] bg-[radial-gradient(circle_at_68%_25%,#d86dcc,transparent_25%),linear-gradient(145deg,#542578,#1b1027)] p-5 shadow-[0_25px_80px_rgba(165,83,232,.25)]"><div className="flex justify-between text-[#eacfff]"><span className="mono text-[9px] uppercase">01:38 / fri</span><Zap size={16} /></div><div className="absolute bottom-5 left-5 right-5"><p className="mono text-[9px] uppercase tracking-[.18em] text-[#e8b5f1]">Tonight’s signal</p><p className="display mt-2 text-4xl font-bold leading-none">Velvet<br />hours</p><p className="mt-3 text-[11px] text-[#cfb5d9]">Dalston · 42 people inside</p></div></div><div className="absolute bottom-2 left-2 h-[280px] w-[215px] -rotate-[9deg] rounded-[2rem] border border-[#51366a] bg-[radial-gradient(circle_at_30%_25%,#ff74c7,transparent_20%),linear-gradient(145deg,#2e1c42,#120d18)] p-5 opacity-95"><span className="mono text-[9px] text-[#f2d4ff]">OMITO / CITY GUIDE</span><div className="absolute bottom-5 left-5"><p className="display text-3xl font-bold leading-[.9]">No<br />guest<br />list.</p></div></div><div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[#f2d7ff]/30 bg-[#24112f]/80 px-4 py-2 text-[10px] text-[#f8e7ff] backdrop-blur"><span className="h-2 w-2 rounded-full bg-[#ff74c7]" />Live now</div></div></div></section><section className="border-y border-[#291c36] bg-[#160e1e] px-6 py-8 md:px-12"><div className="mx-auto grid max-w-[1380px] gap-7 md:grid-cols-3"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[#806e8c]">For the ones</p><p className="mt-2 text-sm text-[#ded0e6]">who know the bartender by name.</p></div><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[#806e8c]">For the ones</p><p className="mt-2 text-sm text-[#ded0e6]">who always find the afters.</p></div><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[#806e8c]">For the ones</p><p className="mt-2 text-sm text-[#ded0e6]">who make the night worth remembering.</p></div></div></section><section className="mx-auto max-w-[1380px] px-6 py-20 md:px-12 md:py-28"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="mono text-[10px] uppercase tracking-[.22em] text-[#d59cff]">Not another feed</p><h2 className="display mt-5 text-4xl font-bold leading-[.95] tracking-[-.07em] md:text-6xl">The good stuff<br /><span className="text-[#817087]">travels in whispers.</span></h2></div><div className="grid gap-4 sm:grid-cols-2"><div className="soft-card rounded-2xl p-6"><Hash className="mb-12 text-[#ff74c7]" size={22} /><h3 className="display text-xl font-bold">Follow the signal</h3><p className="mt-2 text-sm leading-6 text-[#94859f]">Find the people, pours, and pockets of energy shaping your city tonight.</p></div><div className="rounded-2xl bg-[#d59cff] p-6 text-[#170d1d]"><MapPin className="mb-12" size={22} /><h3 className="display text-xl font-bold">Know where to go</h3><p className="mt-2 text-sm leading-6 text-[#422950]">A real-time pulse, not a listicle. Move with the room.</p></div></div></div></section></main><footer className="flex flex-col justify-between gap-4 border-t border-[#291c36] px-6 py-8 md:flex-row md:px-12"><Logo /><p className="mono text-[10px] uppercase tracking-[.12em] text-[#665870]">Made for the night shift · 2024</p><div className="flex gap-3 text-[#887892]"><Instagram size={16} /><UsersRound size={16} /></div></footer></div>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return mode === 'sign-in'
    ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />;
  /*
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <div className="app-noise flex min-h-[100dvh]"><div className="hidden w-[42%] flex-col justify-between bg-[#d59cff] p-10 text-[#170d1d] md:flex"><Logo /><div><p className="mono mb-5 text-[10px] uppercase tracking-[.2em]">BY OMITO / 00:41</p><h1 className="display max-w-sm text-6xl font-extrabold leading-[.84] tracking-[-.08em]">The night<br />knows your<br /><span className="italic">name.</span></h1><p className="mt-7 max-w-xs text-sm leading-6 text-[#513461]">A private corner for the people who keep the city interesting.</p></div><p className="mono text-[10px] uppercase tracking-[.15em]">No guest list required.</p></div><div className="flex flex-1 flex-col px-6 py-7 md:px-16 md:py-10"><div className="flex justify-between"><div className="md:hidden"><Logo /></div><button data-testid="button-auth-back" onClick={() => setLocation('/')} className="ml-auto rounded-full border border-[#3b2749] p-2 text-[#95869f]"><X size={16} /></button></div><div className="m-auto w-full max-w-[390px] animate-rise">{submitted ? <div className="text-center"><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#d59cff] text-[#170d1d]"><Check /></div><h1 className="display text-4xl font-bold">You’re on the list.</h1><p className="mt-3 text-sm leading-6 text-[#97889f]">We’ve sent a secure link to your inbox. The door is open when you are.</p><button data-testid="button-auth-enter" onClick={() => setLocation('/')} className="mt-7 rounded-full bg-[#d59cff] px-6 py-3 text-xs font-bold text-[#170d1d]">Enter the room</button></div> : <><p className="mono mb-4 text-[10px] uppercase tracking-[.2em] text-[#d59cff]">{mode === 'sign-in' ? 'Welcome back' : 'Make an entrance'}</p><h1 data-testid="heading-auth" className="display text-5xl font-extrabold leading-[.9] tracking-[-.07em]">{mode === 'sign-in' ? 'Back to the good part.' : 'Your night starts here.'}</h1><p className="mt-4 text-sm text-[#95869f]">{mode === 'sign-in' ? 'The room has been waiting.' : 'Join the people behind the best stories.'}</p><form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="mt-9 space-y-4"><label className="block"><span className="mono mb-2 block text-[10px] uppercase tracking-[.14em] text-[#81718c]">Email</span><input data-testid="input-auth-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@afterhours.com" className="w-full rounded-xl border border-[#3b2749] bg-[#160e1e] px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /></label><label className="block"><span className="mono mb-2 block text-[10px] uppercase tracking-[.14em] text-[#81718c]">Passcode</span><input data-testid="input-auth-password" required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Six or more characters" className="w-full rounded-xl border border-[#3b2749] bg-[#160e1e] px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /></label><button data-testid="button-auth-submit" type="submit" className="w-full rounded-xl bg-[#d59cff] py-4 text-xs font-bold text-[#170d1d] transition hover:bg-[#e9c6ff]">{mode === 'sign-in' ? 'Sign in' : 'Create your pass'}</button></form><p className="mt-7 text-center text-xs text-[#83738e]">{mode === 'sign-in' ? 'New to the room?' : 'Already have a pass?'} <button data-testid="button-auth-switch" onClick={() => setLocation(mode === 'sign-in' ? '/sign-up' : '/sign-in')} className="font-bold text-[#d59cff]">{mode === 'sign-in' ? 'Create one' : 'Sign in'}</button></p></>}</div></div></div>;
}
  */
}

function ExplorePage() {
  const trending = useGetTrending({ query: { queryKey: getGetTrendingQueryKey(), retry: false } });
  const [query, setQuery] = useState('');
  const search = useSearchSocial({ q: query.trim() || 'city' }, { query: { enabled: Boolean(query.trim()), queryKey: getSearchSocialQueryKey({ q: query.trim() || 'city' }), retry: false } });
  const results = query.trim() ? search.data : undefined;
  return <AppShell><div className="mb-10 min-w-0"><p className="mono mb-3 text-[10px] uppercase tracking-[.25em] text-[#ff74c7]">Field notes / live</p><h1 className="display text-5xl font-extrabold tracking-[-.08em] md:text-7xl">Find your <span className="text-[#d59cff]">people.</span></h1><div className="relative mt-8 max-w-2xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7893]" size={19} /><input data-testid="input-search-social" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creators, places, a feeling..." className="w-full rounded-2xl border border-[#48305b] bg-[#1d1327] py-4 pl-12 pr-4 text-sm text-white outline-none placeholder:text-[#75647e] focus:border-[#d59cff]" />{query && <button data-testid="button-clear-search" onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#897891]"><X size={16} /></button>}</div></div><PromoBanner placement="explore" />{results ? <div className="min-w-0 space-y-8">{search.isLoading ? <LoadingState label="Searching every corner" /> : search.isError ? <ErrorState retry={() => search.refetch()} /> : <><section className="min-w-0"><SectionTitle title="People" count={results.users?.length || 0} />{results.users?.length ? <div className="grid min-w-0 gap-3 md:grid-cols-2">{results.users.map((u: any) => <CreatorRow key={u.id} user={u} />)}</div> : <p className="text-sm text-[#83748e]">No one by that name yet.</p>}</section><section className="min-w-0"><SectionTitle title="Posts" count={results.posts?.length || 0} />{results.posts?.length ? <div className="grid min-w-0 gap-5 md:grid-cols-2">{results.posts.map((p: any) => <PostCard key={p.id} post={p} />)}</div> : <p className="text-sm text-[#83748e]">No traces found.</p>}</section></>}</div> : <div className="grid min-w-0 gap-10 lg:grid-cols-[1fr_1.2fr]"><section className="min-w-0"><SectionTitle title="Browse by energy" /><div className="grid min-w-0 grid-cols-2 gap-3">{[['#latecheckout', 'after hours'], ['#backbar', 'behind the bar'], ['#softlaunch', 'new in town'], ['#lastcall', 'one more']].map(([tag, label], i) => <button key={tag} data-testid={`button-category-${i}`} onClick={() => setQuery(tag.slice(1))} className={`min-w-0 group rounded-2xl p-5 text-left transition hover:-translate-y-1 ${i === 1 ? 'bg-[#d59cff] text-[#170d1d]' : 'soft-card'}`}><Hash size={16} className="mb-8 opacity-60" /><strong className="display block text-lg">{label}</strong><span className="mono mt-2 block text-[10px] opacity-60">{tag}</span></button>)}</div></section><section className="min-w-0"><SectionTitle title="Trending in the room" /><div className="min-w-0 space-y-3">{trending.isLoading ? <LoadingState label="Tuning the signal" /> : trending.data?.length ? trending.data.slice(0, 5).map((post: any, i: number) => <Link href={`/profile/${post.author?.username}`} key={post.id} data-testid={`card-explore-trending-${post.id}`} className="soft-card flex min-w-0 w-full items-center gap-4 rounded-xl p-4 transition hover:border-[#9d5dc4]"><span className="mono w-5 shrink-0 text-xs text-[#6e5d79]">0{i + 1}</span><Avatar user={post.author} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm text-[#d9cbe1]">{post.caption}</p><p className="mono truncate mt-1 text-[9px] uppercase text-[#806e8a]">{post.author?.username} · {post.likes} signals</p></div><ArrowRight size={15} className="shrink-0 text-[#735b80]" /></Link>) : <EmptyState title="No signal yet" body="The trend board is waiting for tonight to begin." />}</div></section></div>}</AppShell>;
}

function SectionTitle({ title, count }: { title: string; count?: number }) { return <div className="mb-4 flex items-center gap-3"><h2 className="display text-2xl font-bold">{title}</h2>{count !== undefined && <span className="mono text-[10px] text-[#806d89]">{count}</span>}</div>; }
function CreatorRow({ user }: { user: any }) {
  const { isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const follow = useToggleFollow();
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const toggle = () => {
    if (!isSignedIn) { setLocation('/sign-in'); return; }
    follow.mutate({ username: user.username }, { onSuccess: (state) => setFollowing(state.following) });
  };
  return <div className="soft-card flex items-center gap-3 rounded-xl p-4"><Link href={`/profile/${user.username}`} data-testid={`card-creator-${user.id}`} className="flex min-w-0 flex-1 items-center gap-3"><Avatar user={user} /><div className="min-w-0"><strong className="block truncate text-sm">{user.displayName}</strong><span className="mono text-[10px] text-[#8d7b97]">@{user.username} · {user.category}</span></div></Link><button data-testid={`button-follow-${user.id}`} disabled={follow.isPending} onClick={toggle} className={`rounded-full px-3 py-2 text-[10px] font-bold ${following ? 'border border-[#513663] text-[#a58bb2]' : 'bg-[#d59cff] text-[#170d1d]'}`}>{following ? 'Following' : 'Follow'}</button></div>;
}

function EditProfileForm({ user, onCancel, onSaved }: { user: any; onCancel: () => void; onSaved: (username: string) => void }) {
  const queryClient = useQueryClient();
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    avatarUrl: user.avatarUrl || '',
    displayName: user.displayName || '',
    username: user.username || '',
    bio: user.bio || '',
    basicInfo: user.basicInfo || '',
    category: user.category || 'everyone',
  });
  useEffect(() => {
    setForm({
      avatarUrl: user.avatarUrl || '',
      displayName: user.displayName || '',
      username: user.username || '',
      bio: user.bio || '',
      basicInfo: user.basicInfo || '',
      category: user.category || 'everyone',
    });
  }, [user.id, user.avatarUrl, user.displayName, user.username, user.bio, user.basicInfo, user.category]);
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const error = (update.error as any)?.data?.error || (update.error ? 'Your profile could not be saved. Check the details and try again.' : '');
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.mutate({ data: {
      avatarUrl: form.avatarUrl.trim(),
      displayName: form.displayName.trim(),
      username: form.username.trim(),
      bio: form.bio.trim(),
      basicInfo: form.basicInfo.trim(),
      category: form.category as 'influencer' | 'bartender' | 'everyone',
    } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), updated);
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(user.username) });
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(updated.username) });
        onSaved(updated.username);
      },
    });
  };
  return <form data-testid="form-edit-profile" onSubmit={save} className="soft-card mx-auto max-w-3xl rounded-3xl p-5 md:p-8">
    <div className="flex flex-col gap-5 border-b border-[#33223f] pb-6 sm:flex-row sm:items-center"><Avatar user={{ ...user, ...form }} size="lg" /><div className="flex-1"><p className="mono text-[10px] uppercase tracking-[.2em] text-[#ff74c7]">Your corner / edit mode</p><h1 className="display mt-2 text-3xl font-extrabold tracking-[-.06em]">Make it <span className="text-[#d59cff]">yours.</span></h1><p className="mt-2 text-sm leading-6 text-[#9d8da8]">Update how the room sees you. Your changes stay connected to your existing posts and follows.</p></div></div>
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <label className="md:col-span-2"><span className="mono mb-2 block text-[10px] uppercase tracking-[.15em] text-[#8f7c9a]">Profile photo URL</span><input data-testid="input-profile-avatar-url" required value={form.avatarUrl} onChange={(event) => setField('avatarUrl', event.target.value)} placeholder="https://..." className="w-full rounded-xl border border-[#3b2749] bg-[#160e1e] px-4 py-3 text-sm text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /></label>
      <label><span className="mono mb-2 block text-[10px] uppercase tracking-[.15em] text-[#8f7c9a]">Name</span><input data-testid="input-profile-display-name" required maxLength={80} value={form.displayName} onChange={(event) => setField('displayName', event.target.value)} className="w-full rounded-xl border border-[#3b2749] bg-[#160e1e] px-4 py-3 text-sm text-white outline-none focus:border-[#b66be9]" /></label>
      <label><span className="mono mb-2 block text-[10px] uppercase tracking-[.15em] text-[#8f7c9a]">@username</span><input data-testid="input-profile-username" required minLength={3} maxLength={28} value={form.username} onChange={(event) => setField('username', event.target.value.toLowerCase())} placeholder="lowercase_and_underscores" className="w-full rounded-xl border border-[#3b2749] bg-[#160e1e] px-4 py-3 text-sm text-white outline-none focus:border-[#b66be9]" /></label>
      <label className="md:col-span-2"><span className="mono mb-2 block text-[10px] uppercase tracking-[.15em] text-[#8f7c9a]">Bio</span><textarea data-testid="input-profile-bio" maxLength={600} value={form.bio} onChange={(event) => setField('bio', event.target.value)} rows={3} placeholder="A little about your night shift..." className="w-full resize-none rounded-xl border border-[#3b2749] bg-[#160e1e] p-4 text-sm text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /></label>
      <label className="md:col-span-2"><span className="mono mb-2 block text-[10px] uppercase tracking-[.15em] text-[#8f7c9a]">Basic information</span><input data-testid="input-profile-basic-info" maxLength={240} value={form.basicInfo} onChange={(event) => setField('basicInfo', event.target.value)} placeholder="City, venue, or whatever helps people find your signal" className="w-full rounded-xl border border-[#3b2749] bg-[#160e1e] px-4 py-3 text-sm text-white outline-none placeholder:text-[#65566d] focus:border-[#b66be9]" /></label>
    </div>
    <fieldset className="mt-6"><legend className="mono mb-3 text-[10px] uppercase tracking-[.15em] text-[#8f7c9a]">Profile type</legend><div className="grid gap-2 sm:grid-cols-3">{([['everyone', 'Everyone'], ['influencer', 'Influencer'], ['bartender', 'Bartender']] as const).map(([value, label]) => <button key={value} type="button" data-testid={`button-profile-category-${value}`} onClick={() => setField('category', value)} className={`rounded-xl border px-4 py-3 text-left text-xs font-bold transition ${form.category === value ? 'border-[#d59cff] bg-[#d59cff] text-[#170d1d]' : 'border-[#3b2749] bg-[#160e1e] text-[#b6a4c1] hover:border-[#815397]'}`}>{label}</button>)}</div></fieldset>
    {error && <p data-testid="status-profile-save-error" className="mt-5 rounded-xl border border-[#7a395a] bg-[#301729] px-4 py-3 text-sm text-[#ffb4cf]">{error}</p>}
    <div className="mt-7 flex flex-wrap justify-end gap-3"><button type="button" data-testid="button-cancel-profile-edit" onClick={onCancel} className="rounded-full border border-[#493258] px-5 py-3 text-xs font-bold text-[#c1adcb]">Cancel</button><button data-testid="button-save-profile" disabled={update.isPending} className="rounded-full bg-[#d59cff] px-5 py-3 text-xs font-bold text-[#170d1d] disabled:opacity-50">{update.isPending ? 'Saving...' : 'Save changes'}</button></div>
  </form>;
}

function ProfilePage({ startEditing = false }: { startEditing?: boolean }) {
  const params = useParams<{ username: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading: currentUserLoading } = useGetCurrentUser({ query: { enabled: Boolean(isSignedIn), retry: false, queryKey: getGetCurrentUserQueryKey() } });
  const profile = useGetProfile(params.username || '', { query: { enabled: Boolean(params.username && (!startEditing || isSignedIn)), queryKey: getGetProfileQueryKey(params.username || ''), retry: false } });
  const follow = useToggleFollow();
  const [following, setFollowing] = useState<boolean | undefined>(undefined);
  const [editing, setEditing] = useState(startEditing);
  const [shareStatus, setShareStatus] = useState('');
  useEffect(() => {
    if (startEditing && isLoaded && !isSignedIn) setLocation('/sign-in');
  }, [isLoaded, isSignedIn, setLocation, startEditing]);
  const share = async () => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${basePath}/profile/${params.username}`);
      setShareStatus('Profile link copied');
    } catch {
      setShareStatus('Could not copy the link');
    }
  };
  if (startEditing && isLoaded && !isSignedIn) return <AppShell><LoadingState label="Taking you to sign in" /></AppShell>;
  if (profile.isLoading) return <AppShell><LoadingState label="Finding their corner" /></AppShell>;
  if (profile.isError || !profile.data) return <AppShell><ErrorState retry={() => profile.refetch()} label="That profile is keeping a low profile." /></AppShell>;
  const user = profile.data;
  const ownsProfile = currentUser?.id === user.id;
  if (editing) {
    if (currentUserLoading) return <AppShell><LoadingState label="Opening your edit suite" /></AppShell>;
    if (!ownsProfile) return <AppShell><ErrorState label="You can only edit your own profile." /></AppShell>;
    return <AppShell><EditProfileForm user={user} onCancel={() => { setEditing(false); setLocation(`/profile/${user.username}`); }} onSaved={(username) => { setEditing(false); setLocation(`/profile/${username}`); }} /></AppShell>;
  }
  const isFollowing = following ?? Boolean(user.isFollowing);
  const toggle = () => {
    if (!isSignedIn) { setLocation('/sign-in'); return; }
    follow.mutate({ username: user.username }, { onSuccess: (state) => { setFollowing(state.following); profile.refetch(); } });
  };
  return <AppShell><div className="mx-auto max-w-[1050px]">
    <div className="relative overflow-hidden rounded-3xl border border-[#362344] bg-[#1a1022] p-6 md:p-10">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#9a45d7]/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end">
        <Avatar user={user} size="lg" />
        <div className="flex-1">
          <p className="mono text-[10px] uppercase tracking-[.2em] text-[#ff74c7]">{user.category} / in the room</p>
          <h1 data-testid="heading-profile" className="display mt-2 text-4xl font-extrabold tracking-[-.07em] md:text-5xl">{user.displayName}</h1>
          <p className="mono mt-1 text-xs text-[#9b89a4]">@{user.username}</p>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#c8b7d1]">{user.bio || 'No bio, just good timing.'}</p>
          {user.basicInfo && <p data-testid="text-profile-basic-info" className="mono mt-3 max-w-lg text-[10px] uppercase tracking-[.12em] text-[#bda4cb]">{user.basicInfo}</p>}
          <div className="mt-4 flex gap-5 text-xs text-[#a08da9]"><span><strong className="text-white">{user.followers || 0}</strong> followers</span><span><strong className="text-white">{user.posts?.length || 0}</strong> posts</span></div>
        </div>
        <div className="flex gap-2">
          {ownsProfile ? <Link href={`/profile/${user.username}/edit`} data-testid="button-profile-edit" className="flex items-center gap-2 rounded-full bg-[#d59cff] px-5 py-3 text-xs font-bold text-[#170d1d]"><Pencil size={14} />Edit profile</Link> : <button data-testid="button-profile-follow" disabled={follow.isPending} onClick={toggle} className={`rounded-full px-5 py-3 text-xs font-bold transition ${isFollowing ? 'border border-[#684582] text-[#c1a5d1]' : 'bg-[#d59cff] text-[#170d1d]'}`}>{isFollowing ? 'Following' : 'Follow'}</button>}
          <button type="button" data-testid="button-profile-share" onClick={share} aria-label="Copy profile link" className="rounded-full border border-[#493258] p-3 text-[#b59bbf]"><Send size={15} /></button>
        </div>
      </div>
      {shareStatus && <p data-testid="status-profile-share" className="relative mt-4 text-xs text-[#c8b1d6]">{shareStatus}</p>}
    </div>
    <div className="mt-10 flex items-center justify-between"><SectionTitle title={ownsProfile ? 'Your latest traces' : 'Their traces'} count={user.posts?.length || 0} /><span className="flex items-center gap-2 text-xs text-[#8c7996]">Newest <ChevronDown size={14} /></span></div>
    {user.posts?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{user.posts.map((post: any) => <div key={post.id} className="[&>article]:h-full"><PostCard post={post} /></div>)}</div> : <EmptyState title="Nothing posted yet." body="When they leave a trace, it will show up here." />}
  </div></AppShell>;
}

/*
function LegacyChatPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: currentUser } = useGetCurrentUser({ query: { enabled: Boolean(isSignedIn), retry: false, queryKey: getGetCurrentUserQueryKey() } });
  const chats = useGetChats({ query: { enabled: Boolean(isSignedIn), queryKey: getGetChatsQueryKey(), retry: false } });
  const [activeId, setActiveId] = useState<number | null>(null);
  const selectedId = activeId || chats.data?.[0]?.id || 0;
  const messages = useGetChatMessages(selectedId, { query: { enabled: Boolean(isSignedIn && selectedId), queryKey: getGetChatMessagesQueryKey(selectedId), retry: false, refetchInterval: 3000 } });
  const send = useSendChatMessage();
  const [body, setBody] = useState('');
  const active = chats.data?.find((chat: any) => chat.id === selectedId);
  const submit = () => { if (!body.trim() || !selectedId) return; send.mutate({ id: selectedId, data: { body: body.trim() } }, { onSuccess: () => { setBody(''); queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(selectedId) }); queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() }); } }); };
  if (isLoaded && !isSignedIn) return <AppShell><EmptyState title="Your inbox is behind the door." body="Sign in to join the conversation and keep up with the room." action={<Link href="/sign-in" data-testid="link-chat-sign-in" className="mt-5 inline-block rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">Sign in</Link>} /></AppShell>;
  return <AppShell><div className="mb-7"><p className="mono mb-3 text-[10px] uppercase tracking-[.25em] text-[#ff74c7]">Private line</p><h1 className="display text-5xl font-extrabold tracking-[-.08em]">Messages<span className="text-[#d59cff]">.</span></h1></div><div className="soft-card grid min-h-[560px] overflow-hidden rounded-2xl md:grid-cols-[290px_1fr]">{chats.isLoading ? <LoadingState label="Opening private lines" /> : chats.isError ? <div className="p-5"><ErrorState retry={() => chats.refetch()} label="Sign in to open your messages." /></div> : chats.data?.length ? <><div className="border-b border-[#33223f] md:border-b-0 md:border-r"><div className="flex items-center justify-between border-b border-[#33223f] p-5"><h2 className="display font-bold">Conversations</h2><button data-testid="button-new-chat" className="rounded-lg p-2 text-[#d59cff] hover:bg-[#2a1936]"><Plus size={16} /></button></div>{chats.data.map((chat: any) => <button key={chat.id} data-testid={`button-conversation-${chat.id}`} onClick={() => setActiveId(chat.id)} className={`flex w-full items-center gap-3 border-b border-[#261a31] p-4 text-left transition ${chat.id === selectedId ? 'bg-[#29193a]' : 'hover:bg-[#20152a]'}`}><Avatar user={chat.participant} size="sm" /><div className="min-w-0 flex-1"><strong className="block text-xs">{chat.participant?.displayName}</strong><span className="block truncate text-[11px] text-[#85738f]">{chat.lastMessage}</span></div>{chat.unread > 0 && <span className="rounded-full bg-[#ff74c7] px-1.5 py-0.5 text-[9px] font-bold text-[#1b0e1c]">{chat.unread}</span>}</button>)}</div><div className="flex min-h-[500px] flex-col">{active ? <><div className="flex items-center gap-3 border-b border-[#33223f] p-5"><Avatar user={active.participant} size="sm" /><div><strong className="block text-sm">{active.participant?.displayName}</strong><span className="mono flex items-center gap-1 text-[9px] uppercase text-[#ff74c7]"><span className="h-1.5 w-1.5 rounded-full bg-[#ff74c7]" />online in the room</span></div><button data-testid="button-chat-more" className="ml-auto text-[#806d89]"><MoreHorizontal size={18} /></button></div><div className="flex-1 space-y-4 overflow-auto p-5">{messages.isLoading ? <LoadingState label="Loading messages" /> : messages.isError ? <ErrorState retry={() => messages.refetch()} /> : messages.data?.length ? messages.data.map((item: any) => { const mine = item.sender?.id === currentUser?.id; return <div key={item.id} data-testid={`message-${item.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`${mine ? 'bg-[#d59cff] text-[#170d1d]' : 'bg-[#271833] text-[#d1c1d9]'} max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-5`}>{item.body}<span className="mono mt-1 block text-[9px] opacity-50">{new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div></div>; }) : <EmptyState title="Start a new line." body="Say something worth staying up for." />}</div><div className="border-t border-[#33223f] p-4"><div className="flex gap-2 rounded-xl border border-[#3b2749] bg-[#160e1e] p-2"><input data-testid="input-chat-message" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Write something..." className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-[#65566d]" /><button data-testid="button-send-message" onClick={submit} disabled={send.isPending || !body.trim()} className="rounded-lg bg-[#d59cff] p-2 text-[#170d1d] disabled:opacity-40"><Send size={16} /></button></div></div></> : <EmptyState title="Pick a conversation." body="Your private lines will appear here." />}</div></> : <div className="col-span-full p-5"><EmptyState title="No conversations yet." body="When the room recognizes you, messages will follow." action={<Link href="/explore" data-testid="link-chat-explore" className="mt-5 inline-block rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">Find someone</Link>} /></div>}</div></AppShell>;
}
*/

function ChatPage() {
  return <ChatExperience />;
  /*
  const { isLoaded, isSignedIn } = useAuth();
  const { data: currentUser } = useGetCurrentUser({ query: { enabled: Boolean(isSignedIn), retry: false, queryKey: getGetCurrentUserQueryKey() } });
  const chats = useGetChats({ query: { enabled: Boolean(isSignedIn), queryKey: getGetChatsQueryKey(), retry: false } });
  const [activeId, setActiveId] = useState<number | null>(null);
  const selectedId = activeId || chats.data?.[0]?.id || 0;
  const messages = useGetChatMessages(selectedId, { query: { enabled: Boolean(isSignedIn && selectedId), queryKey: getGetChatMessagesQueryKey(selectedId), retry: false, refetchInterval: 3000, refetchIntervalInBackground: false } });
  const createChat = useCreateChat();
  const send = useSendChatMessage();
  const [body, setBody] = useState('');
  const active = chats.data?.find((chat: any) => chat.id === selectedId);
  const startConversation = () => {
    const username = window.prompt('Enter the username of the person you want to message.');
    if (!username?.trim()) return;
    createChat.mutate({ data: { username: username.trim() } }, {
      onSuccess: (conversation) => {
        setActiveId(conversation.id);
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      },
    });
  };
  const submit = () => {
    if (!body.trim() || !selectedId) return;
    send.mutate({ id: selectedId, data: { body: body.trim() } }, {
      onSuccess: () => {
        setBody('');
        queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(selectedId) });
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      },
    });
  };
  const error = (createChat.error as any)?.data?.error || (send.error as any)?.data?.error;
  if (isLoaded && !isSignedIn) return <AppShell><EmptyState title="Your inbox is behind the door." body="Sign in to start private conversations." action={<Link href="/sign-in" data-testid="link-chat-sign-in" className="mt-5 inline-block rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">Sign in</Link>} /></AppShell>;
  return <AppShell><div className="mb-7"><p className="mono mb-3 text-[10px] uppercase tracking-[.25em] text-[#ff74c7]">Private line</p><h1 className="display text-5xl font-extrabold tracking-[-.08em]">Messages<span className="text-[#d59cff]">.</span></h1></div><div className="soft-card grid min-h-[560px] overflow-hidden rounded-2xl md:grid-cols-[290px_1fr]">{chats.isLoading ? <LoadingState label="Opening private lines" /> : chats.isError ? <div className="p-5"><ErrorState retry={() => chats.refetch()} label="Your messages could not be opened." /></div> : chats.data?.length ? <><aside className="border-b border-[#33223f] md:border-b-0 md:border-r"><div className="flex items-center justify-between border-b border-[#33223f] p-5"><h2 className="display font-bold">Conversations</h2><button type="button" data-testid="button-new-chat" onClick={startConversation} disabled={createChat.isPending} className="rounded-lg p-2 text-[#d59cff] hover:bg-[#2a1936] disabled:opacity-40"><Plus size={16} /></button></div>{chats.data.map((chat: any) => <button key={chat.id} type="button" data-testid={`button-conversation-${chat.id}`} onClick={() => setActiveId(chat.id)} className={`flex w-full items-center gap-3 border-b border-[#261a31] p-4 text-left transition ${chat.id === selectedId ? 'bg-[#29193a]' : 'hover:bg-[#20152a]'}`}><Avatar user={chat.participant} size="sm" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{chat.participant?.displayName}</strong><span className="block truncate text-[11px] text-[#85738f]">{chat.lastMessage}</span></span></button>)}</aside><section className="flex min-h-[500px] flex-col">{active ? <><div className="flex items-center gap-3 border-b border-[#33223f] p-5"><Avatar user={active.participant} size="sm" /><div><strong className="block text-sm">{active.participant?.displayName}</strong><span className="mono text-[9px] uppercase text-[#b78dca]">@{active.participant?.username}</span></div></div><div className="flex-1 space-y-4 overflow-auto p-5">{messages.isLoading ? <LoadingState label="Loading messages" /> : messages.isError ? <ErrorState retry={() => messages.refetch()} label="Messages could not be loaded." /> : messages.data?.length ? messages.data.map((item: any) => { const mine = item.sender?.id === currentUser?.id; return <div key={item.id} data-testid={`message-${item.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`${mine ? 'bg-[#d59cff] text-[#170d1d]' : 'bg-[#271833] text-[#d1c1d9]'} max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-5`}>{item.body}<span className="mono mt-1 block text-[9px] opacity-50">{new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div></div>; }) : <EmptyState title="Start a new line." body="Say something worth staying up for." />}</div><div className="border-t border-[#33223f] p-4"><div className="flex gap-2 rounded-xl border border-[#3b2749] bg-[#160e1e] p-2"><input data-testid="input-chat-message" value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder="Write something..." className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-[#65566d]" /><button type="button" data-testid="button-send-message" onClick={submit} disabled={send.isPending || !body.trim()} className="rounded-lg bg-[#d59cff] p-2 text-[#170d1d] disabled:opacity-40"><Send size={16} /></button></div>{error && <p data-testid="status-chat-error" className="mt-3 text-xs text-[#ff9abf]">{error}</p>}</div></> : <EmptyState title="Choose a conversation." body="Start a private line with a member when you are ready." action={<button type="button" data-testid="button-new-chat-empty" onClick={startConversation} className="mt-5 rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">New conversation</button>} />}</section></> : <div className="col-span-full p-5"><EmptyState title="No conversations yet." body="Start a private line with someone in the room." action={<button type="button" data-testid="button-new-chat-empty" onClick={startConversation} disabled={createChat.isPending} className="mt-5 rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d] disabled:opacity-40">New conversation</button>} />}{error && <p data-testid="status-chat-error" className="mt-4 text-center text-xs text-[#ff9abf]">{error}</p>}</div>}</div></AppShell>;
}
  */
}

function ChatExperience() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: currentUser } = useGetCurrentUser({
    query: { enabled: Boolean(isSignedIn), retry: false, queryKey: getGetCurrentUserQueryKey() },
  });
  const chats = useGetChats({
    query: { enabled: Boolean(isSignedIn), retry: false, queryKey: getGetChatsQueryKey() },
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const selectedId = activeId ?? chats.data?.[0]?.id ?? 0;
  const messages = useGetChatMessages(selectedId, {
    query: {
      enabled: Boolean(isSignedIn && selectedId),
      retry: false,
      queryKey: getGetChatMessagesQueryKey(selectedId),
      refetchInterval: 3000,
      refetchIntervalInBackground: false,
    },
  });
  const createChat = useCreateChat();
  const send = useSendChatMessage();
  const [body, setBody] = useState('');
  const active = chats.data?.find((chat: any) => chat.id === selectedId);
  const error = (createChat.error as any)?.data?.error || (send.error as any)?.data?.error;

  const startConversation = () => {
    const username = window.prompt('Enter the username of the person you want to message.');
    if (!username?.trim()) return;
    createChat.mutate({ data: { username: username.trim() } }, {
      onSuccess: (conversation) => {
        setActiveId(conversation.id);
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      },
    });
  };

  const submit = () => {
    if (!body.trim() || !selectedId) return;
    send.mutate({ id: selectedId, data: { body: body.trim() } }, {
      onSuccess: () => {
        setBody('');
        queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(selectedId) });
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      },
    });
  };

  if (!isLoaded) {
    return <AppShell><LoadingState label="Checking your pass" /></AppShell>;
  }

  if (!isSignedIn) {
    return <AppShell><EmptyState title="Your inbox is behind the door." body="Sign in to start private conversations." action={<Link href="/sign-in" data-testid="link-chat-sign-in" className="mt-5 inline-block rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">Sign in</Link>} /></AppShell>;
  }

  return <AppShell>
    <div className="mb-7">
      <p className="mono mb-3 text-[10px] uppercase tracking-[.25em] text-[#ff74c7]">Private line</p>
      <h1 className="display text-5xl font-extrabold tracking-[-.08em]">Messages<span className="text-[#d59cff]">.</span></h1>
    </div>
    <div className="soft-card grid min-h-[560px] overflow-hidden rounded-2xl md:grid-cols-[290px_1fr]">
      {chats.isLoading ? <LoadingState label="Opening private lines" /> : chats.isError ? <div className="p-5"><ErrorState retry={() => chats.refetch()} label="Your messages could not be opened." /></div> : chats.data?.length ? <>
        <aside className="border-b border-[#33223f] md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-[#33223f] p-5"><h2 className="display font-bold">Conversations</h2><button type="button" data-testid="button-new-chat" onClick={startConversation} disabled={createChat.isPending} className="rounded-lg p-2 text-[#d59cff] hover:bg-[#2a1936] disabled:opacity-40"><Plus size={16} /></button></div>
          {chats.data.map((chat: any) => <button key={chat.id} type="button" data-testid={`button-conversation-${chat.id}`} onClick={() => setActiveId(chat.id)} className={`flex w-full items-center gap-3 border-b border-[#261a31] p-4 text-left transition ${chat.id === selectedId ? 'bg-[#29193a]' : 'hover:bg-[#20152a]'}`}><Avatar user={chat.participant} size="sm" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{chat.participant?.displayName}</strong><span className="block truncate text-[11px] text-[#85738f]">{chat.lastMessage}</span></span></button>)}
        </aside>
        <section className="flex min-h-[500px] flex-col">
          {active ? <>
            <div className="flex items-center gap-3 border-b border-[#33223f] p-5"><Avatar user={active.participant} size="sm" /><div><strong className="block text-sm">{active.participant?.displayName}</strong><span className="mono text-[9px] uppercase text-[#b78dca]">@{active.participant?.username}</span></div></div>
            <div className="flex-1 space-y-4 overflow-auto p-5">{messages.isLoading ? <LoadingState label="Loading messages" /> : messages.isError ? <ErrorState retry={() => messages.refetch()} label="Messages could not be loaded." /> : messages.data?.length ? messages.data.map((item: any) => { const mine = item.sender?.id === currentUser?.id; return <div key={item.id} data-testid={`message-${item.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`${mine ? 'bg-[#d59cff] text-[#170d1d]' : 'bg-[#271833] text-[#d1c1d9]'} max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-5`}>{item.body}</div></div>; }) : <EmptyState title="Start a new line." body="Say something worth staying up for." />}</div>
            <div className="border-t border-[#33223f] p-4"><div className="flex gap-2 rounded-xl border border-[#3b2749] bg-[#160e1e] p-2"><input data-testid="input-chat-message" value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder="Write something..." className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-[#65566d]" /><button type="button" data-testid="button-send-message" onClick={submit} disabled={send.isPending || !body.trim()} className="rounded-lg bg-[#d59cff] p-2 text-[#170d1d] disabled:opacity-40"><Send size={16} /></button></div>{error && <p data-testid="status-chat-error" className="mt-3 text-xs text-[#ff9abf]">{error}</p>}</div>
          </> : <EmptyState title="Choose a conversation." body="Start a private line with a member when you are ready." action={<button type="button" data-testid="button-new-chat-empty" onClick={startConversation} className="mt-5 rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">New conversation</button>} />}
        </section>
      </> : <div className="col-span-full p-5"><EmptyState title="No conversations yet." body="Start a private line with someone in the room." action={<button type="button" data-testid="button-new-chat-empty" onClick={startConversation} disabled={createChat.isPending} className="mt-5 rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d] disabled:opacity-40">New conversation</button>} />{error && <p data-testid="status-chat-error" className="mt-4 text-center text-xs text-[#ff9abf]">{error}</p>}</div>}
    </div>
  </AppShell>;
}

function BannerCampaignEditor({ banners, onSaved }: { banners: any[]; onSaved: () => void }) {
  const update = useUpdateAdminBanner();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = banners.find((banner) => banner.id === selectedId) ?? banners[0];
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setForm({
      title: selected.title, body: selected.body || "", imageUrl: selected.imageUrl, destinationUrl: selected.destinationUrl,
      placement: selected.placements?.[0] || "room", displayOrder: String(selected.displayOrder ?? 0),
      startsAt: selected.startsAt ? selected.startsAt.slice(0, 16) : "", endsAt: selected.endsAt ? selected.endsAt.slice(0, 16) : "",
    });
  }, [selected?.id]);
  if (!banners.length || !selected) return null;
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.mutate({ id: selected.id, data: {
      title: form.title, body: form.body, imageUrl: form.imageUrl, destinationUrl: form.destinationUrl,
      placements: [form.placement], displayOrder: Number(form.displayOrder || 0),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    } }, { onSuccess: onSaved });
  };
  return <form onSubmit={save} className="soft-card h-fit rounded-2xl p-5 xl:col-span-2"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><SectionTitle title="Edit campaign and schedule" /><select value={selected.id} onChange={(e) => setSelectedId(Number(e.target.value))} className="rounded-lg border border-[#4c315b] bg-[#180f20] p-2 text-[10px] text-[#e5d3ee]">{banners.map((banner) => <option key={banner.id} value={banner.id}>{banner.title}</option>)}</select></div><div className="grid gap-3 md:grid-cols-2"><input required value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Campaign title" className="admin-input" /><input required value={form.destinationUrl || ""} onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} placeholder="Destination URL" className="admin-input" /><input required value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Image URL" className="admin-input" /><input type="number" value={form.displayOrder || "0"} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} placeholder="Priority (higher first)" className="admin-input" /><textarea value={form.body || ""} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Supporting copy" className="admin-input resize-none md:col-span-2" rows={2} /><select value={form.placement || "room"} onChange={(e) => setForm({ ...form, placement: e.target.value })} className="admin-input"><option value="room">Room</option><option value="explore">Explore</option><option value="journal">Journal</option></select><div className="grid grid-cols-2 gap-3"><input type="datetime-local" value={form.startsAt || ""} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} aria-label="Campaign start" className="admin-input" /><input type="datetime-local" value={form.endsAt || ""} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} aria-label="Campaign end" className="admin-input" /></div></div><div className="mt-4 flex justify-end"><button disabled={update.isPending} className="rounded-xl bg-[#d59cff] px-5 py-3 text-xs font-bold text-[#170d1d]">Save campaign settings</button></div>{update.error && <p className="mt-3 text-xs text-[#ff9abf]">{(update.error as any)?.data?.error || "Campaign could not be saved."}</p>}</form>;
}

function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const currentUser = useGetCurrentUser({ query: { enabled: Boolean(isSignedIn), queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const [tab, setTab] = useState<'overview' | 'users' | 'content' | 'banners' | 'journal' | 'reports' | 'audit'>('overview');
  const [bannerForm, setBannerForm] = useState({ title: '', imageUrl: '', destinationUrl: '', placement: 'room' as 'room' | 'explore' | 'journal' });
  const [articleForm, setArticleForm] = useState({ title: '', slug: '', excerpt: '', body: '', coverImageUrl: '' });
  const hasAdminRole = currentUser.data?.adminRole === 'admin' || currentUser.data?.adminRole === 'owner';
  const enabled = Boolean(isSignedIn && hasAdminRole);
  const dashboard = useGetAdminDashboard({ query: { enabled, queryKey: getGetAdminDashboardQueryKey(), retry: false } });
  const users = useGetAdminUsers(undefined, { query: { enabled, queryKey: getGetAdminUsersQueryKey(), retry: false } });
  const posts = useGetAdminPosts(undefined, { query: { enabled, queryKey: getGetAdminPostsQueryKey(), retry: false } });
  const comments = useGetAdminComments(undefined, { query: { enabled, queryKey: getGetAdminCommentsQueryKey(), retry: false } });
  const banners = useGetAdminBanners({ query: { enabled, queryKey: getGetAdminBannersQueryKey(), retry: false } });
  const articles = useGetAdminArticles({ query: { enabled, queryKey: getGetAdminArticlesQueryKey(), retry: false } });
  const reports = useGetAdminReports({ query: { enabled, queryKey: getGetAdminReportsQueryKey(), retry: false } });
  const audit = useGetAdminAudit({ query: { enabled, queryKey: getGetAdminAuditQueryKey(), retry: false } });
  const updateUser = useUpdateAdminUser();
  const moderatePost = useModerateAdminPost();
  const moderateComment = useModerateAdminComment();
  const createBanner = useCreateAdminBanner();
  const updateBanner = useUpdateAdminBanner();
  const createArticle = useCreateAdminArticle();
  const updateArticle = useUpdateAdminArticle();
  const resolveReport = useResolveAdminReport();
  const refresh = () => {
    [getGetAdminDashboardQueryKey(), getGetAdminUsersQueryKey(), getGetAdminPostsQueryKey(), getGetAdminCommentsQueryKey(), getGetAdminBannersQueryKey(), getGetAdminArticlesQueryKey(), getGetAdminReportsQueryKey(), getGetAdminAuditQueryKey()].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTrendingQueryKey() });
  };
  const confirm = (message: string, fn: () => void) => { if (window.confirm(message)) fn(); };
  const tabs = [
    ['overview', 'Overview', LayoutDashboard], ['users', 'Members', UserCog], ['content', 'Moderation', EyeOff],
    ['banners', 'Banners', ImageIcon], ['journal', 'Journal', FileText], ['reports', 'Reports', Flag], ['audit', 'Activity', ScrollText],
  ] as const;
  if (isLoaded && !isSignedIn) return <AppShell><EmptyState title="Administrator access only." body="Sign in with an Owner or Administrator account to enter the control room." action={<Link href="/sign-in" data-testid="link-admin-sign-in" className="mt-5 inline-block rounded-full bg-[#d59cff] px-5 py-2 text-xs font-bold text-[#170d1d]">Sign in</Link>} /></AppShell>;
  if (isSignedIn && currentUser.isLoading) return <AppShell><LoadingState label="Checking control room access" /></AppShell>;
  if (isSignedIn && (!hasAdminRole || currentUser.isError)) return <AppShell><ErrorState label="Your account does not have administrator access." /></AppShell>;
  if (dashboard.isLoading) return <AppShell><LoadingState label="Opening control room" /></AppShell>;
  const hasDashboardAccess = typeof dashboard.data?.users === 'number' && typeof dashboard.data?.posts === 'number' && typeof dashboard.data?.openReports === 'number';
  if (dashboard.isError || !hasDashboardAccess) return <AppShell><ErrorState retry={() => dashboard.refetch()} label="Your account does not have administrator access." /></AppShell>;
  const metric = (label: string, value: number | undefined, accent = 'text-[#d59cff]') => <div className="soft-card rounded-2xl p-5"><p className="mono text-[9px] uppercase tracking-[.16em] text-[#83718d]">{label}</p><p className={`display mt-3 text-4xl font-extrabold ${accent}`}>{value ?? 0}</p></div>;
  const actionError = (mutation: any) => mutation.error ? <p className="mt-3 text-xs text-[#ff9abf]">{(mutation.error as any)?.data?.error || 'This action could not be completed.'}</p> : null;
  return <AppShell><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mono mb-3 text-[10px] uppercase tracking-[.25em] text-[#ff74c7]">Quiet control / administrator</p><h1 className="display text-5xl font-extrabold tracking-[-.08em]">Run the <span className="text-[#d59cff]">room.</span></h1><p className="mt-3 max-w-xl text-sm text-[#95869f]">Member safety, editorial publishing, campaigns and moderation — with every action recorded.</p></div><div className="flex items-center gap-2 rounded-full border border-[#4a3159] px-4 py-2"><ShieldCheck size={15} className="text-[#d59cff]" /><span className="mono text-[10px] uppercase tracking-[.14em] text-[#a18ca9]">Protected console</span></div></div>
    <div className="mb-7 flex max-w-full gap-2 overflow-x-auto border-b border-[#33223f] pb-3">{tabs.map(([value, label, Icon]) => <button key={value} data-testid={`button-admin-tab-${value}`} onClick={() => setTab(value)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${tab === value ? 'bg-[#d59cff] text-[#170d1d]' : 'text-[#a694b0] hover:bg-[#24172e]'}`}><Icon size={14} />{label}</button>)}</div>
    {tab === 'overview' && <div className="space-y-7"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metric('Members', dashboard.data?.users)}{metric('Posts', dashboard.data?.posts)}{metric('Comments', dashboard.data?.comments)}{metric('Connections', dashboard.data?.followers)}{metric('Active banners', dashboard.data?.activeBanners)}{metric('Open reports', dashboard.data?.openReports, 'text-[#ff91b4]')}</div><section className="soft-card rounded-2xl p-5"><SectionTitle title="Recent control room activity" />{dashboard.data?.recentActivity?.length ? <div className="space-y-3">{dashboard.data.recentActivity.map((event: any) => <div key={event.id} className="flex gap-3 border-b border-[#2d1e38] pb-3 last:border-0"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ff74c7]" /><div><p className="text-xs text-[#d8c9e0]">{event.summary}</p><p className="mono mt-1 text-[9px] uppercase text-[#806d89]}">@{event.actor || 'system'} · {new Date(event.createdAt).toLocaleString()}</p></div></div>)}</div> : <p className="text-sm text-[#9b8aa5]">The log will appear after the first administrative action.</p>}</section></div>}
    {tab === 'users' && <section className="space-y-3">{users.data?.map((member: any) => <div key={member.id} className="soft-card flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center"><Avatar user={member} size="md" /><div className="min-w-0 flex-1"><p className="font-bold">{member.displayName} <span className="mono text-[10px] font-normal text-[#957fa0]">@{member.username}</span></p><p className="mono mt-1 text-[9px] uppercase tracking-[.12em] text-[#83718d]}">{member.adminRole} · {member.accountStatus} · {member.posts} posts · {member.followers} followers</p>{member.suspensionReason && <p className="mt-2 text-xs text-[#ff9abf]">{member.suspensionReason}</p>}</div><div className="flex flex-wrap gap-2"><button disabled={member.adminRole === 'owner'} onClick={() => confirm(member.accountStatus === 'active' ? `Suspend @${member.username}? Their posts remain reversible.` : `Reactivate @${member.username}?`, () => updateUser.mutate({ id: member.id, data: { accountStatus: member.accountStatus === 'active' ? 'suspended' : 'active', suspensionReason: member.accountStatus === 'active' ? 'Suspended from the control room' : undefined } }, { onSuccess: refresh }))} className={`rounded-lg border px-3 py-2 text-[10px] font-bold disabled:opacity-40 ${member.accountStatus === 'active' ? 'border-[#6d3851] text-[#ff9abf]' : 'border-[#536445] text-[#b8e99b]'}`}>{member.accountStatus === 'active' ? <><Ban className="mr-1 inline" size={12} />Suspend</> : <><UserCheck className="mr-1 inline" size={12} />Reactivate</>}</button><button disabled={member.adminRole === 'owner'} onClick={() => confirm(`${member.adminRole === 'admin' ? 'Remove administrator access from' : 'Make'} @${member.username} ${member.adminRole === 'admin' ? '' : 'an administrator'}?`, () => updateUser.mutate({ id: member.id, data: { adminRole: member.adminRole === 'admin' ? 'member' : 'admin' } }, { onSuccess: refresh }))} className="rounded-lg border border-[#56376a] px-3 py-2 text-[10px] font-bold text-[#d9b8ef] disabled:opacity-40"><UserCog className="mr-1 inline" size={12} />{member.adminRole === 'admin' ? 'Remove admin' : 'Make admin'}</button></div></div>)}{actionError(updateUser)}</section>}
    {tab === 'content' && <div className="grid gap-6 xl:grid-cols-2"><section><SectionTitle title="Posts" count={posts.data?.length} />{posts.data?.map((post: any) => <div key={post.id} className="soft-card mb-3 flex gap-3 rounded-xl p-3"><img src={post.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs text-[#dfd0e7]">@{post.author.username} · {post.caption}</p><p className="mono mt-2 text-[9px] uppercase text-[#806d89]}">{post.moderationStatus}</p></div><button onClick={() => confirm(`${post.moderationStatus === 'visible' ? 'Hide' : 'Restore'} this post?`, () => moderatePost.mutate({ id: post.id, data: { status: post.moderationStatus === 'visible' ? 'hidden' : 'visible', reason: post.moderationStatus === 'visible' ? 'Hidden from control room' : undefined } }, { onSuccess: refresh }))} className="rounded-lg border border-[#5c3b6e] px-3 text-[10px] font-bold text-[#d8b5ed]">{post.moderationStatus === 'visible' ? <EyeOff size={14} /> : <RotateCcw size={14} />}</button></div>)}</section><section><SectionTitle title="Comments" count={comments.data?.length} />{comments.data?.map((comment: any) => <div key={comment.id} className="soft-card mb-3 flex gap-3 rounded-xl p-3"><Avatar user={comment.author} size="sm" /><div className="min-w-0 flex-1"><p className="text-xs text-[#dfd0e7]"><strong>@{comment.author.username}</strong> {comment.body}</p><p className="mono mt-2 text-[9px] uppercase text-[#806d89]}">{comment.moderationStatus}</p></div><button onClick={() => confirm(`${comment.moderationStatus === 'visible' ? 'Hide' : 'Restore'} this comment?`, () => moderateComment.mutate({ id: comment.id, data: { status: comment.moderationStatus === 'visible' ? 'hidden' : 'visible', reason: comment.moderationStatus === 'visible' ? 'Hidden from control room' : undefined } }, { onSuccess: refresh }))} className="rounded-lg border border-[#5c3b6e] px-3 text-[10px] font-bold text-[#d8b5ed]">{comment.moderationStatus === 'visible' ? <EyeOff size={14} /> : <RotateCcw size={14} />}</button></div>)}</section>{actionError(moderatePost)}{actionError(moderateComment)}</div>}
    {tab === 'banners' && <div className="grid gap-6 xl:grid-cols-[370px_1fr]"><form onSubmit={(event) => { event.preventDefault(); createBanner.mutate({ data: { ...bannerForm, body: '', placements: [bannerForm.placement], isActive: true } }, { onSuccess: () => { setBannerForm({ title: '', imageUrl: '', destinationUrl: '', placement: 'room' }); refresh(); } }); }} className="soft-card h-fit rounded-2xl p-5"><SectionTitle title="New campaign banner" /><div className="space-y-3"><input required value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} placeholder="Campaign title" className="admin-input" /><input required value={bannerForm.imageUrl} onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })} placeholder="Image URL" className="admin-input" /><input required value={bannerForm.destinationUrl} onChange={(e) => setBannerForm({ ...bannerForm, destinationUrl: e.target.value })} placeholder="Destination URL" className="admin-input" /><select value={bannerForm.placement} onChange={(e) => setBannerForm({ ...bannerForm, placement: e.target.value as any })} className="admin-input"><option value="room">Room</option><option value="explore">Explore</option><option value="journal">Journal</option></select><button disabled={createBanner.isPending} className="w-full rounded-xl bg-[#d59cff] py-3 text-xs font-bold text-[#170d1d]"><CirclePlus className="mr-1 inline" size={14} />Create banner</button></div>{actionError(createBanner)}</form><div className="grid gap-3 md:grid-cols-2">{banners.data?.map((banner: any) => <div key={banner.id} className="soft-card overflow-hidden rounded-2xl"><img src={banner.imageUrl} alt="" className="h-32 w-full object-cover" /><div className="p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{banner.title}</p><p className="mono mt-1 text-[9px] uppercase text-[#806d89]}">{banner.placements.join(', ')} · {banner.impressions} views · {banner.clicks} clicks</p></div><button onClick={() => confirm(`${banner.isActive ? 'Deactivate' : 'Activate'} this banner?`, () => updateBanner.mutate({ id: banner.id, data: { isActive: !banner.isActive } }, { onSuccess: refresh }))} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${banner.isActive ? 'bg-[#31213f] text-[#ff9bc4]' : 'bg-[#d59cff] text-[#170d1d]'}`}>{banner.isActive ? 'Deactivate' : 'Activate'}</button></div></div></div>)}</div>{actionError(updateBanner)}</div>}
    {tab === 'banners' && <BannerCampaignEditor banners={banners.data || []} onSaved={refresh} />}
    {tab === 'journal' && <div className="grid gap-6 xl:grid-cols-[420px_1fr]"><form onSubmit={(event) => { event.preventDefault(); createArticle.mutate({ data: { ...articleForm, status: 'draft' } }, { onSuccess: () => { setArticleForm({ title: '', slug: '', excerpt: '', body: '', coverImageUrl: '' }); refresh(); } }); }} className="soft-card h-fit rounded-2xl p-5"><SectionTitle title="Draft a Journal article" /><div className="space-y-3"><input required value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} placeholder="Title" className="admin-input" /><input required value={articleForm.slug} onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })} placeholder="url-safe-slug" className="admin-input" /><input required value={articleForm.coverImageUrl} onChange={(e) => setArticleForm({ ...articleForm, coverImageUrl: e.target.value })} placeholder="Cover image URL" className="admin-input" /><textarea required rows={2} value={articleForm.excerpt} onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })} placeholder="Short excerpt" className="admin-input resize-none" /><textarea required rows={5} value={articleForm.body} onChange={(e) => setArticleForm({ ...articleForm, body: e.target.value })} placeholder="Article body" className="admin-input resize-none" /><button disabled={createArticle.isPending} className="w-full rounded-xl bg-[#d59cff] py-3 text-xs font-bold text-[#170d1d]">Save as draft</button></div>{actionError(createArticle)}</form><div className="space-y-3">{articles.data?.map((article: any) => <div key={article.id} className="soft-card flex gap-4 rounded-2xl p-4"><img src={article.coverImageUrl} alt="" className="h-20 w-20 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="font-bold">{article.title}</p><p className="mt-1 line-clamp-2 text-xs text-[#aa98b3]">{article.excerpt}</p><p className="mono mt-2 text-[9px] uppercase text-[#806d89]}">{article.status}</p></div><select value={article.status} onChange={(e) => updateArticle.mutate({ id: article.id, data: { status: e.target.value as any } }, { onSuccess: refresh })} className="h-fit rounded-lg border border-[#4c315b] bg-[#180f20] p-2 text-[10px] text-[#e5d3ee]"><option value="draft">Draft</option><option value="published">Publish</option><option value="hidden">Hide</option></select></div>)}{actionError(updateArticle)}</div></div>}
    {tab === 'reports' && <section className="space-y-3">{reports.data?.length ? reports.data.map((report: any) => <div key={report.id} className="soft-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center"><Flag size={18} className="text-[#ff74c7]" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{report.targetType} #{report.targetId}</p><p className="mt-1 text-xs text-[#ad9ab7]">{report.reason}</p><p className="mono mt-2 text-[9px] uppercase text-[#806d89]}">{report.status} · @{report.reporter || 'anonymous'}</p>{report.resolution && <p className="mt-2 text-xs text-[#bca9c8]">{report.resolution}</p>}</div>{report.status === 'open' && <button onClick={() => { const resolution = window.prompt('Resolution note'); if (resolution?.trim()) resolveReport.mutate({ id: report.id, data: { resolution } }, { onSuccess: refresh }); }} className="rounded-lg bg-[#d59cff] px-3 py-2 text-[10px] font-bold text-[#170d1d]">Resolve</button>}</div>) : <EmptyState title="No open reports." body="New reports from the room will be resolved here." />}{actionError(resolveReport)}</section>}
    {tab === 'audit' && <section className="soft-card rounded-2xl p-5"><SectionTitle title="Audit trail" count={audit.data?.length} />{audit.data?.map((event: any) => <div key={event.id} className="flex gap-3 border-b border-[#2d1e38] py-3 last:border-0"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d59cff]" /><div><p className="text-xs text-[#dbcde3]">{event.summary}</p><p className="mono mt-1 text-[9px] uppercase text-[#806d89]}">{event.action} · @{event.actor || 'system'} · {new Date(event.createdAt).toLocaleString()}</p></div></div>)}</section>}
  </AppShell>;
}

function PublicProfileRoute() { return <ProfilePage />; }
function ProfileEditorRoute() { return <ProfilePage startEditing />; }

function Router() {
  const [location] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/sign-in/*?"><div className="flex min-h-[100dvh] items-center justify-center bg-[#120d18] px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div></Route>
    <Route path="/sign-up/*?"><div className="flex min-h-[100dvh] items-center justify-center bg-[#120d18] px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div></Route>
    <Route path="/" component={HomeRoute} /><Route path="/explore" component={ExplorePage} /><Route path="/journal/:slug" component={BlogArticlePage} /><Route path="/journal" component={BlogPage} /><Route path="/blog/:slug" component={BlogArticlePage} /><Route path="/blog" component={BlogPage} /><Route path="/profile/:username/edit" component={ProfileEditorRoute} /><Route path="/profile/:username" component={PublicProfileRoute} /><Route path="/chat" component={ChatPage} /><Route path="/admin" component={AdminPage} /><Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function HomeRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: user, isLoading } = useGetCurrentUser({ query: { enabled: Boolean(isLoaded && isSignedIn), retry: false, queryKey: getGetCurrentUserQueryKey() } });
  if (!isLoaded) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#120d18]"><LoadingState label="Checking your pass" /></div>;
  if (!isSignedIn) return <LandingPage />;
  if (isLoading) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#120d18]"><LoadingState label="Finding your pass" /></div>;
  return user ? <FeedPage /> : <LandingPage />;
}

function App() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    appearance={{
      theme: shadcn,
      cssLayerName: 'clerk',
       options: { logoPlacement: 'inside', logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/by-omito-official-logo.png` },
      variables: { colorPrimary: '#d59cff', colorForeground: '#f5eaff', colorMutedForeground: '#a99ab4', colorBackground: '#1a1022', colorInput: '#160e1e', colorInputForeground: '#ffffff', colorNeutral: '#493258', fontFamily: 'Manrope, sans-serif', borderRadius: '0.8rem' },
      elements: { rootBox: 'w-full flex justify-center', cardBox: 'bg-[#1a1022] rounded-2xl w-[440px] max-w-full overflow-hidden', card: '!shadow-none !border-0 !bg-transparent', footer: '!shadow-none !border-0 !bg-transparent', headerTitle: 'text-[#f5eaff]', headerSubtitle: 'text-[#a99ab4]', formFieldLabel: 'text-[#cdbbd6]', formFieldInput: 'bg-[#160e1e] text-white border-[#493258]', formButtonPrimary: 'bg-[#d59cff] text-[#170d1d]', socialButtonsBlockButton: 'border-[#493258] text-[#f5eaff]', socialButtonsBlockButtonText: 'text-[#f5eaff]', footerActionLink: 'text-[#d59cff]', footerActionText: 'text-[#a99ab4]', dividerText: 'text-[#a99ab4]', dividerLine: 'bg-[#493258]' },
    }}
  ><QueryClientProvider client={queryClient}><WouterRouter base={basePath}><Router /></WouterRouter></QueryClientProvider></ClerkProvider>;
}

export default App;