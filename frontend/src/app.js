import React, { useState, useEffect, useRef } from 'react';
import {
    register, login, fetchProjects, fetchTasks, createProject, createTask,
    updateTaskStatus, deleteTask, updateTask, fetchComments, createComment,
    fetchMembers, fetchMessages, sendMessage,
    fetchUsers, addMember, removeMember, changeMemberRole
} from './components/api';
import './app.css';

const STATUSES = [
    { key: 'todo', label: 'К выполнению', color: '#8b90a7' },
    { key: 'in_progress', label: 'В работе', color: '#5b6af0' },
    { key: 'review', label: 'На проверке', color: '#f59e0b' },
    { key: 'done', label: 'Готово', color: '#22c55e' },
];

function avatar(name) {
    return (name || '?')[0].toUpperCase();
}

function timeStr(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function AuthScreen({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (isLogin) {
            const data = await login({ username: e.target.username.value, password: e.target.password.value });
            console.log('data.token:', data.token);
            localStorage.setItem('token', data.token);
            console.log('after set:', localStorage.getItem('token'));
            if (data.token) {
                localStorage.setItem('user', JSON.stringify({ id: data.user_id, username: data.username }));
                onLogin({ id: data.user_id, username: data.username });
            } else {
                setError(data.message || 'Ошибка входа');
            }
        } else {
            const data = await register({ username: e.target.username.value, email: e.target.email.value, password: e.target.password.value });
            if (data.message === 'User created') {
                setIsLogin(true);
                setError('Регистрация успешна, войдите');
            } else {
                setError(data.message || 'Ошибка регистрации');
            }
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="auth-logo">
                    <h1>Project<span>Hub</span></h1>
                </div>
                <h2>{isLogin ? 'Вход в систему' : 'Регистрация'}</h2>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <input className="input" name="username" type="text" placeholder="Имя пользователя" required />
                    {!isLogin && <input className="input" name="email" type="email" placeholder="Email" required />}
                    <input className="input" name="password" type="password" placeholder="Пароль" required />
                    {error && <div className="error-message">{error}</div>}
                    <button className="btn btn-primary" type="submit">{isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
                </form>
                <div className="auth-switch">
                    {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                        {isLogin ? 'Регистрация' : 'Войти'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function OverviewTab({ tasks }) {
    const counts = STATUSES.reduce((acc, s) => {
        acc[s.key] = tasks.filter(t => t.status === s.key).length;
        return acc;
    }, {});
    return (
        <div>
            <div className="overview-grid">
                <div className="stat-card">
                    <div className="stat-value">{tasks.length}</div>
                    <div className="stat-label">Всего задач</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: '#5b6af0' }}>{counts.in_progress}</div>
                    <div className="stat-label">В работе</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: '#f59e0b' }}>{counts.review}</div>
                    <div className="stat-label">На проверке</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: '#22c55e' }}>{counts.done}</div>
                    <div className="stat-label">Готово</div>
                </div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>Последние задачи</h3>
                {tasks.slice(0, 5).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13 }}>{t.title}</span>
                        <span className={`priority-badge priority-${t.priority}`}>{t.priority}</span>
                    </div>
                ))}
                {tasks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Задач пока нет</p>}
            </div>
        </div>
    );
}

