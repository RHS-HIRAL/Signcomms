import cv2
import os
import numpy as np

def preprocess_image(image, target_size=(128, 128)):
    # Convert PIL image to a NumPy array
    image = np.array(image)

    # Resize the image using OpenCV
    image = cv2.resize(image, target_size)
    
    # Convert to grayscale using OpenCV
    # image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    
    # Normalize the pixel values between 0 and 1
    image = image / 255.0
    
    # Expand dimensions to match the shape (64, 64, 1)
    # image = np.expand_dims(image, axis=-1)
    
    return image

def load_dataset(dataset_path, img_size=(128, 128)):
    from tensorflow.keras.preprocessing.image import load_img, img_to_array
    data = []
    labels = []
    for label_dir in os.listdir(dataset_path):
        label_path = os.path.join(dataset_path, label_dir)
        for img_name in os.listdir(label_path):
            img_path = os.path.join(label_path, img_name)
            img = load_img(img_path, target_size=img_size)  # Load image using keras
            img = preprocess_image(img_to_array(img))  # Preprocess the image
            data.append(img)
            labels.append(label_dir)
            print(f"Loaded image: {img_path}")
    data = np.array(data, dtype='float32')
    labels = np.array(labels)
    return data, labels

if __name__ == "__main__":
    dataset_path = r'dataset'  # Path to the dataset directory
    data, labels = load_dataset(dataset_path)
    print(f"Dataset loaded: {len(data)} samples")
