/* ------------------------------------------------------ WhatsApp CRM (own account) */

export function createWaApi(client) {
  return {
    getWaStatus: async () => (await client.get('/wa/status')).data,
    connectWa: async () => (await client.post('/wa/connect')).data,
    disconnectWa: async (wipe = false) => (await client.post('/wa/disconnect', { wipe })).data,
    syncWaChats: async () => (await client.post('/wa/sync')).data,
    getWaLeads: async (params = {}) => (await client.get('/wa/leads', { params })).data?.leads || [],
    getWaConversations: async (params = {}) => (await client.get('/wa/conversations', { params })).data?.conversations || [],
    createWaConversation: async (body) => (await client.post('/wa/conversations', body)).data?.conversation,
    getWaConversation: async (id) => (await client.get(`/wa/conversations/${encodeURIComponent(id)}`)).data,
    updateWaConversation: async (id, patch) => (await client.patch(`/wa/conversations/${encodeURIComponent(id)}`, patch)).data?.conversation,
    sendWaMessage: async (body) => (await client.post('/wa/messages', body)).data,
    sendWaBulk: async (body) => (await client.post('/wa/bulk', body, { timeout: 120000 })).data,
    getWaProducts: async () => (await client.get('/wa/products')).data?.products || [],
    saveWaProduct: async (body) => (await client.post('/wa/products', body)).data?.product,
    deleteWaProduct: async (id) => (await client.delete(`/wa/products/${encodeURIComponent(id)}`)).data,
    getWaSnippets: async () => (await client.get('/wa/snippets')).data?.snippets || [],
    saveWaSnippet: async (body) => (await client.post('/wa/snippets', body)).data?.snippet,
    deleteWaSnippet: async (id) => (await client.delete(`/wa/snippets/${encodeURIComponent(id)}`)).data,
    getWaAutomations: async () => (await client.get('/wa/automations')).data?.automations || [],
    saveWaAutomation: async (body) => (await client.post('/wa/automations', body)).data?.automation,
    getWaAnalytics: async () => (await client.get('/wa/analytics')).data?.analytics || {},
    updateWaSettings: async (patch) => (await client.patch('/wa/settings', patch)).data?.session
  };
}
