import os
import uuid
import mimetypes
from werkzeug.utils import secure_filename
from PIL import Image
from flask import current_app

def generate_secure_filename(extension):
    return f"{uuid.uuid4().hex}.{extension}"

def get_upload_path(category):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    path = os.path.join(upload_folder, category)
    os.makedirs(path, exist_ok=True)
    return path

def validate_image(file_storage):
    # Check extension
    filename = secure_filename(file_storage.filename)
    if '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in current_app.config.get('ALLOWED_IMAGE_EXTENSIONS', {'jpg', 'jpeg', 'png', 'gif'}):
        return False

    # Check MIME type
    mime_type = mimetypes.guess_type(filename)[0]
    if not mime_type or not mime_type.startswith('image/'):
        return False

    # Verify actual image content
    try:
        img = Image.open(file_storage)
        img.verify()
        file_storage.seek(0)  # Reset pointer after verification
    except Exception:
        return False

    return True

def save_image(file_storage, category):
    if not validate_image(file_storage):
        raise ValueError("Invalid image file")

    filename = secure_filename(file_storage.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    new_filename = generate_secure_filename(ext)
    
    upload_path = get_upload_path(category)
    filepath = os.path.join(upload_path, new_filename)

    try:
        img = Image.open(file_storage)
        # Convert RGBA to RGB for JPEG
        if img.mode == 'RGBA' and ext in {'jpg', 'jpeg'}:
            img = img.convert('RGB')
            
        # Resize if width > 1920
        if img.width > 1920:
            ratio = 1920 / img.width
            new_height = int(img.height * ratio)
            img = img.resize((1920, new_height), Image.Resampling.LANCZOS)
            
        img.save(filepath, optimize=True)
    except Exception as e:
        raise ValueError(f"Failed to process and save image: {str(e)}")

    return f"uploads/{category}/{new_filename}"
