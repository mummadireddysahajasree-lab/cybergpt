from flask import Blueprint, request, jsonify, session
import re
import math
from database import get_db

tools_bp = Blueprint('tools', __name__)

@tools_bp.route('/password-check', methods=['POST'])
def password_check():
    data = request.get_json() or {}
    password = data.get('password', '')

    if not password:
        return jsonify({
            'success': False,
            'error': 'Password cannot be empty.'
        }), 400

    score = 0
    suggestions = []
    
    # 1. Length Check
    length = len(password)
    if length < 8:
        suggestions.append("Increase password length to at least 8 characters (12+ is recommended).")
    elif length >= 16:
        score += 35
    elif length >= 12:
        score += 25
    else:
        score += 15

    # 2. Character Diversity Checks
    has_lower = bool(re.search(r'[a-z]', password))
    has_upper = bool(re.search(r'[A-Z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[^a-zA-Z\d]', password))

    if has_lower:
        score += 15
    else:
        suggestions.append("Add lowercase letters.")

    if has_upper:
        score += 15
    else:
        suggestions.append("Add uppercase letters.")

    if has_digit:
        score += 15
    else:
        suggestions.append("Add numeric digits.")

    if has_special:
        score += 20
    else:
        suggestions.append("Add special characters or symbols (e.g. @, #, $, etc.).")

    # 3. Pattern / Common Password Reductions
    # Repetitive character penalty
    if len(set(password)) < length / 2:
        score -= 20
        suggestions.append("Avoid repeating characters too frequently.")

    # Check for common passwords/substrings
    common_patterns = ['password', '123456', 'qwerty', 'admin', 'welcome', 'letmein', 'cyber']
    lowered_pw = password.lower()
    for pattern in common_patterns:
        if pattern in lowered_pw:
            score -= 25
            suggestions.append(f"Avoid including common terms like '{pattern}'.")
            break

    # Boundary scoring
    score = max(0, min(100, score))

    # Strength calculation
    if score < 40:
        strength = "Weak"
    elif score < 75:
        strength = "Moderate"
    else:
        strength = "Strong"

    # Add general tip if score is 100 and no suggestions
    if not suggestions:
        suggestions.append("Excellent password! Keep it safe and do not share it.")

    return jsonify({
        'success': True,
        'strength': strength,
        'score': score,
        'suggestions': suggestions
    })

@tools_bp.route('/progress/<int:user_id>', methods=['GET'])
def get_progress(user_id):
    # Ensure authorization (optional check: if session['user_id'] exists and matches, or allow access)
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute(
            'SELECT topic, quiz_score, attempts, last_attempt FROM progress WHERE user_id = ?',
            (user_id,)
        )
        rows = cursor.fetchall()
        
        topics_completed = []
        weak_areas = []
        total_score = 0
        chart_data = []

        for row in rows:
            topic = row['topic']
            score = row['quiz_score']
            attempts = row['attempts']
            
            # Form chart data
            chart_data.append({
                'topic': topic,
                'score': score,
                'attempts': attempts
            })
            
            # Aggregate totals
            total_score += score
            
            # Define completed as scoring 70%+
            if score >= 70:
                topics_completed.append(topic)
            else:
                weak_areas.append(topic)
                
        avg_score = round(total_score / len(rows), 1) if rows else 0

        return jsonify({
            'success': True,
            'data': {
                'topics_completed': topics_completed,
                'average_score': avg_score,
                'weak_areas': weak_areas,
                'chart_data': chart_data
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500

@tools_bp.route('/progress/update', methods=['POST'])
def update_progress():
    # Allow updating progress, mapping user sessions
    user_id = session.get('user_id')
    data = request.get_json() or {}
    
    # If not logged in, they can specify user_id in the body (for local testing/robustness)
    if not user_id:
        user_id = data.get('user_id')
        
    topic = data.get('topic')
    score = data.get('quiz_score')

    if not user_id:
        return jsonify({'success': False, 'error': 'User authentication required.'}), 401
    if not topic or score is None:
        return jsonify({'success': False, 'error': 'Topic and score are required.'}), 400

    try:
        score = int(score)
    except ValueError:
        return jsonify({'success': False, 'error': 'Score must be an integer.'}), 400

    db = get_db()
    cursor = db.cursor()
    try:
        # Check if progress already exists to compute attempts
        cursor.execute('SELECT attempts, quiz_score FROM progress WHERE user_id = ? AND topic = ?', (user_id, topic))
        existing = cursor.fetchone()
        
        if existing:
            new_attempts = existing['attempts'] + 1
            # Keep the highest score, or replace it with the latest
            new_score = max(existing['quiz_score'], score)
            cursor.execute(
                'UPDATE progress SET quiz_score = ?, attempts = ?, last_attempt = CURRENT_TIMESTAMP WHERE user_id = ? AND topic = ?',
                (new_score, new_attempts, user_id, topic)
            )
        else:
            cursor.execute(
                'INSERT INTO progress (user_id, topic, quiz_score, attempts) VALUES (?, ?, ?, 1)',
                (user_id, topic, score)
            )
        db.commit()
        return jsonify({'success': True, 'message': 'Progress updated successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500
