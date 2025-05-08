import eventlet
eventlet.monkey_patch()
import os
import cv2
import time
import base64
import uuid
import numpy as np
import mediapipe as mp
import tensorflow as tf
from PIL import Image
from io import BytesIO
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
from gtts import gTTS
from deep_translator import GoogleTranslator
from threading import Thread
from utils.preprocess_new import preprocess_image
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# Flask setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# SocketIO setup
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Load model
MODEL_PATH = "model/trained_model_updated2.keras"
model = tf.keras.models.load_model(MODEL_PATH, compile=False)
labels = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ") + ["space", "nothing", "del"]

# MediaPipe
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1)
mp_drawing = mp.solutions.drawing_utils

# Prediction state
sentence = ""
prediction_buffer = []
buffer_size = 5
min_time_between_predictions = 1.0
last_prediction_time = 0

# Translation cache
translation_cache = {}

# TTS directory
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static/audio')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Data folder and file setup
DATA_FOLDER = os.path.join(os.getcwd(), 'data')
os.makedirs(DATA_FOLDER, exist_ok=True)
current_time_str = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
data_filename = f"data-{current_time_str}.txt"
data_filepath = os.path.join(DATA_FOLDER, data_filename)

# Helper to append to file
current_sentence = ""
def append_to_data_file(text, newline=False):
    mode = 'a'
    with open(data_filepath, mode, encoding='utf-8') as f:
        if newline:
            f.write(text + '\n')
        else:
            f.write(text)

# SQLAlchemy setup
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
db = SQLAlchemy(app)

# User model
class User(db.Model):
    username = db.Column(db.String(80), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    password = db.Column(db.String(200), nullable=False)  # Store hashed password

# Create tables (run once)
with app.app_context():
    db.create_all()

@socketio.on('frame')
def handle_browser_frame(data):
    global sentence, prediction_buffer, last_prediction_time, current_sentence

    try:
        header, encoded = data.split(",", 1)
        decoded = base64.b64decode(encoded)
        np_data = np.frombuffer(decoded, np.uint8)
        frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"[ERROR] Frame decoding failed: {e}")
        return

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb_frame)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            height, width, _ = frame.shape
            x_min = int(min(lm.x for lm in hand_landmarks.landmark) * width)
            x_max = int(max(lm.x for lm in hand_landmarks.landmark) * width)
            y_min = int(min(lm.y for lm in hand_landmarks.landmark) * height)
            y_max = int(max(lm.y for lm in hand_landmarks.landmark) * height)
            x_min, y_min = max(x_min, 0), max(y_min, 0)
            x_max, y_max = min(x_max, width), min(y_max, height)

            hand_region = frame[y_min:y_max, x_min:x_max]
            if hand_region.size == 0:
                continue

            hand_rgb = cv2.cvtColor(hand_region, cv2.COLOR_BGR2RGB)
            hand_pil = Image.fromarray(hand_rgb)
            hand_image = preprocess_image(hand_pil)
            hand_image = np.expand_dims(hand_image, axis=0)

            current_time = time.time()
            if current_time - last_prediction_time > min_time_between_predictions:
                prediction = model.predict(hand_image, verbose=0)
                predicted_class = np.argmax(prediction)
                predicted_label = labels[predicted_class]

                print(f"[DEBUG] Predicted: {predicted_label}")

                prediction_buffer.append(predicted_label)

                if len(prediction_buffer) >= buffer_size:
                    if prediction_buffer.count(prediction_buffer[0]) == len(prediction_buffer):
                        stable_label = prediction_buffer[0]
                        last_prediction_time = current_time

                        if stable_label == "space":
                            sentence += " "
                            current_sentence += " "
                        elif stable_label == "del":
                            sentence = sentence[:-1]
                            current_sentence = current_sentence[:-1]
                        elif stable_label != "nothing":
                            sentence += stable_label
                            current_sentence += stable_label
                        # Write the current letter to the file (not a new line)
                        append_to_data_file(stable_label if stable_label not in ["space", "del", "nothing"] else (" " if stable_label == "space" else ""))

                        prediction_buffer = []
                        print(f"[DEBUG] Emitting sentence: {sentence}")
                        socketio.emit("prediction", {
                            "letter": stable_label,
                            "sentence": sentence,
                            "confidence": float(np.max(prediction)),
                            "landmarks": [[lm.x, lm.y] for lm in hand_landmarks.landmark]
                        })
                    else:
                        prediction_buffer.pop(0)


@socketio.on('reset_sentence')
def handle_reset_sentence():
    global sentence, prediction_buffer, current_sentence
    # Write the current sentence to the file as a new line if not empty
    if current_sentence.strip():
        append_to_data_file(current_sentence, newline=True)
    current_sentence = ""
    sentence = ""
    prediction_buffer = []
    socketio.emit("prediction", {
        "letter": "",
        "sentence": sentence,
        "confidence": None,
        "landmarks": []
    })


@app.route("/")
def index():
    return "SignComms Flask Server Running"


@app.route("/translate", methods=["POST"])
def translate_text():
    data = request.get_json()
    text = data.get("text", "")
    language = data.get("language", "en")

    if not text.strip():
        return jsonify({"translated": ""})

    key = (text.strip(), language)
    if key in translation_cache:
        return jsonify({"translated": translation_cache[key]})

    try:
        translated = GoogleTranslator(source='auto', target=language).translate(text)
    except Exception as e:
        print(f"[ERROR] Translation failed: {e}")
        translated = text

    translation_cache[key] = translated
    return jsonify({"translated": translated})


@app.route("/tts", methods=["POST"])
def text_to_speech():
    data = request.get_json()
    text = data.get("text", "")
    language = data.get("language", "en")

    if not text.strip():
        return jsonify({"error": "No text provided"}), 400

    try:
        tts = gTTS(text=text, lang=language)
        filename = f"tts_{language}_{uuid.uuid4().hex[:8]}.mp3"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        tts.save(filepath)
        return jsonify({"audio_url": f"/static/audio/{filename}"})
    except Exception as e:
        print("[ERROR] TTS generation failed:", e)
        return jsonify({"error": "TTS failed"}), 500


@app.route("/static/audio/<filename>")
def serve_audio(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    name = data.get("name")
    password = data.get("password")
    if not username or not name or not password:
        return jsonify({"error": "All fields are required."}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists."}), 409
    hashed_password = generate_password_hash(password)
    user = User(username=username, name=name, password=hashed_password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Registration successful", "username": username, "name": name})


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        return jsonify({"message": "Login successful", "username": username, "name": user.name})
    else:
        return jsonify({"error": "Invalid username or password"}), 401


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)