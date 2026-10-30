# 📸 Showcase — Pure Image Social Platform

<p align="center">
  <img src="app/static/img/logo.png" alt="Showcase Logo" width="120" onerror="this.style.display='none'">
</p>

<p align="center">
  <strong>A modern, image-first social community platform built with Flask, PostgreSQL, and Bootstrap 5.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white" alt="Flask">
  <img src="https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=flat-square&logo=bootstrap&logoColor=white" alt="Bootstrap">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## ✨ Features Overview

### 📸 1. Image-First Home Feed
* **Smart Feed Ranking Algorithm:** Posts are ranked based on connection affinity, recency decay, and engagement weights (likes, comments, shares).
* **High-Res Visual Feed:** Clean card layout with double-tap heart-burst animations, rich captions, and author online status badges.
* **Full Post Management:** Create posts with photos from gallery or direct camera capture. Delete your own posts with instant UI removal.

### 📖 2. 24-Hour Expiring Stories
* **Story Ring Carousel:** Radiant sunset-gradient borders (`#FF6B4A` → `#E8725A`) highlighting active stories.
* **Interactive Story Viewer:**
  * Auto-advancing 5-second progress bars with keyboard navigation (`Left`, `Right`, `Escape`).
  * **For Viewers:** Quick emoji reaction bar (`❤️`, `🔥`, `😂`, `👏`, `😍`, `😮`) that sends live reactions.
  * **For Story Owners:** **`👁️ X views`** drawer showing all viewers, timestamps, and the specific emoji reaction they clicked right in front of their username.
  * **Story Deletion:** One-tap trash icon (`🗑️`) to remove stories immediately.

### 💬 3. Comments & Community Interactions
* **Unlimited Commenting:** Post comments without rate limits.
* **Comment Likes:** Heart any comment with real-time like counters.
* **Comment Deletion:** Comment authors and post owners can delete comments directly from the comment modal.
* **Real-Time Timestamps:** Accurate UTC-based relative time calculations (`just now`, `15s ago`, `2m ago`) matching local timezones.

### 👤 4. Aesthetic Profile System
* **Sunset Gradient Cover Banner:** Glassmorphic card banner header with ambient lighting.
* **Overlapping Avatar with Ambient Ring:** High-resolution avatar with soft shadow borders and online presence indicator.
* **Dynamic Stats Counters:** Live interactive counters for **Posts** and **Connections**.
* **Profile Photo Grid:** 3-column responsive photo grid with hover zoom (`scale(1.025)`), frosted-glass like/comment badges, and full lightbox detail viewer.
* **Quick Link Sharing:** One-click "Share Profile" button that copies your profile URL to the clipboard.

### 🔍 5. Explore & Mutual Connections
* **Explore Page:** Discover creators, trending tags, and popular posts.
* **Mutual Connection Flow:** Send, accept, decline, and disconnect requests with real-time state changes.

### 🔔 6. Notifications System
* In-app notifications for likes, comments, shares, and connection requests with dynamic unread badge count in the top navigation bar.

### 🔐 7. Passwordless OTP Verification & Auth
* **Secure Registration:** 6-digit OTP verification flow.
* **Dual Mode Support:**
  * **Developer / Demo Mode:** Code displayed in on-screen banner and auto-filled (no SMTP setup required).
  * **Production SMTP:** Sends actual emails via Gmail SMTP.
* **Session Security:** CSRF protection, password hashing via Werkzeug, and secure cookie sessions.

---

## 🛠️ Tech Stack

* **Backend:** Python 3.11+, Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-Login, Flask-Mail, Flask-WTF
* **Database:** PostgreSQL (with SQLAlchemy ORM)
* **Image Processing:** Pillow (PIL)
* **Frontend:** HTML5, CSS3 (Modern Glassmorphism & Micro-animations), Bootstrap 5.3, Bootstrap Icons, Vanilla JavaScript (ES6+)

---

## 📁 Project Structure

