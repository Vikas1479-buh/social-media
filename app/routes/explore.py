from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from datetime import timedelta
from app.extensions import utc_now
from app.models.user import User
from app.models.connection import Connection

explore_bp = Blueprint('explore', __name__)

@explore_bp.route('/explore')
@login_required
def explore():
    return render_template('explore.html')

@explore_bp.route('/api/explore', methods=['GET'])
@login_required
def api_explore():
    # Get users who are online or active in the last 24h
    now = utc_now()
    recent_threshold = now - timedelta(hours=24)
    
    active_users = User.query.filter(
        User.id != current_user.id,
        ((User.is_online == True) | (User.last_seen >= recent_threshold))
    ).order_by(User.is_online.desc(), User.last_seen.desc().nullslast()).limit(50).all()
    
    # If no recent users, show all users
    if not active_users:
        active_users = User.query.filter(
            User.id != current_user.id
        ).order_by(User.created_at.desc()).limit(50).all()
    
    result = []
    for user in active_users:
        user_dict = user.to_dict()
        
        # Add connection status
        conn = Connection.get_connection(current_user.id, user.id)
        if not conn:
            status = 'none'
        elif conn.status == 'accepted':
            status = 'connected'
        elif conn.sender_id == current_user.id:
            status = 'request_sent'
        else:
            status = 'request_received'
            
        user_dict['connection_status'] = status
        user_dict['connection_id'] = conn.id if conn else None
        
        result.append(user_dict)
        
    return jsonify(result)
