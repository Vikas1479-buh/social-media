from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import timedelta
from app.extensions import db, csrf, utc_now
from app.models.story import Story, StoryView
from app.models.connection import Connection
from app.services.image_service import save_image

def format_utc_iso(dt):
    if not dt:
        return None
    s = dt.isoformat()
    if not s.endswith('Z') and '+' not in s:
        s += 'Z'
    return s

stories_bp = Blueprint('stories', __name__)

@stories_bp.route('/stories/create', methods=['POST'])
@login_required
@csrf.exempt
def create_story():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    try:
        image_url = save_image(file, 'stories')
        
        expires_at = utc_now() + timedelta(hours=24)
        story = Story(
            user_id=current_user.id,
            image_url=image_url,
            expires_at=expires_at
        )
        
        db.session.add(story)
        db.session.commit()
        
        return jsonify({'message': 'Story created successfully', 'image_url': image_url, 'story': {'id': story.id}}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stories_bp.route('/stories', methods=['GET'])
@login_required
def get_stories():
    active_stories = Story.get_active_stories()
    
    # Pre-fetch current user views
    active_story_ids = [s.id for s in active_stories]
    my_views = {}
    if active_story_ids:
        views = StoryView.query.filter(StoryView.user_id == current_user.id, StoryView.story_id.in_(active_story_ids)).all()
        for v in views:
            my_views[v.story_id] = v.reaction
            
    # Group by user
    user_stories = {}
    for story in active_stories:
        if story.user_id not in user_stories:
            user_stories[story.user_id] = {
                'user': story.author.to_dict(),
                'stories': []
            }
        user_stories[story.user_id]['stories'].append({
            'id': story.id,
            'image_url': story.image_url,
            'created_at': format_utc_iso(story.created_at),
            'expires_at': format_utc_iso(story.expires_at),
            'views_count': story.views_count,
            'my_reaction': my_views.get(story.id)
        })
        
    # Sort connected users first
    connected_ids = set(Connection.get_connected_user_ids(current_user.id))
    
    sorted_users = sorted(user_stories.values(), key=lambda x: (
        x['user']['id'] == current_user.id, # current user first
        x['user']['id'] in connected_ids, # then connected users
    ), reverse=True)
    
    return jsonify(sorted_users)

@stories_bp.route('/stories/<int:story_id>/view', methods=['POST'])
@login_required
@csrf.exempt
def record_story_view(story_id):
    story = Story.query.get_or_404(story_id)
    view = StoryView.query.filter_by(story_id=story.id, user_id=current_user.id).first()
    if not view:
        view = StoryView(story_id=story.id, user_id=current_user.id)
        db.session.add(view)
        db.session.commit()
    return jsonify({
        'success': True,
        'views_count': story.views_count,
        'reaction': view.reaction
    })

@stories_bp.route('/stories/<int:story_id>/react', methods=['POST'])
@login_required
@csrf.exempt
def react_to_story(story_id):
    story = Story.query.get_or_404(story_id)
    data = request.get_json() or {}
    reaction = data.get('reaction', '').strip()
    
    view = StoryView.query.filter_by(story_id=story.id, user_id=current_user.id).first()
    if not view:
        view = StoryView(story_id=story.id, user_id=current_user.id, reaction=reaction)
        db.session.add(view)
    else:
        view.reaction = reaction
        view.updated_at = utc_now()
    db.session.commit()
    
    # Notify author if not own story
    if story.user_id != current_user.id and reaction:
        from app.services.notification_service import create_notification
        create_notification(story.user_id, current_user.id, 'like', post_id=None)
        
    return jsonify({
        'success': True,
        'reaction': view.reaction,
        'views_count': story.views_count
    })

@stories_bp.route('/stories/<int:story_id>/views', methods=['GET'])
@login_required
def get_story_views(story_id):
    story = Story.query.get_or_404(story_id)
    if story.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized to see viewers of this story'}), 403
        
    views = StoryView.query.filter_by(story_id=story.id).order_by(StoryView.updated_at.desc()).all()
    results = []
    for v in views:
        results.append({
            'user': v.user.to_dict(),
            'reaction': v.reaction,
            'created_at': format_utc_iso(v.updated_at or v.created_at)
        })
    return jsonify({
        'views_count': len(results),
        'views': results
    })

@stories_bp.route('/stories/<int:story_id>', methods=['DELETE'])
@stories_bp.route('/stories/<int:story_id>/delete', methods=['POST'])
@login_required
@csrf.exempt
def delete_story(story_id):
    story = Story.query.get_or_404(story_id)
    if story.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized to delete this story'}), 403
        
    db.session.delete(story)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Story deleted successfully'})

