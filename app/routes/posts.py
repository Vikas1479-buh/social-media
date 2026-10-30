from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.extensions import db, csrf
from app.models.post import Post
from app.models.like import Like
from app.models.comment import Comment, CommentLike
from app.models.share import Share
from app.services.image_service import save_image
from app.services.feed_service import get_personalized_feed
from app.services.notification_service import create_notification

def format_utc_iso(dt):
    if not dt:
        return None
    s = dt.isoformat()
    if not s.endswith('Z') and '+' not in s:
        s += 'Z'
    return s

posts_bp = Blueprint('posts', __name__)

@posts_bp.route('/posts/create', methods=['POST'])
@login_required
@csrf.exempt
def create_post():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
        
    file = request.files['image']
    caption = request.form.get('caption', '')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    try:
        image_url = save_image(file, 'posts')
        
        post = Post(
            user_id=current_user.id,
            image_url=image_url,
            caption=caption
        )
        
        db.session.add(post)
        db.session.commit()
        
        return jsonify({'message': 'Post created successfully', 'post_id': post.id, 'post': {'id': post.id, 'image_url': post.image_url}}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@posts_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@login_required
@csrf.exempt
def toggle_like(post_id):
    post = Post.query.get_or_404(post_id)
    
    like = Like.query.filter_by(user_id=current_user.id, post_id=post_id).first()
    
    if like:
        db.session.delete(like)
        liked = False
    else:
        new_like = Like(user_id=current_user.id, post_id=post_id)
        db.session.add(new_like)
        liked = True
        create_notification(post.user_id, current_user.id, 'like', post_id=post.id)
        
    db.session.commit()
    
    return jsonify({
        'liked': liked,
        'like_count': post.like_count
    })

@posts_bp.route('/posts/<int:post_id>/comment', methods=['POST'])
@login_required
@csrf.exempt
def add_comment(post_id):
    post = Post.query.get_or_404(post_id)
    data = request.get_json()
    
    content = data.get('content')
    if not content:
        return jsonify({'error': 'Content is required'}), 400
        
    comment = Comment(
        user_id=current_user.id,
        post_id=post_id,
        content=content
    )
    
    db.session.add(comment)
    db.session.commit()
    
    create_notification(post.user_id, current_user.id, 'comment', post_id=post.id)
    
    return jsonify({
        'message': 'Comment added',
        'comment': {
            'id': comment.id,
            'author': current_user.to_dict(),
            'content': comment.content,
            'created_at': format_utc_iso(comment.created_at),
            'like_count': 0,
            'is_liked': False,
            'can_delete': True
        },
        'comment_count': post.comment_count
    }), 201

@posts_bp.route('/posts/<int:post_id>/comments', methods=['GET'])
@login_required
def get_comments(post_id):
    post = Post.query.get_or_404(post_id)
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    pagination = Comment.query.filter_by(post_id=post_id)\
        .order_by(Comment.created_at.asc())\
        .paginate(page=page, per_page=per_page, error_out=False)
        
    comments = []
    for comment in pagination.items:
        comments.append({
            'id': comment.id,
            'author': comment.author.to_dict(),
            'content': comment.content,
            'created_at': format_utc_iso(comment.created_at),
            'like_count': comment.like_count,
            'is_liked': comment.is_liked_by(current_user.id),
            'can_delete': (comment.user_id == current_user.id or post.user_id == current_user.id)
        })
        
    return jsonify({
        'comments': comments,
        'has_next': pagination.has_next
    })

@posts_bp.route('/comments/<int:comment_id>/like', methods=['POST'])
@login_required
@csrf.exempt
def toggle_comment_like(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    existing = CommentLike.query.filter_by(comment_id=comment.id, user_id=current_user.id).first()
    if existing:
        db.session.delete(existing)
        liked = False
    else:
        like = CommentLike(comment_id=comment.id, user_id=current_user.id)
        db.session.add(like)
        liked = True
    db.session.commit()
    return jsonify({
        'liked': liked,
        'like_count': comment.like_count
    })

@posts_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@posts_bp.route('/comments/<int:comment_id>/delete', methods=['POST', 'DELETE'])
@login_required
@csrf.exempt
def delete_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    post = Post.query.get(comment.post_id)
    if comment.user_id != current_user.id and (not post or post.user_id != current_user.id):
        return jsonify({'error': 'Unauthorized to delete this comment'}), 403
        
    CommentLike.query.filter_by(comment_id=comment.id).delete()
    db.session.delete(comment)
    db.session.commit()
    
    remaining_count = post.comment_count if post else 0
    return jsonify({
        'message': 'Comment deleted',
        'comment_count': remaining_count
    })

@posts_bp.route('/posts/<int:post_id>/share', methods=['POST'])
@login_required
@csrf.exempt
def share_post(post_id):
    post = Post.query.get_or_404(post_id)
    
    share = Share(user_id=current_user.id, post_id=post_id)
    db.session.add(share)
    db.session.commit()
    
    create_notification(post.user_id, current_user.id, 'share', post_id=post.id)
    
    return jsonify({
        'success': True,
        'message': 'Post shared',
        'share_count': post.share_count
    })

@posts_bp.route('/posts/<int:post_id>', methods=['GET'])
@login_required
def get_post(post_id):
    post = Post.query.get_or_404(post_id)
    is_liked = Like.query.filter_by(user_id=current_user.id, post_id=post.id).first() is not None
    return jsonify({
        'id': post.id,
        'image_url': post.image_url,
        'caption': post.caption,
        'created_at': format_utc_iso(post.created_at),
        'author': post.author.to_dict(),
        'like_count': post.like_count,
        'comment_count': post.comment_count,
        'share_count': post.share_count,
        'is_liked': is_liked
    })

@posts_bp.route('/posts/<int:post_id>', methods=['DELETE'])
@posts_bp.route('/posts/<int:post_id>/delete', methods=['POST', 'DELETE'])
@login_required
@csrf.exempt
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized to delete this post'}), 403
        
    from app.models.notification import Notification
    Notification.query.filter_by(post_id=post.id).delete()
    
    db.session.delete(post)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Post deleted successfully'})

@posts_bp.route('/feed', methods=['GET'])
@login_required
def get_feed():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    feed_posts = get_personalized_feed(current_user.id, page=page, per_page=per_page)
    return jsonify(feed_posts)

