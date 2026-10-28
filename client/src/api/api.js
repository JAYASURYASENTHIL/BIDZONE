/**
 * Central API client for BIDZONE
 * Relative URLs (/api) are proxied to localhost:5000 in Vite dev
 * credentials: 'include' sends session cookies automatically
 */

const BASE = '/api';

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || 'An error occurred with your request.');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  signup: (name, email, password) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me', { method: 'GET' }),
};

export const auctionApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return request(`/auctions?${query.toString()}`);
  },
  getById: (id) => request(`/auctions/${id}`),
  create: (formData) =>
    request('/auctions', {
      method: 'POST',
      body: formData,
    }),
  update: (id, data) =>
    request(`/auctions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  cancel: (id) =>
    request(`/auctions/${id}`, {
      method: 'DELETE',
    }),
  placeBid: (id, amount) =>
    request(`/auctions/${id}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  closeEarly: (id, data) =>
    request(`/auctions/${id}/close-early`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  decide: (id, decision) =>
    request(`/auctions/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),
  handover: (id) =>
    request(`/auctions/${id}/handover`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  sharePhone: (id, phone) =>
    request(`/auctions/${id}/contact-phone`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
};

export const dashboardApi = {
  getBuyer: () => request('/dashboard/buyer'),
  getSeller: () => request('/dashboard/seller'),
};

export const notificationApi = {
  getAll: () => request('/notifications'),
  markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
};
