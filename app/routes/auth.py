from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session
from flask_login import login_user, logout_user, current_user, login_required
from app.models.user import User
from app.extensions import db, csrf
from app.services.otp_service import generate_otp, verify_otp, can_resend
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/')
def landing():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    return render_template('landing.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
        
    if request.method == 'POST':
        data = request.get_json() if request.is_json else None
        
        if data:
            login_id = data.get('login_id', '').strip()
            password = data.get('password', '')
        else:
            login_id = request.form.get('login_id', '').strip()
            password = request.form.get('password', '')
        
        if not login_id or not password:
            if request.is_json:
                return jsonify({'error': 'Please enter your email/username and password.'}), 400
            return render_template('login.html', error='Please enter your email/username and password.')
        
        user = User.query.filter(
            (User.email == login_id) | (User.username == login_id)
        ).first()
        
        if not user:
            msg = 'Account not found. Please register first.'
            if request.is_json:
                return jsonify({'error': msg}), 404
            return render_template('login.html', error=msg)
        
        if not user.check_password(password):
            msg = 'Incorrect email/username or password.'
            if request.is_json:
                return jsonify({'error': msg}), 401
            return render_template('login.html', error=msg)
        
        login_user(user, remember=True)
        if request.is_json:
            return jsonify({'success': True, 'message': 'Login successful', 'redirect': url_for('main.home')})
        return redirect(url_for('main.home'))
        
    return render_template('login.html')

@auth_bp.route('/register', methods=['GET'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    return render_template('register.html')

@auth_bp.route('/send-otp', methods=['POST'])
@csrf.exempt
def send_otp():
    data = request.get_json()
    email = data.get('email', '').strip().lower() if data else ''
    
    if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'error': 'Invalid email address.'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered. Please login instead.'}), 400
        
    from flask import current_app
    has_smtp = bool(current_app.config.get('MAIL_USERNAME') and current_app.config.get('MAIL_PASSWORD'))
    can_send, remaining = can_resend(email)
    
    # In demo/dev mode without SMTP, allow immediate resend
    force_send = not has_smtp
    if not can_send and not force_send:
        return jsonify({'error': f'Please wait {remaining} seconds before requesting another OTP.', 'remaining': remaining}), 429
        
    success, otp_code = generate_otp(email, force=force_send)
    if success:
        resp = {'message': 'OTP sent successfully! Check your email.'}
        if not has_smtp:
            resp['dev_otp'] = otp_code
            resp['message'] = f'Dev Mode: Your verification code is {otp_code}'
        return jsonify(resp)
    return jsonify({'error': 'Please wait before requesting another OTP.'}), 429

@auth_bp.route('/verify-otp', methods=['POST'])
@csrf.exempt
def verify_otp_route():
    data = request.get_json()
    email = data.get('email', '').strip().lower() if data else ''
    otp_code = data.get('otp_code', '').strip() if data else ''
    
    if not email or not otp_code:
        return jsonify({'error': 'Missing email or OTP.'}), 400
        
    success, msg = verify_otp(email, otp_code)
    if success:
        session['verified_email'] = email
        return jsonify({'message': msg})
    return jsonify({'error': msg}), 400

@auth_bp.route('/create-account', methods=['POST'])
@csrf.exempt
def create_account():
    data = request.get_json()
    username = data.get('username', '').strip() if data else ''
    password = data.get('password', '') if data else ''
    confirm_password = data.get('confirm_password', '') if data else ''
    email = session.get('verified_email')
    
    if not email:
        return jsonify({'error': 'Email not verified. Please start over.'}), 401
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400
    
    # Validate username
    if len(username) < 3 or len(username) > 30:
        return jsonify({'error': 'Username must be 3-30 characters.'}), 400
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return jsonify({'error': 'Username can only contain letters, numbers, and underscores.'}), 400
    
    # Validate password
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400
    
    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match.'}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken. Please choose another.'}), 400
    
    # Double-check email not taken (race condition guard)
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 400
        
    user = User(username=username, email=email, email_verified=True)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    session.pop('verified_email', None)
    login_user(user, remember=True)
    
    return jsonify({'message': 'Account created successfully!', 'redirect': url_for('main.home')})

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.landing'))

@auth_bp.route('/check-username', methods=['POST'])
@csrf.exempt
def check_username():
    data = request.get_json()
    username = data.get('username', '').strip() if data else ''
    
    if not username or len(username) < 3:
        return jsonify({'available': False, 'message': 'Username must be at least 3 characters.'}), 400
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return jsonify({'available': False, 'message': 'Only letters, numbers, and underscores allowed.'}), 400
        
    user = User.query.filter_by(username=username).first()
    return jsonify({'available': user is None})
