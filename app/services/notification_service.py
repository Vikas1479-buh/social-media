from datetime import datetime, timezone, timedelta
from app.extensions import db, utc_now
from app.models.notification import Notification

def create_notification(recipient_id, sender_id, notif_type, post_id=None, connection_id=None):
    if recipient_id == sender_id:
        return None # Prevent self-notifications
        
    # Prevent duplicate rapid notifications
    recent = Notification.query.filter_by(
        recipient_id=recipient_id,
        sender_id=sender_id,
        type=notif_type,
        post_id=post_id,
        connection_id=connection_id
    ).order_by(Notification.created_at.desc()).first()
    
    if recent:
        now = utc_now()
        created = recent.created_at
        if created.tzinfo is not None:
            created = created.replace(tzinfo=None)
        if (now - created).total_seconds() < 60:
            return None # Skip if same notification sent within 60s
            
    # Generate message based on type
    message = ""
    if notif_type == 'like':
        message = "liked your post"
    elif notif_type == 'comment':
        message = "commented on your post"
    elif notif_type == 'share':
        message = "shared your post"
    elif notif_type == 'connection_request':
        message = "sent you a connection request"
    elif notif_type == 'connection_accepted':
        message = "accepted your connection request"
        
    notif = Notification(
        recipient_id=recipient_id,
        sender_id=sender_id,
        type=notif_type,
        post_id=post_id,
        connection_id=connection_id,
        message=message
    )
    
    db.session.add(notif)
    db.session.commit()
    return notif

def get_notifications(user_id, page=1, per_page=20):
    paginated = Notification.query.filter_by(recipient_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
        
    return paginated

def get_unread_count(user_id):
    return Notification.query.filter_by(recipient_id=user_id, is_read=False).count()

def mark_as_read(notification_id, user_id):
    notif = Notification.query.filter_by(id=notification_id, recipient_id=user_id).first()
    if notif and not notif.is_read:
        notif.is_read = True
        db.session.commit()
        return True
    return False

def mark_all_as_read(user_id):
    Notification.query.filter_by(recipient_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
