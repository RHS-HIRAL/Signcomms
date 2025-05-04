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

# Flask setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# SocketIO setup
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Load model
MODEL_PATH = "model/trained_model_updated2.keras"
model = tf.keras.models.load_model(MODEL_PATH)
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


@socketio.on('frame')
def handle_browser_frame(data):
    global sentence, prediction_buffer, last_prediction_time

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
                        elif stable_label == "del":
                            sentence = sentence[:-1]
                        elif stable_label != "nothing":
                            sentence += stable_label

                        prediction_buffer = []
                        print(f"[DEBUG] Emitting sentence: {sentence}")
                        socketio.emit("prediction", {
                            "letter": stable_label,
                            "sentence": sentence
                        })
                    else:
                        prediction_buffer.pop(0)


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


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)



# import os
# import cv2
# import time
# import base64
# import numpy as np
# import mediapipe as mp
# import tensorflow as tf
# from PIL import Image
# from io import BytesIO
# from flask import Flask, request, jsonify
# from flask_socketio import SocketIO
# from gtts import gTTS
# from googletrans import Translator
# from threading import Thread
# from utils.preprocess_new import preprocess_image

# # Flask & SocketIO setup
# app = Flask(__name__)
# # socketio = SocketIO(app, cors_allowed_origins="*")
# socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')


# # Load model
# MODEL_PATH = "model/trained_model_updated2.keras"
# model = tf.keras.models.load_model(MODEL_PATH)
# labels = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ") + ["space", "nothing", "del"]

# # MediaPipe
# mp_hands = mp.solutions.hands
# hands = mp_hands.Hands(max_num_hands=1)
# mp_drawing = mp.solutions.drawing_utils

# # Prediction state
# sentence = ""
# prediction_buffer = []
# buffer_size = 5
# min_time_between_predictions = 1.0
# last_prediction_time = 0

# # Translator
# translator = Translator()

# @socketio.on('frame')
# def handle_browser_frame(data):
#     global sentence, prediction_buffer, last_prediction_time

#     # Step 1: Decode base64 image
#     try:
#         header, encoded = data.split(",", 1)
#         decoded = base64.b64decode(encoded)
#         np_data = np.frombuffer(decoded, np.uint8)
#         frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
#     except Exception as e:
#         print(f"[ERROR] Frame decoding failed: {e}")
#         return

#     rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     result = hands.process(rgb_frame)

#     if result.multi_hand_landmarks:
#         for hand_landmarks in result.multi_hand_landmarks:
#             height, width, _ = frame.shape
#             x_min = int(min([lm.x for lm in hand_landmarks.landmark]) * width)
#             x_max = int(max([lm.x for lm in hand_landmarks.landmark]) * width)
#             y_min = int(min([lm.y for lm in hand_landmarks.landmark]) * height)
#             y_max = int(max([lm.y for lm in hand_landmarks.landmark]) * height)
#             x_min, y_min = max(x_min, 0), max(y_min, 0)
#             x_max, y_max = min(x_max, width), min(y_max, height)

#             hand_region = frame[y_min:y_max, x_min:x_max]
#             if hand_region.size == 0:
#                 continue

#             hand_rgb = cv2.cvtColor(hand_region, cv2.COLOR_BGR2RGB)
#             hand_pil = Image.fromarray(hand_rgb)
#             hand_image = preprocess_image(hand_pil)
#             hand_image = np.expand_dims(hand_image, axis=0)

#             current_time = time.time()
#             if current_time - last_prediction_time > min_time_between_predictions:
#                 prediction = model.predict(hand_image, verbose=0)
#                 predicted_class = np.argmax(prediction)
#                 predicted_label = labels[predicted_class]
#                 print(f"[DEBUG] Predicted: {predicted_label}")
#                 print(f"[DEBUG] Sentence: {sentence}")

#                 prediction_buffer.append(predicted_label)

#                 if len(prediction_buffer) >= buffer_size:
#                     if prediction_buffer.count(prediction_buffer[0]) == len(prediction_buffer):
#                         stable_label = prediction_buffer[0]
#                         last_prediction_time = current_time

#                         if stable_label == "space":
#                             sentence += " "
#                         elif stable_label == "del":
#                             sentence = sentence[:-1]
#                         elif stable_label != "nothing":
#                             sentence += stable_label

#                         prediction_buffer = []
#                         socketio.emit("prediction", {
#                             "letter": stable_label,
#                             "sentence": sentence
#                         })
#                     else:
#                         prediction_buffer.pop(0)

# @socketio.on('connect')
# def on_connect():
#     print("Client connected")
#     # socketio.start_background_task(video_thread)

# @app.route("/")
# def index():
#     return "SignComms Flask Server Running"

# # Translation endpoint
# @app.route("/translate", methods=["POST"])
# def translate_text():
#     data = request.get_json()
#     text = data.get("text", "")
#     language = data.get("language", "en")

