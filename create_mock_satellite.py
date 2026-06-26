import cv2
import numpy as np

def create_mock():
    # 512x512 Canvas (Satellite imagery representation)
    # Dark gray background representing terrain/suburbs
    img = np.zeros((512, 512, 3), dtype=np.uint8)
    img[:, :] = [30, 45, 30]  # Forest green terrain base
    
    # Draw roads (bright light gray bands)
    roads = [
        # Horizontal roads
        ((50, 100), (462, 100)),
        ((50, 256), (462, 256)),
        ((50, 412), (462, 412)),
        # Vertical roads
        ((100, 50), (100, 462)),
        ((256, 50), (256, 462)),
        ((412, 50), (412, 462)),
        # Diagonal bypass road
        ((100, 100), (412, 412))
    ]
    
    for pt1, pt2 in roads:
        cv2.line(img, pt1, pt2, (180, 180, 180), 8) # 8px wide road
        
    # Draw tree shadows and occlusions (dark green circles covering intersections)
    occlusions = [
        (256, 256, 25), # Intersection occlusion
        (100, 200, 15), # Road occlusion
        (350, 256, 20),
        (256, 120, 18)
    ]
    
    for x, y, r in occlusions:
        cv2.circle(img, (x, y), r, (15, 35, 15), -1) # Forest canopy covering road
        
    # Add noise to represent satellite pixel variances
    noise = np.random.normal(0, 5, img.shape).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    cv2.imwrite('mock_satellite.png', img)
    print("Generated mock_satellite.png successfully. Upload this file in RoadShield AI dashboard!")

if __name__ == '__main__':
    create_mock()
