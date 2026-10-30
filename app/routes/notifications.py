from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from app.services.notification_service import get_notifications, get_unread_count, mark_as_read, mark_all_as_read
from app.extensions import csrf

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/notifications')
@login_required
def view_notifications():
    return render_template('notifications.html')

@notifications_bp.route('/api/notifications', methods=['GET'])
@login_required
def api_notifications():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated = get_notifications(current_user.id, page=page, per_page=per_page)
    
    results = []
    for notif in paginated.items:
        results.append({
            'id': notif.id,
            'type': notif.type,
            'message': notif.message,
            'sender': notif.sender.to_dict(),
            'post_id': notif.post_id,
            'connection_id': notif.connection_id,
            'is_read': notif.is_read,
            'created_at': notif.created_at.isoformat() + ('Z' if not notif.created_at.isoformat().endswith('Z') else '')
        })
        
    return jsonify({
        'notifications': results,
        'has_next': paginated.has_next
    })

@notifications_bp.route('/notifications/<int:notif_id>/read', methods=['POST'])
@login_required
@csrf.exempt
def read_notification(notif_id):
    if mark_as_read(notif_id, current_user.id):
        return jsonify({'message': 'Marked as read'})
    return jsonify({'error': 'Not found or unauthorized'}), 404

@notifications_bp.route('/api/notifications/unread-count', methods=['GET'])
@login_required
def unread_count():
    count = get_unread_count(current_user.id)
    return jsonify({'count': count})

@notifications_bp.route('/api/notifications/mark-all-read', methods=['POST'])
@login_required
@csrf.exempt
def mark_all_read():
    mark_all_as_read(current_user.id)
    return jsonify({'message': 'All notifications marked as read'})
