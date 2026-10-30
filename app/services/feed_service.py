from datetime import datetime, timezone
import math
from app.extensions import db, utc_now
from app.models.post import Post
from app.models.user import User
from app.models.connection import Connection
from app.models.like import Like
from app.models.comment import Comment
from app.models.share import Share
from sqlalchemy import func

def get_personalized_feed(user_id, page=1, per_page=10):
    # 1. Get connected user IDs
    connected_ids = Connection.get_connected_user_ids(user_id)
    
    # 2. Get user's recent interaction history (who they liked/commented/shared)
    # We'll use SQLAlchemy to get counts of interactions per author
    recent_likes = db.session.query(Post.user_id, func.count(Like.id).label('count'))\
        .join(Like).filter(Like.user_id == user_id).group_by(Post.user_id).all()
    like_history = {author_id: count for author_id, count in recent_likes}

    recent_comments = db.session.query(Post.user_id, func.count(Comment.id).label('count'))\
        .join(Comment).filter(Comment.user_id == user_id).group_by(Post.user_id).all()
    comment_history = {author_id: count for author_id, count in recent_comments}

    recent_shares = db.session.query(Post.user_id, func.count(Share.id).label('count'))\
        .join(Share).filter(Share.user_id == user_id).group_by(Post.user_id).all()
    share_history = {author_id: count for author_id, count in recent_shares}

    # 3. Query eligible posts (let's say last 500 for candidate pool)
    candidates = Post.query.order_by(Post.created_at.desc()).limit(500).all()
    
    now = utc_now()
    scored_posts = []

    # 4. Calculate score
    for post in candidates:
        score = 0
        author_id = post.user_id
        
        # Connection Score
        if author_id in connected_ids:
            score += 50
            
        # Interaction Score
        if author_id in like_history:
            score += 15
        if author_id in comment_history:
            score += 20
        if author_id in share_history:
            score += 20
            
        # Recency Score: exponential decay
        # max 40 points, halves every 24 hours
        # using e^(-lambda * t) where t is in hours, lambda = ln(2)/24
        created = post.created_at
        if created.tzinfo is not None:
            created = created.replace(tzinfo=None)
        post_age_hours = max(0, (now - created).total_seconds()) / 3600
        decay_factor = math.exp(- (math.log(2)/24) * post_age_hours)
        score += 40 * decay_factor
        
        # Engagement Score
        likes = post.like_count
        comments = post.comment_count
        shares = post.share_count
        engagement = (math.log(1 + likes) * 3) + (math.log(1 + comments) * 5) + (math.log(1 + shares) * 4)
        score += min(engagement, 30) # capped at 30
        
        scored_posts.append({
            'post': post,
            'score': score
        })

    # 5. Sort by score descending
    scored_posts.sort(key=lambda x: x['score'], reverse=True)

    # 6. Apply diversity: push down same author if 2+ consecutive
    diverse_posts = []
    consecutive_count = 0
    last_author_id = None
    
    temp_pool = [item['post'] for item in scored_posts]
    
    while temp_pool:
        best_post = None
        best_idx = -1
        
        for i, post in enumerate(temp_pool):
            if post.user_id != last_author_id or consecutive_count < 2:
                best_post = post
                best_idx = i
                break
                
        if best_post is None:
            # All remaining posts are from the same author, just take the first
            best_post = temp_pool[0]
            best_idx = 0
            
        diverse_posts.append(best_post)
        if best_post.user_id == last_author_id:
            consecutive_count += 1
        else:
            last_author_id = best_post.user_id
            consecutive_count = 1
            
        temp_pool.pop(best_idx)

    # 7. Paginate
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_posts = diverse_posts[start_idx:end_idx]

    # 8. Return list of dicts
    result = []
    
    # Batch check likes for current user
    if paginated_posts:
        post_ids = [p.id for p in paginated_posts]
        user_likes = Like.query.filter(Like.user_id == user_id, Like.post_id.in_(post_ids)).all()
        liked_post_ids = {l.post_id for l in user_likes}
    else:
        liked_post_ids = set()

    for post in paginated_posts:
        result.append({
            'id': post.id,
            'author': post.author.to_dict(),
            'image_url': post.image_url,
            'caption': post.caption,
            'created_at': post.created_at.isoformat() + ('Z' if not post.created_at.isoformat().endswith('Z') else ''),
            'like_count': post.like_count,
            'comment_count': post.comment_count,
            'share_count': post.share_count,
            'is_liked': post.id in liked_post_ids
        })

    return result