```text
social-media/
├── app/
│   ├── models/            # SQLAlchemy Database Models
│   │   ├── user.py        # User schema & authentication
│   │   ├── post.py        # Post schema, likes, comments & shares
│   │   ├── story.py       # Story & StoryView (reactions & view tracking)
│   │   ├── comment.py     # Comment & CommentLike models
│   │   ├── connection.py  # Follower & Connection request models
│   │   ├── notification.py# Notification logs & status
│   │   └── otp.py         # 6-digit OTP verification records
│   ├── routes/            # Blueprint Controllers
│   │   ├── auth.py        # OTP verification, login, registration, logout
│   │   ├── main.py        # Home dashboard routes
│   │   ├── posts.py       # Post creation, feeds, likes, comments, deletion
│   │   ├── stories.py     # Story creation, viewer drawer, emoji reactions
│   │   ├── profile.py     # User profiles, avatar upload, bio editing
│   │   ├── connections.py # Connection requests & friend graph
│   │   ├── explore.py     # Discovery & trending feeds
│   │   └── notifications.py# Notification listing & read status
│   ├── services/          # Business Logic & Algorithms
│   │   ├── feed_service.py        # Personalized feed ranking algorithm
│   │   ├── image_service.py       # Upload validation, resizing & compression
│   │   ├── notification_service.py# Notification generator & deduplication
│   │   └── otp_service.py         # OTP generation & verification
│   ├── static/            # Static Assets
│   │   ├── css/style.css  # Showcase Design System & Glassmorphism styles
│   │   ├── js/            # Client modules (feed.js, stories.js, profile.js, etc.)
│   │   └── uploads/       # Storage directory (posts, stories, profiles)
│   ├── templates/         # Jinja2 HTML Templates
│   │   ├── base.html      # Responsive master layout & navigation
│   │   ├── home.html      # Home feed & desktop sidebar widgets
│   │   ├── profile.html   # Profile hero card & post grid
│   │   ├── explore.html   # Discovery grid
│   │   ├── login.html     # Login screen
│   │   └── register.html  # Multi-step OTP registration
│   ├── config.py          # App configuration & environment loader
│   └── extensions.py      # Database, login manager & mail extensions
├── run.py                 # Application entry point
├── requirements.txt       # Python dependencies
└── .env                   # Environment secrets & database URL
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Python 3.11+** installed
* **PostgreSQL** database running locally or remotely

### 2. Clone the Repository & Setup Environment
```powershell
# Open terminal in project directory
cd "C:\Users\vikas\Downloads\social media"

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows Command Prompt:
.\venv\Scripts\activate.bat
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables (`.env`)
Create or edit the `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:root@localhost:5432/showcase

# Flask Secret Key
SECRET_KEY=showcase-production-secret-key-9283748291
FLASK_ENV=development

# Email SMTP (Optional for real emails; leave blank for Demo Mode)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_DEFAULT_SENDER=

# Upload Limits (5MB max)
MAX_CONTENT_LENGTH=5242880
UPLOAD_FOLDER=app/static/uploads
```

> **Note:** If `MAIL_USERNAME` and `MAIL_PASSWORD` are left empty, Showcase automatically activates **Demo Mode**, displaying the 6-digit OTP code directly in the browser and terminal console!

### 5. Initialize the Database & Run Server
```powershell
python run.py
```

The database tables will be created automatically on startup.
Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 🧪 Testing

Run the automated test suite:
```powershell
.\venv\Scripts\python test_integration.py
```

---

## 🎨 UI/UX Features Highlights
* **Navigation Bar:**
  * **Left:** Showcase camera logo + Notification Bell (`🔔`).
  * **Center:** Quick links to `Home` and `Explore`.
  * **Right:** Quick `+` Create Post button + Profile Avatar dropdown.
* **Desktop Feed Layout:** Clean 2-column view with a sticky right sidebar for creator shortcuts, profile snapshot, and trending discover cards.
* **Micro-interactions:** Spring hover scale on interaction buttons, subtle photo zoom on hover, heart-burst likes, and live real-time timestamp updates.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