function KanbanTab({ tasks, onStatusChange, onDelete, projectId }) {
    const [selectedTask, setSelectedTask] = useState(null);
    const dragTaskRef = useRef(null);
    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState('medium');
    const [taskError, setTaskError] = useState('');
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [members, setMembers] = useState([]);

    async function handleAddTask(e) {
        e.preventDefault();
        setTaskError('');
        if (!newTitle.trim()) { setTaskError('Введите название задачи'); return; }
        await createTask({ title: newTitle, project_id: projectId, priority: newPriority, due_date: '' });
        setNewTitle('');
        onStatusChange();
    }

    async function selectTask(task) {
        setSelectedTask(task);
        const data = await fetchComments(task.id);
        setComments(Array.isArray(data) ? data : []);
    }

    useEffect(() => {
        if (projectId) fetchMembers(projectId).then(data => setMembers(Array.isArray(data) ? data : []));
    }, [projectId]);

    async function handleAddComment(e) {
        e.preventDefault();
        if (!commentText.trim()) return;
        await createComment(selectedTask.id, commentText);
        setCommentText('');
        const data = await fetchComments(selectedTask.id);
        setComments(Array.isArray(data) ? data : []);
    }

    return (
        <div>
            <form className="add-task-form" onSubmit={handleAddTask}>
                <input className="input" value={newTitle} onChange={e => { setNewTitle(e.target.value); setTaskError(''); }} placeholder="Название новой задачи" />
                <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="critical">Критичный</option>
                </select>
                <button className="btn btn-primary" type="submit">+ Добавить задачу</button>
                {taskError && <span className="error-message">{taskError}</span>}
            </form>

            <div className="kanban-board">
                {STATUSES.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.key);
                    return (
                        <div
                            className="kanban-col"
                            key={col.key}
                        >
                            <div className="kanban-col-header">
                                <div className="kanban-col-title">
                                    <div className="col-dot" style={{ background: col.color }} />
                                    {col.label}
                                </div>
                                <span className="col-count">{colTasks.length}</span>
                            </div>
                            <div
                                className="kanban-tasks"
                                onDragOver={e => e.preventDefault()}
                                onDrop={async e => {
                                    e.preventDefault();
                                    const dragged = dragTaskRef.current;
                                    if (!dragged) return;
                                    if (dragged.status === col.key) return;
                                    await updateTaskStatus(dragged.id, col.key);
                                    dragTaskRef.current = null;
                                    onStatusChange();
                                }}
                            >
                                {colTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`task-card ${selectedTask?.id === task.id ? 'selected' : ''}`}
                                        onClick={() => selectTask(task)}
                                        draggable={true}
                                        onDragStart={e => {
                                            dragTaskRef.current = task;
                                            try { e.dataTransfer.setData('text/plain', String(task.id)); } catch (err) { }
                                        }}
                                        onDragEnd={() => { dragTaskRef.current = null; }}
                                    >
                                        <div className="task-card-title">{task.title}</div>
                                        {task.description && <div className="task-card-desc">{task.description.length > 120 ? task.description.slice(0, 120) + '...' : task.description}</div>}
                                        <div className="task-card-meta">
                                            <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                                            {task.assigned_username && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.assigned_username}</span>}
                                            <button className="btn btn-small btn-danger" onClick={e => { e.stopPropagation(); onDelete(task.id); }}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTask && (
                <div className="task-detail-panel">
                    <h3>
                        <input className="input" value={selectedTask.title} onChange={e => setSelectedTask({ ...selectedTask, title: e.target.value })} />
                    </h3>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Описание</label>
                        <textarea className="input" rows={4} value={selectedTask.description || ''} onChange={e => setSelectedTask({ ...selectedTask, description: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Исполнитель</label>
                        <select className="input" value={selectedTask.assigned_to || ''} onChange={e => setSelectedTask({ ...selectedTask, assigned_to: e.target.value })}>
                            <option value="">— Не назначен —</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.username} {m.project_role ? `(${m.project_role})` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input className="input" type="date" value={selectedTask.due_date || ''} onChange={e => setSelectedTask({ ...selectedTask, due_date: e.target.value })} />
                        <select className="input" value={selectedTask.priority || 'medium'} onChange={e => setSelectedTask({ ...selectedTask, priority: e.target.value })}>
                            <option value="low">Низкий</option>
                            <option value="medium">Средний</option>
                            <option value="high">Высокий</option>
                            <option value="critical">Критичный</option>
                        </select>
                    </div>
                    <div className="status-buttons">
                        {STATUSES.map(s => (
                            <button
                                key={s.key}
                                className={`btn btn-small ${selectedTask.status === s.key ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={async () => {
                                    await updateTaskStatus(selectedTask.id, s.key);
                                    setSelectedTask({ ...selectedTask, status: s.key });
                                    onStatusChange();
                                }}
                            >{s.label}</button>
                        ))}
                        <button className="btn btn-small btn-danger" onClick={() => { onDelete(selectedTask.id); setSelectedTask(null); }}>Удалить</button>
                        <button className="btn btn-small btn-primary" onClick={async () => {
                            const payload = {
                                title: selectedTask.title,
                                description: selectedTask.description,
                                due_date: selectedTask.due_date,
                                priority: selectedTask.priority,
                            };
                            await updateTask(selectedTask.id, payload);
                            onStatusChange();
                        }}>Сохранить</button>
                    </div>
                    <div className="comments-section">
                        <h4>Комментарии ({comments.length})</h4>
                        {comments.map(c => (
                            <div className="comment-item" key={c.id}>
                                <div className="comment-author">
                                    {c.username}
                                    <span className="comment-time">{timeStr(c.created_at)}</span>
                                </div>
                                <div className="comment-text">{c.text}</div>
                            </div>
                        ))}
                        <form className="comment-form" onSubmit={handleAddComment}>
                            <input className="input" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Написать комментарий..." />
                            <button className="btn btn-primary" type="submit">Отправить</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function TeamTab({ projectId }) {
    const [members, setMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [inviteUserId, setInviteUserId] = useState('');
    const [inviteRole, setInviteRole] = useState('member');

    useEffect(() => {
        fetchMembers(projectId).then(data => setMembers(Array.isArray(data) ? data : []));
        fetchUsers().then(data => setAllUsers(Array.isArray(data) ? data : []));
    }, [projectId]);

    return (
        <div>
            <div className="page-header">
                <h2>Команда проекта</h2>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{members.length} участников</span>
            </div>
            <div className="invite-row" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select className="input" value={inviteUserId} onChange={e => setInviteUserId(e.target.value)}>
                    <option value="">Выбрать пользователя...</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
                </select>
                <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                    <option value="member">Участник</option>
                    <option value="owner">Владелец</option>
                    <option value="manager">Менеджер</option>
                </select>
                <button className="btn btn-primary" onClick={async () => {
                    if (!inviteUserId) return;
                    await addMember(projectId, inviteUserId, inviteRole);
                    setInviteUserId('');
                    fetchMembers(projectId).then(data => setMembers(Array.isArray(data) ? data : []));
                }}>Пригласить</button>
            </div>
            <div className="team-grid">
                {members.map(m => (
                    <div className="member-card" key={m.id}>
                        <div className="member-avatar">{avatar(m.username)}</div>
                        <div className="member-name">{m.username}</div>
                        <div className="member-role">{m.email}</div>
                        <div className="member-actions">
                            <select className="input" value={m.project_role || 'member'} onChange={async e => {
                                await changeMemberRole(projectId, m.id, e.target.value);
                                fetchMembers(projectId).then(data => setMembers(Array.isArray(data) ? data : []));
                            }}>
                                <option value="member">Участник</option>
                                <option value="owner">Владелец</option>
                                <option value="manager">Менеджер</option>
                            </select>
                            <button className="btn btn-small btn-danger" onClick={async () => {
                                await removeMember(projectId, m.id);
                                fetchMembers(projectId).then(data => setMembers(Array.isArray(data) ? data : []));
                            }}>Удалить</button>
                        </div>
                    </div>
                ))}
                {members.length === 0 && (
                    <div className="empty-state"><span className="empty-icon">👥</span><p>Участников нет</p></div>
                )}
            </div>
        </div>
    );
}

function ChatTab({ projectId, currentUser, onRead }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const bottomRef = useRef(null);
    const pollRef = useRef(null);
    const lastRef = useRef(null);

    async function load(since = null) {
        const data = await fetchMessages(projectId, since);
        if (Array.isArray(data) && data.length > 0) {
            setMessages(prev => since ? [...prev, ...data] : data);
            lastRef.current = data[data.length - 1].created_at;
        } else if (!since) {
            setMessages([]);
        }
    }

    useEffect(() => {
        load();
        onRead();
        pollRef.current = setInterval(() => load(lastRef.current), 3000);
        return () => clearInterval(pollRef.current);
    }, [projectId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function handleSend(e) {
        e.preventDefault();
        if (!text.trim()) return;
        await sendMessage(projectId, text);
        setText('');
        load();
    }

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map(m => {
                    const isOwn = m.user_id === currentUser.id;
                    return (
                        <div key={m.id} className={`chat-message ${isOwn ? 'own' : ''}`}>
                            <div className="chat-avatar">{avatar(m.username)}</div>
                            <div className="chat-bubble">
                                {!isOwn && <div className="chat-bubble-author">{m.username}</div>}
                                <div className="chat-bubble-text">{m.text}</div>
                                <div className="chat-bubble-time">{timeStr(m.created_at)}</div>
                            </div>
                        </div>
                    );
                })}
                {messages.length === 0 && (
                    <div className="empty-state"><span className="empty-icon">💬</span><p>Сообщений пока нет</p></div>
                )}
                <div ref={bottomRef} />
            </div>
            <form className="chat-input-row" onSubmit={handleSend}>
                <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Написать сообщение..." />
                <button className="btn btn-primary" type="submit">Отправить</button>
            </form>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [newProjectName, setNewProjectName] = useState('');
    const [projectError, setProjectError] = useState('');
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (token && user) loadProjects();
    }, [token]);

    async function loadProjects() {
        const data = await fetchProjects();
        if (data.message === 'Token is invalid or expired') { handleLogout(); return; }
        setProjects(Array.isArray(data) ? data : []);
    }

    async function loadTasks(projectId) {
        const data = await fetchTasks(projectId);
        setTasks(Array.isArray(data) ? data : []);
    }

    async function selectProject(p) {
        setSelectedProject(p);
        setActiveTab('overview');
        setUnread(0);
        await loadTasks(p.id);
    }

    async function handleCreateProject(e) {
        e.preventDefault();
        setProjectError('');
        if (!newProjectName.trim()) { setProjectError('Введите название'); return; }
        await createProject({ name: newProjectName, description: '' });
        setNewProjectName('');
        loadProjects();
    }

    async function handleStatusChange() {
        if (selectedProject) loadTasks(selectedProject.id);
    }

    async function handleDelete(taskId) {
        await deleteTask(taskId);
        if (selectedProject) loadTasks(selectedProject.id);
    }

    function handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }

    if (!token || !user) {
        return <AuthScreen onLogin={u => {
            setUser(u);
            setToken(localStorage.getItem('token'));
        }} />;
    }

    return (
        <div className="app-layout">
            <div className="sidebar">
                <div className="sidebar-logo">Project<span>Hub</span></div>
                <div className="sidebar-section">Проекты</div>
                <ul className="project-list">
                    {projects.map(p => (
                        <li
                            key={p.id}
                            className={`project-item ${selectedProject?.id === p.id ? 'active' : ''}`}
                            onClick={() => selectProject(p)}
                        >
                            <span>{p.name}</span>
                            <span className="project-badge">{p.status}</span>
                        </li>
                    ))}
                </ul>
                <div className="add-project-form">
                    <form onSubmit={handleCreateProject}>
                        <div className="form-row">
                            <input
                                className="input"
                                value={newProjectName}
                                onChange={e => { setNewProjectName(e.target.value); setProjectError(''); }}
                                placeholder="Новый проект..."
                            />
                            <button className="btn btn-primary" type="submit">+</button>
                        </div>
                        {projectError && <div className="error-message">{projectError}</div>}
                    </form>
                </div>
                <div className="sidebar-user">
                    <div className="user-avatar">{avatar(user.username)}</div>
                    <span className="user-name">{user.username}</span>
                    <button className="btn btn-ghost btn-small" onClick={handleLogout}>Выйти</button>
                </div>
            </div>

            <div className="main-area">
                {selectedProject ? (
                    <>
                        <div className="project-tabs">
                            {[
                                { key: 'overview', label: 'Обзор' },
                                { key: 'tasks', label: 'Задачи' },
                                { key: 'team', label: 'Команда' },
                                { key: 'chat', label: 'Чат', badge: unread },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        if (tab.key === 'chat') setUnread(0);
                                    }}
                                >
                                    {tab.label}
                                    {tab.badge > 0 && <span className="unread-badge">{tab.badge}</span>}
                                </button>
                            ))}
                        </div>
                        <div className="tab-content">
                            {activeTab === 'overview' && <OverviewTab tasks={tasks} />}
                            {activeTab === 'tasks' && (
                                <KanbanTab
                                    tasks={tasks}
                                    projectId={selectedProject.id}
                                    onStatusChange={handleStatusChange}
                                    onDelete={handleDelete}
                                />
                            )}
                            {activeTab === 'team' && <TeamTab projectId={selectedProject.id} />}
                            {activeTab === 'chat' && (
                                <ChatTab
                                    projectId={selectedProject.id}
                                    currentUser={user}
                                    onRead={() => setUnread(0)}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-state" style={{ height: '100%' }}>
                        <span className="empty-icon">📁</span>
                        <p>Выберите проект из списка слева</p>
                    </div>
                )}
            </div>
        </div>
    );
}
