const BASE = process.env.REACT_APP_API_URL || 'https://ckan52.online/api';

function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(BASE + url, { headers: getHeaders(), ...options });
        const text = await res.text();
        try {
            const data = text ? JSON.parse(text) : {};
            if (!res.ok) return { message: data.message || `HTTP ${res.status}` };
            return data;
        } catch (err) {
            if (!res.ok) return { message: `HTTP ${res.status}` };
            return {};
        }
    } catch (err) {
        return { message: 'Network error: Failed to fetch' };
    }
}

export const register = (data) =>
    apiFetch('/register', { method: 'POST', body: JSON.stringify(data) });

export const login = (data) =>
    apiFetch('/login', { method: 'POST', body: JSON.stringify(data) });

export const fetchProjects = () => apiFetch('/projects');

export const createProject = (data) =>
    apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) });

export const fetchTasks = (projectId) =>
    apiFetch(`/projects/${projectId}/tasks`);

export const createTask = (data) =>
    apiFetch('/tasks', { method: 'POST', body: JSON.stringify(data) });

export const updateTaskStatus = (taskId, status) =>
    apiFetch(`/tasks/${taskId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

export const deleteTask = (taskId) =>
    apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });

export const updateTask = (taskId, data) =>
    apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) });

export const fetchComments = (taskId) =>
    apiFetch(`/tasks/${taskId}/comments`);

export const createComment = (taskId, text) =>
    apiFetch(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });

export const fetchMembers = (projectId) =>
    apiFetch(`/projects/${projectId}/members`);

export const fetchUsers = () => apiFetch('/users');

export const addMember = (projectId, userId, role = 'member') =>
    apiFetch(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId, role }) });

export const removeMember = (projectId, userId) =>
    apiFetch(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });

export const changeMemberRole = (projectId, userId, role) =>
    apiFetch(`/projects/${projectId}/members/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });

export const fetchMessages = (projectId, since = null) =>
    apiFetch(`/projects/${projectId}/messages${since ? `?since=${since}` : ''}`);

export const sendMessage = (projectId, text) =>
    apiFetch(`/projects/${projectId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });