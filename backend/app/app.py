from flask import Flask, jsonify, request, g
from flask_cors import CORS
from database import init_database
from models import (
    get_all_projects, get_tasks_by_project, create_project, create_task,
    update_task_status, delete_task, create_user, get_all_users,
    update_task,
    get_project_members, create_comment, get_comments_by_task,
    create_message, get_messages_by_project
)
from models import add_project_member, remove_project_member, change_project_member_role
from auth import hash_password, verify_password, generate_token, get_user_by_username
from decorators import token_required

app = Flask(__name__)
CORS(app)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if get_user_by_username(data['username']):
        return jsonify({'message': 'Username already exists'}), 409
    user_id = create_user(
        data['username'], data['email'],
        hash_password(data['password']),
        data.get('role', 'developer')
    )
    return jsonify({'message': 'User created', 'user_id': user_id}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = get_user_by_username(data['username'])
    if not user or not verify_password(data['password'], user['password_hash']):
        return jsonify({'message': 'Invalid credentials'}), 401
    token = generate_token(user['id'])
    return jsonify({'token': token, 'user_id': user['id'], 'username': user['username']})

@app.route('/api/projects', methods=['GET'])
@token_required
def projects_list():
    return jsonify(get_all_projects())

@app.route('/api/projects', methods=['POST'])
@token_required
def project_create():
    data = request.get_json()
    project_id = create_project(data['name'], data.get('description', ''), g.current_user)
    return jsonify({"id": project_id, "message": "Project created"}), 201

@app.route('/api/projects/<int:project_id>/tasks', methods=['GET'])
@token_required
def tasks_list(project_id):
    return jsonify(get_tasks_by_project(project_id))

@app.route('/api/tasks', methods=['POST'])
@token_required
def task_create():
    data = request.get_json()
    task_id = create_task(
        data['title'], data.get('description', ''),
        data['project_id'], g.current_user,
        data.get('due_date', ''), data.get('priority', 'medium')
    )
    return jsonify({"id": task_id, "message": "Task created"}), 201

@app.route('/api/tasks/<int:task_id>/status', methods=['PUT'])
@token_required
def task_update_status(task_id):
    data = request.get_json()
    update_task_status(task_id, data['status'])
    return jsonify({"message": "Status updated"})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def task_delete(task_id):
    delete_task(task_id)
    return jsonify({"message": "Task deleted"})


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@token_required
def task_update(task_id):
    data = request.get_json()
    update_task(task_id,
                title=data.get('title'),
                description=data.get('description'),
                assigned_to=data.get('assigned_to'),
                due_date=data.get('due_date'),
                priority=data.get('priority'),
                status=data.get('status'))
    return jsonify({"message": "Task updated"})

@app.route('/api/tasks/<int:task_id>/comments', methods=['GET'])
@token_required
def comments_list(task_id):
    return jsonify(get_comments_by_task(task_id))

@app.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
@token_required
def comment_create(task_id):
    data = request.get_json()
    comment_id = create_comment(task_id, g.current_user, data['text'])
    return jsonify({"id": comment_id, "message": "Comment created"}), 201

@app.route('/api/projects/<int:project_id>/members', methods=['GET'])
@token_required
def members_list(project_id):
    return jsonify(get_project_members(project_id))


@app.route('/api/projects/<int:project_id>/members', methods=['POST'])
@token_required
def add_member(project_id):
    data = request.get_json()
    user_id = data.get('user_id')
    role = data.get('role', 'member')
    add_project_member(project_id, user_id, role)
    # create a chat message to notify project members about the addition
    try:
        create_message(project_id, g.current_user, f"Пользователь с id={user_id} добавлен в проект в роли {role}.")
    except Exception:
        pass
    return jsonify({"message": "Member added"}), 201


@app.route('/api/projects/<int:project_id>/members/<int:user_id>', methods=['DELETE'])
@token_required
def remove_member(project_id, user_id):
    remove_project_member(project_id, user_id)
    return jsonify({"message": "Member removed"})


@app.route('/api/projects/<int:project_id>/members/<int:user_id>/role', methods=['PUT'])
@token_required
def change_member_role(project_id, user_id):
    data = request.get_json()
    role = data.get('role')
    change_project_member_role(project_id, user_id, role)
    return jsonify({"message": "Role updated"})

@app.route('/api/users', methods=['GET'])
@token_required
def users_list():
    return jsonify(get_all_users())

@app.route('/api/projects/<int:project_id>/messages', methods=['GET'])
@token_required
def messages_list(project_id):
    since = request.args.get('since')
    return jsonify(get_messages_by_project(project_id, since))

@app.route('/api/projects/<int:project_id>/messages', methods=['POST'])
@token_required
def message_create(project_id):
    data = request.get_json()
    msg_id = create_message(project_id, g.current_user, data['text'])
    return jsonify({"id": msg_id, "message": "Message sent"}), 201

if __name__ == '__main__':
    init_database()
    app.run(debug=True, host='0.0.0.0', port=5000)
