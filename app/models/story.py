from app.extensions import db, utc_now

class Story(db.Model):
    __tablename__ = 'stories'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    image_url = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)

    author = db.relationship('User', backref=db.backref('stories', lazy='dynamic'))

    @property
    def views_count(self):
        return StoryView.query.filter_by(story_id=self.id).count()

    @classmethod
    def get_active_stories(cls):
        now = utc_now()
        return cls.query.filter(cls.expires_at > now).all()


class StoryView(db.Model):
    __tablename__ = 'story_views'

    id = db.Column(db.Integer, primary_key=True)
    story_id = db.Column(db.Integer, db.ForeignKey('stories.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    reaction = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    user = db.relationship('User', backref=db.backref('story_views_rel', lazy='dynamic'))
    story = db.relationship('Story', backref=db.backref('views_rel', cascade='all, delete-orphan', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('story_id', 'user_id', name='uq_story_user_view'),
    )
