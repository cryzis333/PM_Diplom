from functools import wraps
from flask import request, jsonify, g
from auth import verify_token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        user_id = verify_token(token)
        
        if not user_id:
            return jsonify({'message': 'Token is invalid or expired'}), 401
        g.current_user = user_id   

        return f(*args, **kwargs)

    return decorated
