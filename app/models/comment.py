from datetime import datetime, timezone
from sqlalchemy import UniqueConstraint
from app.extensions import db, utc_now

class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    author = db.relationship('User', backref=db.backref('comments', lazy='dynamic'))

    @property
    def like_count(self):
        return CommentLike.query.filter_by(comment_id=self.id).count()

    def is_liked_by(self, user_id):
        if not user_id:
            return False
        return CommentLike.query.filter_by(comment_id=self.id, user_id=user_id).first() is not None


class CommentLike(db.Model):
    __tablename__ = 'comment_likes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now)

    __table_args__ = (
        UniqueConstraint('user_id', 'comment_id', name='uq_comment_like_user_comment'),
    )
