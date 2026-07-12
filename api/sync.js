import { verifyPiAccessToken } from '../lib/pi.js';
import { ensureUser, supabase } from '../lib/supabase.js';

const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user: piUser } = await verifyPiAccessToken(req);
    const dbUser = await ensureUser(piUser);
    const chats = Array.isArray(req.body?.chats) ? req.body.chats.slice(0, 100) : [];
    const conversations = chats.filter(c => isUuid(c.id)).map(c => ({
      id: c.id, user_id: dbUser.id, title: String(c.title || 'محادثة جديدة').slice(0, 160),
      updated_at: new Date(Number(c.time) || Date.now()).toISOString()
    }));
    if (conversations.length) await supabase('conversations?on_conflict=id,user_id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(conversations)
    });
    const messages = chats.flatMap(c => isUuid(c.id) ? (Array.isArray(c.messages) ? c.messages : []).slice(-500).filter(m => isUuid(m.id)).map((m, position) => ({
      id: m.id, conversation_id: c.id, user_id: dbUser.id, role: ['user','assistant'].includes(m.role) ? m.role : 'assistant',
      content: String(m.text || '').slice(0, 200000), model_name: m.modelName ? String(m.modelName).slice(0, 120) : null,
      attachments: Array.isArray(m.files) ? m.files.map(f => ({ name: f.name, type: f.type })).slice(0, 6) : [],
      position, created_at: new Date(Number(m.time) || Date.now()).toISOString()
    })) : []);
    if (messages.length) await supabase('messages?on_conflict=id,user_id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(messages)
    });
    return res.status(200).json({ synced: true, conversations: conversations.length, messages: messages.length });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Database sync failed.' });
  }
}
