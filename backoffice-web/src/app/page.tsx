'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, HeartHandshake, LayoutDashboard, ShieldCheck, UsersRound } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api';

type ApiEnvelope<T> = { data: T };
type Profile = { id: string; firstName: string; lastName: string; city: string; profession: string; churchDepartment: string; profilePhotoUrl?: string; profilePhotoThumbUrl?: string | null; user: { email: string } };

export default function Home() {
  const [email, setEmail] = useState('responsable@impactc.local');
  const [password, setPassword] = useState('SecurePass123!');
  const [token, setToken] = useState('');
  const [active, setActive] = useState<'dashboard' | 'profiles' | 'matches' | 'journeys' | 'audit' | 'testimonials'>('dashboard');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState('Connectez-vous pour superviser les parcours.');
  const [loading, setLoading] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<{ name: string; src: string } | null>(null);
  const mediaUrlsRef = useRef<Record<string, string>>({});

  const headers = useMemo(() => ({ 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }), [token]);
  useEffect(() => () => { Object.values(mediaUrlsRef.current).forEach((url) => URL.revokeObjectURL(url)); }, []);
  const resolveMediaUrl = async (reference: string, variant: 'original' | 'thumbnail'): Promise<string> => {
    if (!reference.startsWith('media://profile/')) return reference;
    const id = reference.replace('media://profile/', '').split('/')[0];
    const key = `${id}:${variant}`;
    if (mediaUrlsRef.current[key]) return mediaUrlsRef.current[key];
    const response = await fetch(`${API}/media/profile/${id}${variant === 'thumbnail' ? '/thumbnail' : ''}`, { headers: token ? { authorization: `Bearer ${token}` } : undefined });
    if (!response.ok) throw new Error('Impossible de charger la photo du profil.');
    const objectUrl = URL.createObjectURL(await response.blob());
    mediaUrlsRef.current[key] = objectUrl;
    setMediaUrls((current) => ({ ...current, [key]: objectUrl }));
    return objectUrl;
  };
  const prepareThumbnails = (items: Profile[]) => { void Promise.all(items.filter((profile) => Boolean(profile.profilePhotoUrl)).map(async (profile) => resolveMediaUrl(profile.profilePhotoThumbUrl ?? profile.profilePhotoUrl!, 'thumbnail').catch(() => undefined))); };
  const openOriginal = async (profile: Profile) => {
    if (!profile.profilePhotoUrl) return;
    setLoading(`photo:${profile.id}`);
    try { setSelectedPhoto({ name: `${profile.firstName} ${profile.lastName}`, src: await resolveMediaUrl(profile.profilePhotoUrl, 'original') }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Chargement de la photo impossible'); }
    finally { setLoading(null); }
  };
  const request = async <T,>(path: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) }, credentials: 'include' });
    const body = (await response.json()) as ApiEnvelope<T> & { message?: string };
    if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Une erreur est survenue');
    return body.data;
  };

  const login = async () => {
    setLoading('login');
    try {
      const result = await request<{ accessToken: string; role: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(result.accessToken);
      setMessage(`Session ${result.role} ouverte.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Connexion impossible'); } finally { setLoading(null); }
  };

  const load = async (section = active) => {
    setLoading(section);
    try {
      const path = { dashboard: '/dashboard', profiles: '/moderation/profiles', matches: '/matches?type=match', journeys: '/journeys/kanban', audit: '/audit-logs', testimonials: '/testimonials' }[section];
      const result = await request<unknown>(path);
      setData((previous) => ({ ...previous, [section]: result }));
      if (section === 'profiles') prepareThumbnails(result as Profile[]);
      setMessage('Données actualisées.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Chargement impossible'); } finally { setLoading(null); }
  };

  const moderate = async (profileId: string, decision: 'approve' | 'reject') => {
    setLoading(`profile:${profileId}`);
    try {
      await request(`/moderation/profiles/${profileId}`, { method: 'PATCH', body: JSON.stringify({ decision, note: decision === 'reject' ? 'Merci de compléter les informations de vérification.' : undefined }) });
      await load('profiles');
      setMessage(decision === 'approve' ? 'Profil approuvé et notification créée.' : 'Profil rejeté avec motif de révision.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action impossible'); } finally { setLoading(null); }
  };

  const nav = [
    ['dashboard', 'Vue d’ensemble', LayoutDashboard], ['profiles', 'Modération', UsersRound], ['matches', 'Matches', HeartHandshake], ['journeys', 'Cheminements', ShieldCheck], ['audit', 'Audit', ShieldCheck], ['testimonials', 'Témoignages', CheckCircle2],
  ] as const;
  const dashboard = data.dashboard as { pendingApprovals: number; activeMatches: number; activeJourneys: number; weeklyAppointments: number } | undefined;
  const profiles = (data.profiles as Profile[] | undefined) ?? [];
  const matches = (data.matches as Array<{ id: string; partnerOne: Profile; partnerTwo: Profile; assignedLeaderId?: string }> | undefined) ?? [];
  const journeys = (data.journeys as Array<{ id: string; currentStep: string; partnerOne: Profile; partnerTwo: Profile; daysRemaining: number | null }> | undefined) ?? [];
  const audits = (data.audit as Array<{ id: string; action: string; targetType: string; createdAt: string; actor?: { email: string } }> | undefined) ?? [];
  const testimonials = (data.testimonials as Array<{ id: string; title: string; content: string; coupleNames: string; isApproved: boolean }> | undefined) ?? [];

  return (
    <main className="min-h-screen bg-[#F8F7F4] text-[#1F2937]">
      <header className="border-b border-[#EFEFEF] bg-white px-5 py-4 shadow-sm"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="text-xs font-semibold tracking-[0.2em] text-[#856404]">IMPACTC</p><h1 className="font-serif text-2xl font-bold text-[#2C4270]">Espace Responsables</h1></div><span className="rounded-full bg-[#4CAF82]/10 px-3 py-1 text-sm font-medium text-[#356c52]">{token ? 'Session sécurisée' : 'Connexion requise'}</span></div></header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="rounded-2xl bg-[#3B5998] p-3 text-white"><nav className="space-y-1">{nav.map(([key, label, Icon]) => <button key={key} type="button" aria-current={active === key ? 'page' : undefined} aria-label={`Ouvrir ${label}`} onClick={() => { setActive(key); if (token) void load(key); }} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active === key ? 'bg-white/20' : 'hover:bg-white/10'}`}><Icon size={18} aria-hidden="true" />{label}</button>)}</nav></aside>
        <section className="min-w-0 space-y-5">
          {!token ? <div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="font-serif text-2xl font-bold text-[#2C4270]">Connexion de supervision</h2><p className="mt-2 text-sm text-slate-600">Les comptes Responsable et Administrateur sont provisionnés par l’organisation.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 px-3" /></label><label className="grid gap-1 text-sm font-medium">Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 px-3" /></label></div><button type="button" onClick={() => void login()} disabled={loading === 'login'} aria-busy={loading === 'login'} className="mt-5 min-h-12 rounded-lg bg-[#3B5998] px-5 font-semibold text-white hover:bg-[#2C4270] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C4270]">{loading === 'login' ? 'Connexion…' : 'Ouvrir la session'}</button></div> : null}
          <div role="status" aria-live="polite" className="rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-3 text-sm text-[#856404]">{message}</div>
          {token && <><div className="flex items-center justify-between"><div><h2 className="font-serif text-3xl font-bold text-[#2C4270]">{nav.find(([key]) => key === active)?.[1]}</h2><p className="text-sm text-slate-600">Les actions sensibles sont conservées dans le journal de relation.</p></div><button type="button" onClick={() => void load()} disabled={loading === active} aria-busy={loading === active} className="min-h-12 rounded-lg border border-[#3B5998] px-4 text-sm font-semibold text-[#2C4270] hover:bg-[#3B5998]/5 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C4270]">{loading === active ? 'Actualisation…' : 'Actualiser'}</button></div>
          {active === 'dashboard' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Profils en attente', dashboard?.pendingApprovals], ['Matches actifs', dashboard?.activeMatches], ['Cheminements', dashboard?.activeJourneys], ['RDV cette semaine', dashboard?.weeklyAppointments]].map(([label, value]) => <article key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 font-serif text-4xl font-bold text-[#2C4270]">{value ?? '—'}</p></article>)}</div>}
          {active === 'profiles' && <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-[#EFEFEF] text-slate-700"><tr><th className="p-4">Portrait</th><th className="p-4">Membre</th><th className="p-4">Département</th><th className="p-4">Ville</th><th className="p-4">Actions</th></tr></thead><tbody>{profiles.map((profile) => { const thumbKey = profile.profilePhotoUrl?.startsWith('media://profile/') ? `${profile.profilePhotoUrl.replace('media://profile/', '').split('/')[0]}:thumbnail` : ''; const thumbUrl = thumbKey ? mediaUrls[thumbKey] : profile.profilePhotoThumbUrl ?? profile.profilePhotoUrl; return <tr key={profile.id} className="border-t"><td className="p-4"><button type="button" aria-label={`Voir la photo complète de ${profile.firstName} ${profile.lastName}`} onClick={() => void openOriginal(profile)} disabled={!profile.profilePhotoUrl || loading === `photo:${profile.id}`} className="h-14 w-12 overflow-hidden rounded-lg bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C4270] disabled:cursor-not-allowed">{thumbUrl ? <img src={thumbUrl} alt={`Miniature de ${profile.firstName} ${profile.lastName}`} className="h-full w-full object-cover" /> : <span aria-hidden="true" className="font-serif font-bold text-[#2C4270]">{profile.firstName.slice(0, 1)}</span>}</button></td><td className="p-4 font-semibold">{profile.firstName} {profile.lastName}<div className="font-normal text-slate-500">{profile.user.email}</div></td><td className="p-4">{profile.churchDepartment}</td><td className="p-4">{profile.city}</td><td className="p-4"><button type="button" aria-label={`Approuver le profil de ${profile.firstName} ${profile.lastName}`} onClick={() => void moderate(profile.id, 'approve')} disabled={loading === `profile:${profile.id}`} className="mr-2 min-h-12 rounded bg-[#4CAF82] px-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C4270]">{loading === `profile:${profile.id}` ? 'Traitement…' : 'Approuver'}</button><button type="button" aria-label={`Demander une révision du profil de ${profile.firstName} ${profile.lastName}`} onClick={() => void moderate(profile.id, 'reject')} disabled={loading === `profile:${profile.id}`} className="min-h-12 rounded border border-[#EF4444] px-3 font-semibold text-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C4270]">Réviser</button></td></tr>; })}{profiles.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucun profil en attente.</td></tr>}</tbody></table></div>}
          {active === 'matches' && <div className="grid gap-4 md:grid-cols-2">{matches.map((match) => <article key={match.id} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-semibold tracking-wide text-[#856404]">MATCH BILATÉRAL</p><h3 className="mt-2 font-serif text-xl font-bold">{match.partnerOne.firstName} & {match.partnerTwo.firstName}</h3><p className="mt-2 text-sm text-slate-600">Affectez un Responsable puis planifiez le premier rendez-vous.</p></article>)}{matches.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Aucun match à coordonner.</p>}</div>}
          {active === 'journeys' && <div className="grid gap-4 xl:grid-cols-4">{['STEP_1_FIRST_APPOINTMENT', 'STEP_2_ONE_MONTH_STUDY', 'STEP_3_THREE_MONTH_STUDY', 'STEP_4_FINAL'].map((step, index) => <section key={step} className="min-h-48 rounded-2xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-[#2C4270]">Étape {index + 1}</h3><div className="mt-3 space-y-3">{journeys.filter((journey) => journey.currentStep === step).map((journey) => <article key={journey.id} className="rounded-xl border border-slate-200 p-3"><p className="font-semibold">{journey.partnerOne.firstName} & {journey.partnerTwo.firstName}</p><p className={journey.daysRemaining !== null && journey.daysRemaining <= 5 ? 'text-sm font-semibold text-[#b91c1c]' : 'text-sm text-slate-600'}>{journey.daysRemaining === null ? 'Échéance à définir' : `${journey.daysRemaining} jours restants`}</p></article>)}</div></section>)}</div>}
          {active === 'audit' && <div className="rounded-2xl bg-white p-4 shadow-sm">{audits.map((audit) => <article key={audit.id} className="border-b py-3 text-sm"><span className="font-semibold text-[#2C4270]">{audit.action}</span><span className="mx-2 text-slate-400">·</span>{audit.targetType}<span className="mx-2 text-slate-400">·</span>{new Date(audit.createdAt).toLocaleString('fr-FR')}</article>)}{audits.length === 0 && <p className="p-4 text-slate-500">Aucun événement correspondant.</p>}</div>}
          {active === 'testimonials' && <div className="grid gap-4 md:grid-cols-2">{testimonials.map((story) => <article key={story.id} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-[#856404]">{story.isApproved ? 'PUBLIÉ' : 'BROUILLON'}</p><h3 className="mt-2 font-serif text-xl font-bold">{story.title}</h3><p className="mt-2 text-sm text-slate-600">{story.content}</p><p className="mt-3 text-sm font-semibold">{story.coupleNames}</p></article>)}{testimonials.length === 0 && <p className="rounded-2xl bg-white p-8 text-slate-500">Aucun témoignage pour le moment.</p>}</div>}</>}
        </section>
      </div>{selectedPhoto ? <div role="dialog" aria-modal="true" aria-label={`Photo originale de ${selectedPhoto.name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-5"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between gap-4"><h2 className="font-serif text-xl font-bold text-[#2C4270]">Photo de {selectedPhoto.name}</h2><button type="button" onClick={() => setSelectedPhoto(null)} className="min-h-12 rounded-lg border border-[#3B5998] px-4 font-semibold text-[#2C4270] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C4270]">Fermer</button></div><img src={selectedPhoto.src} alt={`Photo originale de ${selectedPhoto.name}`} className="max-h-[70vh] w-full rounded-xl bg-slate-100 object-contain" /></div></div> : null}
    </main>
  );
}
