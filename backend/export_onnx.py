import torch
import torch.nn as nn
from torchvision import models
import os

class MuzzleFeatureExtractor(nn.Module):
    def __init__(self):
        super(MuzzleFeatureExtractor, self).__init__()
        resnet = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        # Remove average pooling & fully connected layer to keep spatial pooling output (2048-dim)
        self.backbone = nn.Sequential(*list(resnet.children())[:-1])
        self.backbone.eval()
    
    def forward(self, x):
        features = self.backbone(x)
        if features.dim() > 2:
            features = features.view(features.size(0), -1)
        return features

def main():
    model = MuzzleFeatureExtractor()
    model.eval()
    
    dummy_input = torch.randn(1, 3, 224, 224)
    onnx_path = os.path.join(os.path.dirname(__file__), "resnet50_features.onnx")
    
    print(f"Exporting ResNet-50 feature extractor to {onnx_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print("ONNX model exported successfully!")
    print(f"Model file size: {os.path.getsize(onnx_path) / (1024*1024):.2f} MB")

if __name__ == '__main__':
    main()
