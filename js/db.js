const DB_URL = 'https://xoleric-9ad1b-default-rtdb.firebaseio.com';
const U = (path) => `${DB_URL}${path}`;

const DB = {

  // ===== USERS =====
  async createUser(user) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const data = { id, username: user.username.trim(), bio: user.bio || '', avatar: user.avatar || '', created: Date.now(), online: true };
    await fetch(U(`/users/${id}.json`), { method: 'PUT', body: JSON.stringify(data) });
    return data;
  },

  async getUser(id, signal) {
    const r = await fetch(U(`/users/${id}.json`), { signal });
    return r.json();
  },

  async updateUser(id, data) {
    await fetch(U(`/users/${id}.json`), { method: 'PATCH', body: JSON.stringify(data) });
  },

  async getAllUsers() {
    const r = await fetch(U('/users.json'));
    const d = await r.json();
    if (!d) return [];
    return Object.values(d);
  },

  async usernameExists(username) {
    const users = await this.getAllUsers();
    return users.some(u => u.username?.toLowerCase() === username.toLowerCase().trim());
  },

  // ===== CONVERSATIONS =====
  async createConversation(conv) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const data = {
      id, type: conv.type || 'group', name: conv.name?.trim() || '',
      desc: conv.desc || '', ownerId: conv.ownerId,
      members: conv.members || {}, created: Date.now(),
    };
    await fetch(U(`/conversations/${id}.json`), { method: 'PUT', body: JSON.stringify(data) });
    return data;
  },

  async getConversations() {
    const r = await fetch(U('/conversations.json'));
    const d = await r.json();
    if (!d) return [];
    return Object.values(d);
  },

  async getConversation(id) {
    const r = await fetch(U(`/conversations/${id}.json`));
    return r.json();
  },

  async updateConversation(id, data) {
    await fetch(U(`/conversations/${id}.json`), { method: 'PATCH', body: JSON.stringify(data) });
  },

  async joinConversation(convId, userId) {
    await fetch(U(`/conversations/${convId}/members/${userId}.json`), { method: 'PUT', body: JSON.stringify(true) });
  },

  // ===== MESSAGES =====
  async getMessages(convId) {
    const r = await fetch(U(`/conversations/${convId}/messages.json`));
    const d = await r.json();
    if (!d) return [];
    return Object.entries(d)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.time || 0) - (b.time || 0));
  },

  async sendMessage(msg) {
    const { convId, fromId, fromName, fromAvatar, text, media } = msg;
    const data = {
      fromId, fromName, fromAvatar: fromAvatar || '',
      text: text || '', media: media || '',
      time: Date.now(),
    };
    await fetch(U(`/conversations/${convId}/messages.json`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteMessage(convId, msgId) {
    await fetch(U(`/conversations/${convId}/messages/${msgId}.json`), { method: 'DELETE' });
  },

  async addReaction(convId, msgId, reaction) {
    await fetch(U(`/conversations/${convId}/messages/${msgId}/reaction.json`), { method: 'PUT', body: JSON.stringify(reaction) });
  },

  // ===== POLLING SUBSCRIBE =====
  subscribe(convId, callback) {
    let last = null;
    const poll = async () => {
      try {
        const msgs = await this.getMessages(convId);
        const key = JSON.stringify(msgs.map(m => m.id + (m.text || '') + (m.media || '') + (m.reaction || '')));
        if (key !== last) { last = key; callback(msgs); }
      } catch {}
    };
    poll();
    const int = setInterval(poll, 2000);
    return () => clearInterval(int);
  },

  // ===== LEGACY (migration) =====
  async migrateOldMessages() {
    try {
      const r = await fetch(U('/messages/main.json'));
      const d = await r.json();
      if (!d) return;
      const entries = Object.entries(d).map(([id, v]) => ({ id, ...v }));
      const convs = await this.getConversations();
      let mainConv = convs.find(c => c.name === 'Umumiy Chat' || c.id === 'main');
      if (!mainConv) {
        mainConv = await this.createConversation({
          type: 'group', name: 'Umumiy Chat', desc: 'Barcha xabarlar',
          ownerId: 'system', members: { system: true },
        });
      }
      for (const m of entries) {
        await fetch(U(`/conversations/${mainConv.id}/messages/${m.id}.json`), {
          method: 'PUT', body: JSON.stringify({
            fromId: m.fromId || 'anon', fromName: m.fromName || 'Anon',
            fromAvatar: m.fromAvatar || '', text: m.text || '',
            media: m.media || '', time: m.time || Date.now(),
            reaction: m.reaction || '',
          }),
        });
      }
    } catch {}
  },
};
