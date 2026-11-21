from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from database import get_db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    hashed_pw = generate_password_hash(password)
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            (email, hashed_pw)
        )
        db.commit()
        
        # Get the registered user
        user_id = cursor.lastrowid
        return jsonify({
            'success': True,
            'message': 'Registration successful. Please log in.',
            'user': {'id': user_id, 'email': email}
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'An account with that email already exists.'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute('SELECT id, email, password_hash FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['email'] = user['email']
            return jsonify({
                'success': True,
                'message': 'Login successful.',
                'user': {'id': user['id'], 'email': user['email']}
            })
        else:
            return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST', 'GET'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

@auth_bp.route('/session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'user': {'id': session['user_id'], 'email': session['email']}
        })
    return jsonify({'authenticated': False})
