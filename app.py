from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import base64
from model import process_image
from werkzeug.utils import secure_filename
from PIL import Image
from io import BytesIO

app = Flask(__name__)

UPLOAD_FOLDER = "static/uploads"
PROCESSED_FOLDER = "static/processed"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["PROCESSED_FOLDER"] = PROCESSED_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

@app.route("/", methods=["GET", "POST"])
def index():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process():
    try:
        if "original_image" not in request.files:
            return jsonify({"error": "No original image provided"}), 400

        file = request.files["original_image"]
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

        # Use streaming to handle large images efficiently
        image_stream = BytesIO(file.read())  
        original_image = Image.open(image_stream).convert("RGBA")
        original_image.save(filepath, format="PNG")

        # Process the image (Remove background)
        processed_filepath = process_image(filepath)

        # Convert processed image to base64
        processed_full_path = os.path.join(app.config["PROCESSED_FOLDER"], os.path.basename(processed_filepath))
        if not os.path.exists(processed_full_path):
            return jsonify({"error": "Processed image not found"}), 500

        with open(processed_full_path, "rb") as processed_file:
            processed_base64 = base64.b64encode(processed_file.read()).decode("utf-8")

        return jsonify({"processed_image": f"data:image/png;base64,{processed_base64}"})

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
