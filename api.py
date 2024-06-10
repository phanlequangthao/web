from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import tensorflow as tf
from keras.models import load_model
app = Flask(__name__)
CORS(app)
physical_devices = tf.config.experimental.list_physical_devices('GPU')
if len(physical_devices) > 0:
    tf.config.experimental.set_visible_devices(physical_devices[0], 'GPU')
num_of_timesteps = 7
model = load_model(f'model_{num_of_timesteps}.h5')
def replace_none_with_zero(data):
    return [[0 if value is None else value for value in sublist] for sublist in data]

@app.route('/api/analyze', methods=['POST'])
def analyze_sign_language():
    try:
        data = request.get_json()
        print(len(data))
        if data and len(data) == num_of_timesteps:
            data = replace_none_with_zero(data)
            lm_list = np.array(data, dtype=np.float32)
            lm_list = np.expand_dims(lm_list, axis=0) 
            prediction = model.predict(lm_list)
            predicted_label_index = np.argmax(prediction, axis=1)[0]
            classes = ['a', 'b', 'c', 'o', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
                        'l', 'm', 'n', 'p', 'q', 'r', 's', 'space', 't', 'u',
                        'v', 'w', 'x', 'y', 'z', 'yes', 'no', 'me', 'you', 'hello',
                        'i_love_you', 'thank_you', 'sorry']
            confidence = np.max(prediction, axis=1)[0]
            if np.isnan(confidence):
                return jsonify({'error': 'Prediction resulted in NaN value!!!'}), 550
            label = classes[predicted_label_index] if confidence > 0.95 else "undefine lb"
            response = {
                'best_class': label,
                'probability': float(confidence)
            }
            return jsonify(response)
        else:
            return jsonify({'error': 'Invalid data received!'}), 450
    except Exception as e:
        return jsonify({'error': 'Server error', 'details': str(e)}), 550
@app.route('/api/ping', methods=['GET'])
def ping():
    return 'Pong'
if __name__ == '__main__':
    app.run(debug=True, port=5001, use_reloader=False)
