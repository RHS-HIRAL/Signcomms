from flask import Flask, request, jsonify
from flask_cors import CORS
from googletrans import Translator

app = Flask(__name__)
translator = Translator()
CORS(app)

@app.route('/translate', methods=['POST'])
def translate_text():
    data = request.get_json()
    text = data.get('text')
    target_lang = data.get('language')

    print("📥 Received:", text, "| Target Language:", target_lang)

    if not text or not target_lang:
        return jsonify({'error': 'Missing text or language'}), 400

    try:
        translated = translator.translate(text, dest=target_lang)
        print("✅ Translated:", translated.text)
        return jsonify({'translated': translated.text})
    except Exception as e:
        print("❌ Translation failed:", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)  # Ensure the server runs
