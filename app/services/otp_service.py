import random
import string
from datetime import timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app, render_template_string
from flask_mail import Message
from app.extensions import db, mail, utc_now
from app.models.otp import OTP

def generate_otp(email, force=False):
    if not force:
        can_send, _ = can_resend(email)
        if not can_send:
            return False, None

    # Generate 6-digit OTP
    otp_code = ''.join(random.choices(string.digits, k=6))
    
    # Store in DB
    expires_in_minutes = current_app.config.get('OTP_EXPIRY_MINUTES', 5)
    expires_at = utc_now() + timedelta(minutes=expires_in_minutes)
    
    otp_record = OTP(
        email=email,
        otp_hash=generate_password_hash(otp_code),
        expires_at=expires_at
    )
    db.session.add(otp_record)
    db.session.commit()

    # Send email
    _send_otp_email(email, otp_code)
    return True, otp_code

def verify_otp(email, otp_code):
    otp_record = OTP.query.filter_by(email=email, is_used=False).order_by(OTP.created_at.desc()).first()
    
    if not otp_record:
        return False, "No active OTP found"
        
    if otp_record.expires_at < utc_now():
        return False, "OTP has expired"
        
    max_attempts = current_app.config.get('OTP_MAX_ATTEMPTS', 5)
    if otp_record.attempts >= max_attempts:
        return False, "Maximum attempts exceeded"

    otp_record.attempts += 1
    db.session.commit()

    if not check_password_hash(otp_record.otp_hash, otp_code):
        return False, "Invalid OTP"

    otp_record.is_used = True
    db.session.commit()
    return True, "OTP verified successfully"

def can_resend(email):
    latest_otp = OTP.query.filter_by(email=email).order_by(OTP.created_at.desc()).first()
    if not latest_otp:
        return True, 0
        
    cooldown = current_app.config.get('OTP_RESEND_COOLDOWN_SECONDS', 60)
    created = latest_otp.created_at
    if created.tzinfo is not None:
        created = created.replace(tzinfo=None)
    time_since_last = (utc_now() - created).total_seconds()
    
    if time_since_last < cooldown:
        remaining = int(cooldown - time_since_last)
        return False, max(1, remaining)
    return True, 0

def _send_otp_email(email, otp):
    print(f"\n[SHOWCASE OTP] Verification code for {email}: {otp}\n", flush=True)
    sender = current_app.config.get('MAIL_DEFAULT_SENDER') or current_app.config.get('MAIL_USERNAME')
    if not sender or not current_app.config.get('MAIL_PASSWORD'):
        current_app.logger.info("Mail credentials not fully configured; printed OTP to server log.")
        return

    try:
        msg = Message(
            "Your Showcase Verification Code",
            sender=sender,
            recipients=[email]
        )
        msg.html = f"""
        <h2>Welcome to Showcase!</h2>
        <p>Your verification code is: <strong>{otp}</strong></p>
        <p>This code will expire in {current_app.config.get('OTP_EXPIRY_MINUTES', 5)} minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        """
        mail.send(msg)
    except Exception as e:
        current_app.logger.warning(f"Could not send email via SMTP ({e}). OTP logged above for development.")
