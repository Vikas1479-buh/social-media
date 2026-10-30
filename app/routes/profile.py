from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from app.extensions import db, csrf, utc_now
from app.models.user import User
from app.models.post import Post
from app.models.connection import Connection
from app.services.image_service import save_image

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/profile/<username>')
@login_required
def view_profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    
    post_count = Post.query.filter_by(user_id=user.id).count()
    connection_count = len(Connection.get_connected_user_ids(user.id))
    
    conn_status = None
    conn_id = None
    if user.id != current_user.id:
        conn = Connection.get_connection(current_user.id, user.id)
        if conn:
            conn_id = conn.id
            if conn.status == 'accepted':
                conn_status = 'connected'
            elif conn.sender_id == current_user.id:
                conn_status = 'request_sent'
            else:
                conn_status = 'request_received'
                
    return render_template('profile.html', 
                          profile_user=user, 
                          post_count=post_count,
                          connection_count=connection_count,
                          connection_status=conn_status,
                          connection_id=conn_id)

@profile_bp.route('/profile/update', methods=['POST'])
@login_required
@csrf.exempt
def update_profile():
    bio = request.form.get('bio')
    if bio is not None:
        current_user.bio = bio[:500]
        
    if 'profile_image' in request.files:
        file = request.files['profile_image']
        if file.filename != '':
            try:
                image_url = save_image(file, 'profiles')
                current_user.profile_image = image_url
            except Exception as e:
                return jsonify({'error': str(e)}), 400
                
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully', 'user': current_user.to_dict()})

@profile_bp.route('/api/heartbeat', methods=['POST'])
@login_required
@csrf.exempt
def heartbeat():
    current_user.is_online = True
    current_user.last_seen = utc_now()
    db.session.commit()
    return jsonify({'status': 'ok'})

@profile_bp.route('/api/user/<int:user_id>/posts', methods=['GET'])
@login_required
def user_posts(user_id):
    User.query.get_or_404(user_id)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 9, type=int)
    
    pagination = Post.query.filter_by(user_id=user_id)\
        .order_by(Post.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
        
    posts = []
    for post in pagination.items:
        posts.append({
            'id': post.id,
            'image_url': post.image_url,
            'caption': post.caption,
            'like_count': post.like_count,
            'comment_count': post.comment_count,
            'created_at': post.created_at.isoformat() + ('Z' if not post.created_at.isoformat().endswith('Z') else '')
        })
        
    return jsonify({
        'posts': posts,
        'has_next': pagination.has_next
    })
