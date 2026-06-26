import os
import cv2
import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image
from app.models.unet import UNet

class RoadExtractor:
    def __init__(self, model_path: str = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = UNet(in_channels=3, out_channels=1).to(self.device)
        self.model.eval()
        self.has_weights = False
        
        if model_path and os.path.exists(model_path):
            try:
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                self.has_weights = True
            except Exception as e:
                print(f"Error loading model weights: {e}")

        # Transforms for PyTorch
        self.transforms = T.Compose([
            T.Resize((512, 512)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def preprocess_image(self, image_path: str) -> np.ndarray:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image at {image_path}")
        
        # Shadow reduction and contrast enhancement
        # Convert to LAB color space
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel to handle shadows & uneven lighting
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        
        # Merge back
        limg = cv2.merge((cl, a, b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return enhanced

    def extract_roads_cv(self, img: np.ndarray) -> np.ndarray:
        """
        OpenCV fallback/helper for road extraction:
        Detects linear road-like structures, handles occlusions under trees using morphological closure.
        """
        # Convert to gray
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian Blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Detect edges / ridges
        # Roads are typically uniform bands. Bilateral filter preserves edges while smoothing.
        filtered = cv2.bilateralFilter(blurred, 9, 75, 75)
        
        # Adaptive thresholding to capture local structures
        thresh = cv2.adaptiveThreshold(
            filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Morphological operations to link broken segments (occlusions)
        # Using a line-like horizontal and vertical kernels to bridge gaps
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 2))
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 15))
        
        close_h = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel_h)
        close_v = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel_v)
        
        # Combine vertical and horizontal road segments
        combined = cv2.bitwise_or(close_h, close_v)
        
        # Clean small noise
        kernel_clean = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        cleaned = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel_clean)
        
        # Resize to 512x512 to match model output
        cleaned_resized = cv2.resize(cleaned, (512, 512), interpolation=cv2.INTER_NEAREST)
        return cleaned_resized

    def extract(self, image_path: str, output_mask_path: str):
        """
        Main extraction entry point.
        Runs U-Net segmentation, and blends/combines it with CV extraction to maximize road connectivity.
        """
        # Preprocess input image (contrast, shadow removal)
        enhanced = self.preprocess_image(image_path)
        
        # Get CV-based segmentation mask (always works, no PyTorch dependency)
        cv_mask = self.extract_roads_cv(enhanced)
        final_mask = cv_mask
        
        # Try PyTorch U-Net (may fail on some systems due to Pillow/PyTorch compatibility)
        try:
            rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)
            input_tensor = self.transforms(pil_img).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                output = self.model(input_tensor)
                output = torch.sigmoid(output).squeeze(0).squeeze(0).cpu().numpy()
                
            pytorch_mask = (output > 0.5).astype(np.uint8) * 255
            
            if self.has_weights:
                final_mask = cv2.bitwise_or(pytorch_mask, cv_mask)
        except Exception as e:
            print(f"PyTorch model inference skipped (using CV fallback): {e}")
            final_mask = cv_mask
            
        # Save the mask image
        cv2.imwrite(output_mask_path, final_mask)
        return final_mask
