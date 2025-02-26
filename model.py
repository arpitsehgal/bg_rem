import torch
from transformers import AutoModelForImageSegmentation
from torchvision import transforms
from PIL import Image
import os
import math

device = "cuda" if torch.cuda.is_available() else "cpu"
birefnet = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True)
birefnet.to(device)

def make_dimensions_multiple_of_32(image):
    """Resize image to the nearest multiple of 32 while maintaining aspect ratio."""
    width, height = image.size

    new_width = math.ceil(width / 32) * 32
    new_height = math.ceil(height / 32) * 32

    # Add padding instead of resizing (to avoid distortion)
    padded_image = Image.new("RGBA", (new_width, new_height), (0, 0, 0, 0))
    padded_image.paste(image, (0, 0))  # Align top-left

    return padded_image, (width, height)

transform_image = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

def process_image(image_path):
    image = Image.open(image_path).convert("RGBA")
    padded_image, original_size = make_dimensions_multiple_of_32(image)

    # Optimize large tensor processing
    with torch.no_grad():
        input_images = transform_image(padded_image.convert("RGB")).unsqueeze(0).to(device)
        preds = birefnet(input_images)[-1].sigmoid().cpu()

    pred = preds[0].squeeze()
    pred_pil = transforms.ToPILImage()(pred).resize(padded_image.size).convert("L")
    padded_image.putalpha(pred_pil)

    # Crop back to original size
    processed_image = padded_image.crop((0, 0, original_size[0], original_size[1]))

    processed_path = os.path.join("static/processed", os.path.basename(image_path))
    processed_image.save(processed_path, format="PNG", quality=100)

    return processed_path
