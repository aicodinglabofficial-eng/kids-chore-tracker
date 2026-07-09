const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getKids: () => request("/kids"),
  addKid: (data) => request("/kids", { method: "POST", body: JSON.stringify(data) }),
  deleteKid: (id) => request(`/kids/${id}`, { method: "DELETE" }),

  getChores: (kidId, date) => request(`/kids/${kidId}/chores?date=${date}`),
  addChore: (kidId, data) => request(`/kids/${kidId}/chores`, { method: "POST", body: JSON.stringify(data) }),
  updateChore: (id, data) => request(`/chores/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteChore: (id) => request(`/chores/${id}`, { method: "DELETE" }),
  toggleChore: (id, date) => request(`/chores/${id}/toggle`, { method: "POST", body: JSON.stringify({ date }) }),
  copyChores: (targetKidId, sourceKidId) =>
    request(`/kids/${targetKidId}/chores/copy`, {
      method: "POST",
      body: JSON.stringify({ sourceKidId }),
    }),
  reorderChores: (kidId, ids) =>
    request(`/kids/${kidId}/chores/reorder`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),

  getHistory: (kidId, date) => request(`/kids/${kidId}/history?date=${date}`),

  getRewards: (kidId) => request(`/kids/${kidId}/rewards`),
  addReward: (kidId, data) => request(`/kids/${kidId}/rewards`, { method: "POST", body: JSON.stringify(data) }),
  deleteReward: (id) => request(`/rewards/${id}`, { method: "DELETE" }),
  redeemReward: (id) => request(`/rewards/${id}/redeem`, { method: "POST" }),

  getRedemptions: (kidId) => request(`/kids/${kidId}/redemptions`),
  undoRedemption: (id) => request(`/redemptions/${id}`, { method: "DELETE" }),
};

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
