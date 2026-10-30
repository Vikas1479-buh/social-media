import io
from PIL import Image
from app import create_app, db
from app.models.user import User
from app.models.otp import OTP
from app.models.post import Post
from app.models.story import Story
from app.models.connection import Connection
from app.models.notification import Notification

def generate_test_image():
    file = io.BytesIO()
    image = Image.new('RGB', (200, 200), color=(232, 114, 90))
    image.save(file, 'jpeg')
    file.seek(0)
    return file

def run_tests():
    app = create_app()
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    with app.app_context():
        db.drop_all()
        db.create_all()

    client = app.test_client()

    print("=== STARTING SHOWCASE END-TO-END TESTS ===")

    # 1. Landing Page
    resp = client.get('/')
    assert resp.status_code == 200, f"Landing failed: {resp.status_code}"
    print("[PASS] 1. Landing page loaded")

    # 2. Registration Flow - User 1
    email1 = "alice@example.com"
    user1 = "alice"
    pwd1 = "Password123!"

    from unittest.mock import patch
    with patch('random.choices', return_value=['1', '2', '3', '4', '5', '6']):
        resp = client.post('/send-otp', json={'email': email1})
        assert resp.status_code == 200, f"Send OTP failed: {resp.data}"
        print("[PASS] 2a. OTP sent for Alice")

        resp = client.post('/verify-otp', json={'email': email1, 'otp_code': '123456'})
        assert resp.status_code == 200, f"Verify OTP failed: {resp.data}"
        print("[PASS] 2b. OTP verified")

    # Check username
    resp = client.post('/check-username', json={'username': user1})
    assert resp.json['available'] is True
    print("[PASS] 2c. Username checked and available")

    # Create account
    resp = client.post('/create-account', json={'username': user1, 'password': pwd1, 'confirm_password': pwd1})
    assert resp.status_code == 200, f"Create account failed: {resp.data}"
    print("[PASS] 2d. Account created for Alice")

    # 3. Login
    client.get('/logout')
    # Login with email
    resp = client.post('/login', json={'login_id': email1, 'password': pwd1})
    assert resp.status_code == 200 and resp.json['success'], f"Email login failed: {resp.data}"
    print("[PASS] 3a. Logged in with email")

    client.get('/logout')
    # Login with username
    resp = client.post('/login', json={'login_id': user1, 'password': pwd1})
    assert resp.status_code == 200 and resp.json['success'], f"Username login failed: {resp.data}"
    print("[PASS] 3b. Logged in with username")

    # 4. Home Page
    resp = client.get('/home')
    assert resp.status_code == 200
    print("[PASS] 4. Home page accessible")

    # 5. Create Image Post
    img1 = generate_test_image()
    resp = client.post('/posts/create', data={
        'image': (img1, 'post1.jpg'),
        'caption': 'Hello World from Alice!'
    }, content_type='multipart/form-data')
    assert resp.status_code == 201, f"Post creation failed: {resp.data}"
    post_id = resp.json['post']['id']
    print(f"[PASS] 5. Post created (ID: {post_id})")

    # 6. Like Post
    resp = client.post(f'/posts/{post_id}/like')
    assert resp.status_code == 200 and resp.json['liked'] is True
    print("[PASS] 6. Post liked")

    # 7. Comment on Post
    resp = client.post(f'/posts/{post_id}/comment', json={'content': 'Great post!'})
    assert resp.status_code == 201
    print("[PASS] 7. Comment added to post")

    # 8. Share Post
    resp = client.post(f'/posts/{post_id}/share')
    assert resp.status_code == 200 and resp.json['success']
    print("[PASS] 8. Post shared")

    # 9. Create Story
    img_story = generate_test_image()
    resp = client.post('/stories/create', data={
        'image': (img_story, 'story1.jpg')
    }, content_type='multipart/form-data')
    assert resp.status_code == 201
    print("[PASS] 9. Story created")

    # 10. Feed query
    resp = client.get('/feed?page=1')
    assert resp.status_code == 200
    posts = resp.json
    assert len(posts) >= 1
    assert posts[0]['caption'] == 'Hello World from Alice!'
    print(f"[PASS] 10. Feed returned {len(posts)} post(s)")

    # 11. Create User 2 (Bob) and test connections
    email2 = "bob@example.com"
    user2 = "bob"
    pwd2 = "Password123!"

    client.get('/logout')
    with patch('random.choices', return_value=['6', '5', '4', '3', '2', '1']):
        client.post('/send-otp', json={'email': email2})
        client.post('/verify-otp', json={'email': email2, 'otp_code': '654321'})
    client.post('/create-account', json={'username': user2, 'password': pwd2, 'confirm_password': pwd2})
    
    with app.app_context():
        alice_obj = User.query.filter_by(username=user1).first()
        bob_obj = User.query.filter_by(username=user2).first()
        alice_id = alice_obj.id
        bob_id = bob_obj.id

    # Bob connects to Alice
    resp = client.post(f'/connect/{alice_id}')
    assert resp.status_code == 200 and resp.json['status'] == 'pending'
    print("[PASS] 11a. Bob sent connection request to Alice")

    # Alice logs in and accepts request
    client.get('/logout')
    client.post('/login', json={'login_id': user1, 'password': pwd1})
    
    with app.app_context():
        conn = Connection.query.filter_by(sender_id=bob_id, receiver_id=alice_id).first()
        conn_id = conn.id

    resp = client.post(f'/connection/accept/{conn_id}')
    assert resp.status_code == 200 and resp.json['status'] == 'accepted'
    print("[PASS] 11b. Alice accepted Bob's connection request")

    # 12. Check notifications
    resp = client.get('/api/notifications?page=1')
    assert resp.status_code == 200
    notifs = resp.json['notifications']
    assert len(notifs) >= 1
    print(f"[PASS] 12. Notifications verified ({len(notifs)} received)")

    # 13. Profile page and update
    resp = client.get(f'/profile/{user1}')
    assert resp.status_code == 200
    
    resp = client.post('/profile/update', data={'bio': 'Photographer and creator.'})
    assert resp.status_code == 200
    with app.app_context():
        updated_alice = User.query.filter_by(username=user1).first()
        assert updated_alice.bio == 'Photographer and creator.'
    print("[PASS] 13. Profile view & bio update verified")

    print("\n>>> ALL 13 END-TO-END TEST SUITES PASSED FLAWLESSLY! <<<\n")

if __name__ == '__main__':
    run_tests()
