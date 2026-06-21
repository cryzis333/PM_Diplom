import sqlite3
from database import get_db_connection
from datetime import datetime

def create_user(username, email, password_hash, role="developer"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
        (username, email, password_hash, role)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id

def get_user_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def create_project(name, description, created_by):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)",
        (name, description, created_by)
    )
    conn.commit()
    project_id = cursor.lastrowid
    conn.close()
    return project_id

def get_all_projects():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def create_task(title, description, project_id, assigned_to, due_date, priority="medium"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO tasks (title, description, project_id, assigned_to, due_date, priority) VALUES (?, ?, ?, ?, ?, ?)",
        (title, description, project_id, assigned_to, due_date, priority)
    )
    conn.commit()
    task_id = cursor.lastrowid
    conn.close()
    return task_id

def get_tasks_by_project(project_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.*, u.username as assigned_username
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.project_id = ?
        ORDER BY t.created_at DESC
    """, (project_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_task(task_id, **fields):
    allowed = ['title', 'description', 'assigned_to', 'due_date', 'priority', 'status']
    updates = []
    params = []
    for k in allowed:
        if k in fields and fields[k] is not None:
            updates.append(f"{k} = ?")
            params.append(fields[k])
    if not updates:
        return False
    # add updated_at timestamp
    updates.append("updated_at = CURRENT_TIMESTAMP")
    sql = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
    params.append(task_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    conn.commit()
    conn.close()
    return True

def update_task_status(task_id, new_status):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_status, task_id))
    conn.commit()
    conn.close()
    return True

def delete_task(task_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return True

def get_project_members(project_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.username, u.email, u.role as global_role, pm.role as project_role
        FROM users u
        JOIN project_members pm ON u.id = pm.user_id
        WHERE pm.project_id = ?
    """, (project_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_project_member(project_id, user_id, role='member'):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
        (project_id, user_id, role)
    )
    conn.commit()
    conn.close()
    return True

def remove_project_member(project_id, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", (project_id, user_id))
    conn.commit()
    conn.close()
    return True

def change_project_member_role(project_id, user_id, role):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?", (role, project_id, user_id))
    conn.commit()
    conn.close()
    return True

def create_comment(task_id, user_id, text):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO comments (task_id, user_id, text) VALUES (?, ?, ?)",
        (task_id, user_id, text)
    )
    conn.commit()
    comment_id = cursor.lastrowid
    conn.close()
    return comment_id

def get_comments_by_task(task_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, u.username 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at DESC
    """, (task_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def create_message(project_id, user_id, text):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (project_id, user_id, text) VALUES (?, ?, ?)",
        (project_id, user_id, text)
    )
    conn.commit()
    msg_id = cursor.lastrowid
    conn.close()
    return msg_id

def get_messages_by_project(project_id, since=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if since:
        cursor.execute("""
            SELECT m.*, u.username 
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.project_id = ? AND m.created_at > ?
            ORDER BY m.created_at ASC
        """, (project_id, since))
    else:
        cursor.execute("""
            SELECT m.*, u.username 
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.project_id = ?
            ORDER BY m.created_at ASC
        """, (project_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]