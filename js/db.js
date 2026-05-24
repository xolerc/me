const DB_URL = 'https://xoleric-9ad1b-default-rtdb.firebaseio.com';
const U = (path) => `${DB_URL}${path}`;

const DB = {
  // --- USERS ---
  async createUser(user) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const data = {
      id, username: user.username.trim(), bio: user.bio || '',
      avatar: user.avatar || '', created: Date.now(), online: true,
    };
    await fetch(U(`/users/${id}.json`), { method: 'PUT', body: JSON.stringify(data) });
    return data;
  },

  async getUser(id) {
    const r = await fetch(U(`/users/${id}.json`));
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

  // --- MESSAGES ---
  async getMessages(groupId = 'main') {
    const r = await fetch(U(`/messages/${groupId}.json`));
    const d = await r.json();
    if (!d) return [];
    return Object.entries(d)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.time || 0) - (b.time || 0));
  },

  async sendMessage(msg) {
    const { groupId = 'main', fromId, fromName, fromAvatar, text, media } = msg;
    const data = {
      fromId, fromName, fromAvatar: fromAvatar || '',
      text: text || '', media: media || '',
      time: Date.now(),
    };
    await fetch(U(`/messages/${groupId}.json`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteMessage(groupId, msgId) {
    await fetch(U(`/messages/${groupId}/${msgId}.json`), { method: 'DELETE' });
  },

  async addReaction(msgId, reaction) {
    await fetch(U(`/messages/main/${msgId}/reaction.json`), { method: 'PUT', body: JSON.stringify(reaction) });
  },

  // --- GROUPS ---
  async createGroup(group) {
    const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
    const data = {
      id, name: group.name.trim(), username: group.username?.trim() || '',
      avatar: group.avatar || '', desc: group.desc || '',
      ownerId: group.ownerId, created: Date.now(),
    };
    await fetch(U(`/groups/${id}.json`), { method: 'PUT', body: JSON.stringify(data) });
    return data;
  },

  async getGroups() {
    const r = await fetch(U('/groups.json'));
    const d = await r.json();
    if (!d) return [];
    return Object.values(d);
  },

  // --- STATS ---
  async getComments() {
    const msgs = await this.getMessages('main');
    return msgs.map(m => ({
      id: m.id, name: m.fromName, text: m.text,
      time: m.time, likes: 0, media: m.media || '', liked: false,
    }));
  },

  async addComment(c) {
    await this.sendMessage({
      groupId: 'main', fromId: c.fromId || 'anon',
      fromName: c.name, text: c.text, media: c.media || '',
    });
  },

  async incrementVisits() {
    if (sessionStorage.getItem('xv')) return;
    sessionStorage.setItem('xv', '1');
    await fetch(U('/stats/visits.json'))
      .then(r => r.json())
      .then(n => fetch(U('/stats/visits.json'), { method: 'PUT', body: JSON.stringify((n || 0) + 1) }))
      .catch(() => {});
  },

  async getStats() {
    try {
      const r = await fetch(U('/stats.json'));
      const d = await r.json();
      return { visits: d?.visits || 0, comments: d?.comments || 0 };
    } catch { return { visits: 0, comments: 0 }; }
  },

  subscribe(callback) {
    let last = null;
    const poll = async () => {
      try {
        const msgs = await this.getMessages('main');
        const key = JSON.stringify(msgs.map(m => m.id + (m.text || '') + (m.media || '') + (m.reaction || '')));
        if (key !== last) { last = key; callback(msgs); }
      } catch {}
    };
    poll();
    const int = setInterval(poll, 2000);
    return () => clearInterval(int);
  },
};
