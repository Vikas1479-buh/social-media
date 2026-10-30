from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from app.extensions import db, csrf
from app.models.user import User
from app.models.connection import Connection
from app.services.notification_service import create_notification

connections_bp = Blueprint('connections', __name__)

@connections_bp.route('/connect/<int:user_id>', methods=['POST'])
@login_required
@csrf.exempt
def send_request(user_id):
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot connect with yourself'}), 400
        
    target_user = User.query.get_or_404(user_id)
    
    existing = Connection.get_connection(current_user.id, user_id)
    if existing:
        return jsonify({'error': 'Connection or request already exists'}), 400
        
    conn = Connection(
        sender_id=current_user.id,
        receiver_id=user_id,
        status='pending'
    )
    
    db.session.add(conn)
    db.session.commit()
    
    create_notification(user_id, current_user.id, 'connection_request', connection_id=conn.id)
    
    return jsonify({'message': 'Connection request sent', 'connection_id': conn.id, 'status': 'pending'})

@connections_bp.route('/disconnect/<int:user_id>', methods=['POST'])
@login_required
@csrf.exempt
def disconnect(user_id):
    conn = Connection.get_connection(current_user.id, user_id)
    if not conn or conn.status != 'accepted':
        return jsonify({'error': 'Not connected'}), 400
        
    db.session.delete(conn)
    db.session.commit()
    
    return jsonify({'message': 'Disconnected successfully', 'status': 'disconnected'})

@connections_bp.route('/connection/accept/<int:conn_id>', methods=['POST'])
@login_required
@csrf.exempt
def accept_request(conn_id):
    conn = Connection.query.get_or_404(conn_id)
    
    if conn.receiver_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    if conn.status != 'pending':
        return jsonify({'error': 'Request not pending'}), 400
        
    conn.status = 'accepted'
    db.session.commit()
    
    create_notification(conn.sender_id, current_user.id, 'connection_accepted', connection_id=conn.id)
    
    return jsonify({'message': 'Connection accepted', 'status': 'accepted'})

@connections_bp.route('/connection/reject/<int:conn_id>', methods=['POST'])
@login_required
@csrf.exempt
def reject_request(conn_id):
    conn = Connection.query.get_or_404(conn_id)
    
    if conn.receiver_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    if conn.status != 'pending':
        return jsonify({'error': 'Request not pending'}), 400
        
    conn.status = 'rejected'
    db.session.commit()
    
    return jsonify({'message': 'Connection rejected', 'status': 'rejected'})