#     if not text.strip():
#         return jsonify({"translated": ""})

#     key = (text.strip(), language)
#     if key in translation_cache:
#         return jsonify({"translated": translation_cache[key]})

#     try:
#         translated = GoogleTranslator(source='auto', target=language).translate(text)
#     except Exception as e:
#         print(f"Translation failed, falling back to English. Error: {e}")
#         translated = GoogleTranslator(source='auto', target='en').translate(text)

#     translation_cache[key] = translated
#     return jsonify({"translated": translated})

# # Text-to-speech endpoint (returns MP3 file URL)
# @app.route("/tts", methods=["POST"])
# def text_to_speech():
#     data = request.get_json()
#     text = data.get("text", "")
#     language = data.get("language", "en")

#     if not text.strip():
#         return jsonify({"error": "No text provided"}), 400

#     try:
#         tts = gTTS(text=text, lang=language)
#         filename = f"tts_{language}_{uuid.uuid4().hex[:8]}.mp3"
#         filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#         tts.save(filepath)
#         return jsonify({"audio_url": f"/static/audio/{filename}"})
#     except Exception as e:
#         print("TTS generation failed:", e)
#         return jsonify({"error": "TTS failed"}), 500

# # Serve generated MP3 files
# @app.route("/static/audio/<filename>")
# def serve_audio(filename):
#     return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# # Run Flask app
# if __name__ == "__main__":
#     socketio.run(app, host="0.0.0.0", port=5000)



# def video_thread():
#     global sentence, prediction_buffer, last_prediction_time
#     cap = cv2.VideoCapture(0)

#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             continue

#         rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         result = hands.process(rgb_frame)

#         if result.multi_hand_landmarks:
#             for hand_landmarks in result.multi_hand_landmarks:
#                 height, width, _ = frame.shape
#                 x_min = int(min([lm.x for lm in hand_landmarks.landmark]) * width)
#                 x_max = int(max([lm.x for lm in hand_landmarks.landmark]) * width)
#                 y_min = int(min([lm.y for lm in hand_landmarks.landmark]) * height)
#                 y_max = int(max([lm.y for lm in hand_landmarks.landmark]) * height)
#                 x_min, y_min = max(x_min, 0), max(y_min, 0)
#                 x_max, y_max = min(x_max, width), min(y_max, height)

#                 hand_region = frame[y_min:y_max, x_min:x_max]
#                 if hand_region.size == 0:
#                     continue

#                 hand_rgb = cv2.cvtColor(hand_region, cv2.COLOR_BGR2RGB)
#                 hand_pil = Image.fromarray(hand_rgb)
#                 hand_image = preprocess_image(hand_pil)
#                 hand_image = np.expand_dims(hand_image, axis=0)

#                 current_time = time.time()
#                 if current_time - last_prediction_time > min_time_between_predictions:
#                     prediction = model.predict(hand_image, verbose=0)
#                     predicted_class = np.argmax(prediction)
#                     predicted_label = labels[predicted_class]
#                     print(f"[DEBUG] Predicted: {predicted_label}")
#                     print(f"[DEBUG] Sentence: {sentence}")

#                     prediction_buffer.append(predicted_label)

#                     if len(prediction_buffer) >= buffer_size:
#                         if prediction_buffer.count(prediction_buffer[0]) == len(prediction_buffer):
#                             stable_label = prediction_buffer[0]
#                             last_prediction_time = current_time

#                             if stable_label == "space":
#                                 sentence += " "
#                             elif stable_label == "del":
#                                 sentence = sentence[:-1]
#                             elif stable_label != "nothing":
#                                 sentence += stable_label

#                             prediction_buffer = []
#                             socketio.emit("prediction", {
#                                 "letter": stable_label,
#                                 "sentence": sentence
#                             })
#                         else:
#                             prediction_buffer.pop(0)


# ---------- Translation Endpoint ----------
# @app.route("/translate", methods=["POST"])
# def translate_text():
#     data = request.get_json()
#     text = data.get("text", "")
#     language = data.get("language", "en")
#     try:
#         translated = translator.translate(text, dest=language).text
#         return jsonify({"translated": translated})
#     except Exception as e:
#         return jsonify({"error": str(e), "translated": text})

# # ---------- Text-to-Speech Endpoint ----------
# @app.route("/tts", methods=["POST"])
# def text_to_speech():
#     data = request.get_json()
#     text = data.get("text", "")
#     language = data.get("language", "en")
#     try:
#         tts = gTTS(text=text, lang=language)
#         audio_buffer = BytesIO()
#         tts.write_to_fp(audio_buffer)
#         audio_buffer.seek(0)
#         audio_base64 = base64.b64encode(audio_buffer.read()).decode('utf-8')
#         return jsonify({"audio": audio_base64})
#     except Exception as e:
#         return jsonify({"error": str(e)})
