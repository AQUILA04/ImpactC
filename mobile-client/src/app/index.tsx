import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { io, type Socket } from 'socket.io-client';

const API = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3001/api';
const SOCKET_BASE = API.replace(/\/api$/, '');
type Tab = 'access' | 'onboarding' | 'discover' | 'availability' | 'chat';

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('access');
  const [email, setEmail] = useState('member.mobile@impactc.local');
  const [password, setPassword] = useState('SecurePass123!');
  const [token, setToken] = useState('');
  const [notice, setNotice] = useState('Bienvenue dans le parcours ImpactC.');
  const [profiles, setProfiles] = useState<Array<{ id: string; firstName: string; age: number; profession: string; city: string; tagline: string }>>([]);
  const [journeyId, setJourneyId] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Array<{ id: string; content: string; sentAt: string }>>([]);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', gender: 'FEMALE', dateOfBirth: '1998-01-01', city: '', churchDepartment: '', departmentLeader: '', profession: '', financialRange: '', profilePhotoUrl: '', tagline: '', searchMinAge: '25', searchMaxAge: '40', consent: false });

  const headers = useMemo(() => ({ 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }), [token]);
  const messageViolatesPolicy = /@|\d{7,}|instagram|whatsapp|telegram/i.test(message);

  useEffect(() => {
    if (!token) return;
    const socket = io(`${SOCKET_BASE}/chat`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('message:receive', (entry: { id: string; content: string; sentAt: string }) => setChat((current) => current.some((item) => item.id === entry.id) ? current : [...current, entry]));
    socket.on('chat:error', (error: { message?: string }) => { setChatBlocked(true); setNotice(error.message ?? 'Message bloqué par la politique de conversation encadrée.'); });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);
  const call = async <T,>(path: string, options?: RequestInit): Promise<T> => {
    const result = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } });
    const body = await result.json();
    if (!result.ok) throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Une erreur est survenue');
    return body.data as T;
  };
  const run = async (action: () => Promise<void>) => { try { await action(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Action impossible'); } };

  const authenticate = (mode: 'register' | 'login') => run(async () => {
    const response = await call<{ accessToken: string }>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(response.accessToken); setTab('onboarding'); setNotice(mode === 'register' ? 'Compte créé. Complétez votre profil pour validation.' : 'Connexion réussie.');
  });
  const pickProfilePhoto = () => run(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Autorisez l’accès aux photos pour choisir votre portrait.');
    const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.9 });
    if (selection.canceled) return;
    const asset = selection.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Choisissez une photo de 5 Mo maximum.');
    const data = new FormData();
    data.append('file', { uri: asset.uri, name: asset.fileName ?? 'profile-photo.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
    setUploadingPhoto(true);
    try {
      const response = await fetch(`${API}/media/profile-photo`, { method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Impossible d’envoyer la photo.');
      setForm((current) => ({ ...current, profilePhotoUrl: body.data.reference }));
      setNotice('Photo recadrée au format 4:5 et prête à être soumise.');
    } finally { setUploadingPhoto(false); }
  });
  const submitProfile = () => run(async () => {
    await call('/profiles', { method: 'POST', body: JSON.stringify({ ...form, searchMinAge: Number(form.searchMinAge), searchMaxAge: Number(form.searchMaxAge) }) });
    setNotice('Profil envoyé. Il reste invisible jusqu’à validation par un Responsable.');
  });
  const loadDiscover = () => run(async () => { const result = await call<{ items: typeof profiles }>('/discover'); setProfiles(result.items); setTab('discover'); setNotice(result.items.length ? 'Profils disponibles chargés.' : 'Expanding the Search — aucun profil ne correspond actuellement.'); });
  const interest = (targetProfileId: string) => run(async () => { const result = await call<{ matched: boolean }>('/interests', { method: 'POST', body: JSON.stringify({ targetProfileId }) }); setNotice(result.matched ? 'Intérêt enregistré. Un Responsable a été alerté d’un match réciproque.' : 'Interest registered. Cette action reste confidentielle.'); });
  const saveAvailability = () => run(async () => { await call('/profiles/me/availability', { method: 'PUT', body: JSON.stringify({ slots: [{ weekday: 6, startTime: '10:00', endTime: '12:00' }, { weekday: 2, startTime: '18:00', endTime: '20:00' }] }) }); setNotice('Disponibilités hebdomadaires sauvegardées.'); });
  const loadChat = () => run(async () => {
    if (!journeyId.trim()) throw new Error('Saisissez l’identifiant du Journey avant de charger le chat.');
    const history = await call<typeof chat>(`/journeys/${journeyId}/messages`);
    setChat(history); setChatBlocked(false); setTab('chat');
    socketRef.current?.emit('journey:join', { journeyId });
  });
  const sendMessage = () => run(async () => {
    if (!message.trim() || messageViolatesPolicy) return;
    const content = message.trim();
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('message:send', { journeyId, content });
      setMessage('');
      return;
    }
    const result = await call<{ blocked: boolean; message?: { id: string; content: string; sentAt: string } }>(`/journeys/${journeyId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
    if (result.blocked) { setChatBlocked(true); setNotice('Message bloqué : les coordonnées personnelles ne sont pas autorisées.'); return; }
    if (result.message) setChat((current) => [...current, result.message!]); setMessage('');
  });

  const field = (label: string, key: keyof typeof form, options?: { secure?: boolean; multiline?: boolean }) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} secureTextEntry={options?.secure} multiline={options?.multiline} value={String(form[key])} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} style={[styles.input, options?.multiline && styles.multiline]} /></View>;
  const nav: Array<[Tab, string]> = [['access', 'Accès'], ['onboarding', 'Profil'], ['discover', 'Découvrir'], ['availability', 'RDV'], ['chat', 'Chat']];

  return <SafeAreaView style={styles.safe}><View style={styles.header}><Text style={styles.brand}>IMPACTC</Text><Text style={styles.title}>Parcours supervisé</Text></View><View accessibilityLiveRegion="polite" style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View><ScrollView contentContainerStyle={styles.body}>
    {tab === 'access' && <View style={styles.card}><Text style={styles.heading}>Accès membre</Text><Text style={styles.copy}>Un compte membre ne peut participer qu’après la validation de son profil.</Text><Text style={styles.label}>E-mail</Text><TextInput accessibilityLabel="E-mail" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input}/><Text style={styles.label}>Mot de passe</Text><TextInput accessibilityLabel="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} style={styles.input}/><Pressable accessibilityRole="button" onPress={() => authenticate('login')} style={styles.primary}><Text style={styles.primaryText}>Se connecter</Text></Pressable><Pressable accessibilityRole="button" onPress={() => authenticate('register')} style={styles.secondary}><Text style={styles.secondaryText}>Créer mon compte</Text></Pressable></View>}
    {tab === 'onboarding' && <View style={styles.card}><Text style={styles.heading}>Inscription en 3 étapes</Text><Text style={styles.copy}>Les champs sont validés avant envoi. Vous devez avoir 18 ans révolus et accepter le traitement des données.</Text>{field('Prénom', 'firstName')}{field('Nom', 'lastName')}{field('Date de naissance (AAAA-MM-JJ)', 'dateOfBirth')}{field('Ville', 'city')}{field('Département de l’église', 'churchDepartment')}{field('Responsable de département', 'departmentLeader')}{field('Profession', 'profession')}{field('Fourchette financière', 'financialRange')}{field('Phrase d’accroche', 'tagline')}<View style={styles.field}><Text style={styles.label}>Portrait au format 4:5</Text><Text style={styles.copy}>JPG, PNG ou WebP, 5 Mo maximum. Vous pourrez recadrer votre image avant l’envoi.</Text>{form.profilePhotoUrl ? <Image accessibilityLabel="Aperçu de la photo de profil" source={{ uri: form.profilePhotoUrl.startsWith('media://') ? `${API}/media/profile/${form.profilePhotoUrl.split('/').pop()}` : form.profilePhotoUrl, headers: token ? { authorization: `Bearer ${token}` } : undefined }} style={styles.uploadPreview} /> : null}<Pressable accessibilityRole="button" accessibilityLabel="Choisir une photo de profil" onPress={pickProfilePhoto} disabled={uploadingPhoto} style={[styles.secondary, uploadingPhoto && styles.disabled]}>{uploadingPhoto ? <ActivityIndicator color="#2C4270" /> : <Text style={styles.secondaryText}>{form.profilePhotoUrl ? 'Remplacer la photo' : 'Choisir une photo'}</Text>}</Pressable></View><Pressable onPress={() => setForm((current) => ({ ...current, gender: current.gender === 'FEMALE' ? 'MALE' : 'FEMALE' }))} style={styles.secondary}><Text style={styles.secondaryText}>Genre : {form.gender === 'FEMALE' ? 'Femme' : 'Homme'}</Text></Pressable><Pressable onPress={() => setForm((current) => ({ ...current, consent: !current.consent }))} style={styles.consent}><Text style={styles.check}>{form.consent ? '✓' : '○'}</Text><Text style={styles.copy}>J’accepte le traitement de mes données pour ce parcours.</Text></Pressable><Pressable onPress={submitProfile} style={styles.primary}><Text style={styles.primaryText}>Soumettre à validation</Text></Pressable></View>}
    {tab === 'discover' && <View style={styles.card}><Text style={styles.heading}>Découvrir</Text><Text style={styles.copy}>Les intérêts sont confidentiels : l’autre membre n’est jamais averti directement.</Text>{profiles.length === 0 ? <View style={styles.empty}><Text style={styles.heading}>Expanding the Search</Text><Text style={styles.copy}>Ajustez les critères ou revenez plus tard.</Text></View> : <FlatList scrollEnabled={false} data={profiles} keyExtractor={(item) => item.id} renderItem={({ item }) => <View style={styles.profileCard}><View style={styles.photo}><Text style={styles.photoText}>{item.firstName.slice(0, 1)}</Text></View><Text style={styles.profileName}>{item.firstName}, {item.age}</Text><Text style={styles.copy}>{item.profession} · {item.city}</Text><Text style={styles.tagline}>{item.tagline}</Text><Pressable onPress={() => interest(item.id)} style={styles.primary}><Text style={styles.primaryText}>Exprimer mon intérêt</Text></Pressable></View>} />}</View>}
    {tab === 'availability' && <View style={styles.card}><Text style={styles.heading}>Disponibilités de rendez-vous</Text><Text style={styles.copy}>Les créneaux sont visibles uniquement par les Responsables lors de la coordination d’un match.</Text><View style={styles.slot}><Text style={styles.profileName}>Mercredi · 18:00–20:00</Text></View><View style={styles.slot}><Text style={styles.profileName}>Dimanche · 10:00–12:00</Text></View><Pressable onPress={saveAvailability} style={styles.primary}><Text style={styles.primaryText}>Enregistrer les créneaux</Text></Pressable></View>}
    {tab === 'chat' && <View style={styles.card}><View style={styles.warning}><Text style={styles.warningTitle}>Conversation encadrée</Text><Text style={styles.warningText}>Ne partagez ni téléphone, e-mail ni identifiant de réseau social. Ces messages sont bloqués côté serveur.</Text></View><Text style={styles.heading}>Chat du cheminement</Text><Text style={styles.label}>Identifiant du Journey</Text><TextInput value={journeyId} onChangeText={setJourneyId} accessibilityLabel="Identifiant du Journey" placeholder="UUID du Journey" style={styles.input} /><Pressable onPress={loadChat} style={styles.secondary}><Text style={styles.secondaryText}>Charger le chat sécurisé</Text></Pressable>{chat.map((entry) => <View key={entry.id} style={styles.message}><Text>{entry.content}</Text><Text style={styles.time}>{new Date(entry.sentAt).toLocaleTimeString('fr-FR')}</Text></View>)}<TextInput value={message} onChangeText={(value) => { setMessage(value); if (!/@|\d{7,}|instagram|whatsapp|telegram/i.test(value)) setChatBlocked(false); }} accessibilityLabel="Votre message" placeholder="Écrivez un message conforme..." style={[styles.input, (messageViolatesPolicy || chatBlocked) && styles.errorInput]} /><Pressable onPress={sendMessage} disabled={messageViolatesPolicy} style={[styles.primary, messageViolatesPolicy && styles.disabled]}><Text style={styles.primaryText}>Envoyer</Text></Pressable>{(messageViolatesPolicy || chatBlocked) && <Text accessibilityRole="alert" style={styles.errorText}>Les coordonnées personnelles sont interdites dans cette conversation encadrée.</Text>}</View>}
  </ScrollView><View style={styles.nav}>{nav.map(([key, label]) => <Pressable key={key} onPress={() => { if (key === 'discover') void loadDiscover(); else if (key === 'chat' && journeyId) void loadChat(); else setTab(key); }} style={styles.navButton}><Text style={[styles.navText, tab === key && styles.navTextActive]}>{label}</Text></Pressable>)}</View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F8F7F4' }, header: { backgroundColor: '#3B5998', padding: 20 }, brand: { color: '#F8F7F4', fontSize: 12, fontWeight: '700', letterSpacing: 3 }, title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 4 }, notice: { margin: 12, padding: 12, borderWidth: 1, borderColor: '#C9A84C', backgroundColor: '#fff9e8', borderRadius: 10 }, noticeText: { color: '#856404', fontSize: 14 }, body: { padding: 16, paddingBottom: 92 }, card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }, heading: { color: '#2C4270', fontSize: 24, fontWeight: '700' }, copy: { color: '#4b5563', lineHeight: 21 }, field: { gap: 5 }, label: { color: '#1F2937', fontWeight: '600', fontSize: 14 }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, minHeight: 48, paddingHorizontal: 12, backgroundColor: '#fff' }, multiline: { minHeight: 90, textAlignVertical: 'top' }, primary: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#3B5998', paddingHorizontal: 14 }, primaryText: { color: '#fff', fontWeight: '700' }, secondary: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#3B5998', paddingHorizontal: 14 }, secondaryText: { color: '#2C4270', fontWeight: '700' }, consent: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 }, check: { fontSize: 24, color: '#3B5998' }, empty: { alignItems: 'center', gap: 8, padding: 28 }, profileCard: { marginTop: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 14, gap: 7 }, uploadPreview: { width: '100%', aspectRatio: 4 / 5, borderRadius: 12, backgroundColor: '#E5E7EB' }, photo: { width: '100%', aspectRatio: 4 / 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB', borderRadius: 12 }, photoText: { color: '#2C4270', fontSize: 58, fontWeight: '700' }, profileName: { fontSize: 18, fontWeight: '700', color: '#1F2937' }, tagline: { fontStyle: 'italic', color: '#4b5563' }, slot: { borderRadius: 10, padding: 14, backgroundColor: '#eff6ff' }, warning: { borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#EF44441A', padding: 12, borderRadius: 10, gap: 4 }, warningTitle: { color: '#b91c1c', fontWeight: '700' }, warningText: { color: '#7f1d1d', lineHeight: 20 }, message: { alignSelf: 'flex-start', borderRadius: 12, backgroundColor: '#EFEFEF', padding: 10, gap: 4 }, time: { color: '#64748b', fontSize: 11 }, errorInput: { borderColor: '#EF4444', borderWidth: 2 }, errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' }, disabled: { backgroundColor: '#94a3b8' }, nav: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingVertical: 8 }, navButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, navText: { color: '#64748b', fontSize: 12, fontWeight: '600' }, navTextActive: { color: '#3B5998' } });
