import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Play, Settings, Zap, Brain, Download, Upload, Rocket, Target, GitMerge, Cpu, Code, Eye, Lightbulb, X, CheckCircle, ArrowRight, Database, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { InvokeLLM, UploadFile } from "@/integrations/Core";
import CodeModal from "./CodeModal";
import DatasetCard from "./DatasetCard";

const taskCategories = [
  {
    group: "Computer Vision",
    tasks: [
      { label: "Image Classification", value: "image_classification" },
      { label: "Image Generation", value: "image_generation" },
      { label: "Image Segmentation", value: "image_segmentation" },
      { label: "Object Detection", value: "object_detection" },
      { label: "Face Recognition", value: "face_recognition" },
      { label: "Style Transfer", value: "style_transfer" },
      { label: "Super Resolution", value: "super_resolution" },
      { label: "Pose Estimation", value: "pose_estimation" },
      { label: "Gesture Recognition", value: "gesture_recognition" },
      { label: "OCR (Text Recognition)", value: "ocr" },
      { label: "Document Analysis", value: "document_analysis" },
    ],
  },
  {
    group: "Natural Language Processing",
    tasks: [
      { label: "Text Classification", value: "text_classification" },
      { label: "Text Generation", value: "text_generation" },
      { label: "Language Translation", value: "language_translation" },
      { label: "Sentiment Analysis", value: "sentiment_analysis" },
      { label: "Named Entity Recognition", value: "ner" },
      { label: "Question Answering", value: "question_answering" },
      { label: "Text Summarization", value: "text_summarization" },
      { label: "Chatbot/Conversational AI", value: "chatbot" },
    ],
  },
  {
    group: "Audio & Speech",
    tasks: [
      { label: "Speech Recognition", value: "speech_recognition" },
      { label: "Speech Synthesis (TTS)", value: "speech_synthesis" },
      { label: "Music Generation", value: "music_generation" },
      { label: "Audio Classification", value: "audio_classification" },
      { label: "Sound Enhancement", value: "sound_enhancement" },
    ],
  },
  {
    group: "Video & Motion",
    tasks: [
      { label: "Video Classification", value: "video_classification" },
      { label: "Video Generation", value: "video_generation" },
      { label: "Deepfake Detection", value: "deepfake_detection" },
    ],
  },
  {
    group: "Data Science & Analytics",
    tasks: [
      { label: "Time Series Forecasting", value: "time_series_forecasting" },
      { label: "Anomaly Detection", value: "anomaly_detection" },
      { label: "Recommendation System", value: "recommendation_system" },
      { label: "Tabular Classification", value: "tabular_classification" },
      { label: "Tabular Regression", value: "tabular_regression" },
      { label: "Clustering", value: "clustering" },
      { label: "Financial Prediction", value: "financial_prediction" },
      { label: "Fraud Detection", value: "fraud_detection" },
    ],
  },
  {
    group: "Advanced AI",
    tasks: [
      { label: "Reinforcement Learning", value: "reinforcement_learning" },
      { label: "Game AI", value: "game_ai" },
      { label: "Autonomous Driving", value: "autonomous_driving" },
      { label: "Medical Diagnosis", value: "medical_diagnosis" },
      { label: "Drug Discovery", value: "drug_discovery" },
    ],
  },
];

interface AIAdvisorProps {
  onClose: () => void;
}

interface ProjectData {
  goal: string;
  taskTypes: string[];
  selectedDatasets: any[];
  dataStrategies: string[];
  customDataFile: any;
  dataSynthesisPrompt: string;
  numClasses: string;
  accuracyTarget: string;
  textStyle: string;
  imageResolution: string;
  objectSize: string;
  realTimeRequirement: string;
  audioLength: string;
  dataFormat: string;
  modelStrategy: string;
  mergeModelSuggestion: string;
  computeChoice: string;
  productionScale: string;
}

async function createProject(project: any) {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return await res.json();
}

export default function AIAdvisor({ onClose }: AIAdvisorProps) {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData>({
    goal: "",
    taskTypes: [],
    selectedDatasets: [],
    dataStrategies: [],
    customDataFile: null,
    dataSynthesisPrompt: "",
    numClasses: "",
    accuracyTarget: "",
    textStyle: "",
    imageResolution: "",
    objectSize: "",
    realTimeRequirement: "",
    audioLength: "",
    dataFormat: "",
    modelStrategy: "scratch",
    mergeModelSuggestion: "",
    computeChoice: "cloud",
    productionScale: "1"
  });
  const [aiSuggestedDatasets, setAiSuggestedDatasets] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [finalTrainingParams, setFinalTrainingParams] = useState({});
  const [zpeTrainingCode, setZpeTrainingCode] = useState("");
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [datasetSearchLoading, setDatasetSearchLoading] = useState(false);
  const [datasetSearchError, setDatasetSearchError] = useState("");

  const steps = [
    { title: "Goal", icon: Target },
    { title: "Task", icon: Zap },
    { title: "Datasets", icon: Download },
    { title: "Custom Data", icon: Upload },
    { title: "Task Specifics", icon: Settings },
    { title: "Model Strategy", icon: GitMerge },
    { title: "Compute & Scale", icon: Cpu },
    { title: "AI Review", icon: Brain },
    { title: "AI Blueprint", icon: Code }
  ];

  const handleTaskToggle = (taskValue: string) => {
    setProjectData(pd => {
      const newTasks = pd.taskTypes.includes(taskValue)
        ? pd.taskTypes.filter(t => t !== taskValue)
        : [...pd.taskTypes, taskValue];
      return { ...pd, taskTypes: newTasks };
    });
  };

  const handleDataStrategyToggle = (strategy: string) => {
    setProjectData(pd => {
      const newStrategies = pd.dataStrategies.includes(strategy)
        ? pd.dataStrategies.filter(s => s !== strategy)
        : [...pd.dataStrategies, strategy];
      return { ...pd, dataStrategies: newStrategies };
    });
  };

  const handleDatasetSelect = (datasetToToggle: any) => {
    setProjectData(currentData => {
      const isAlreadySelected = currentData.selectedDatasets.some(
        d => d.identifier === datasetToToggle.identifier
      );

      const updatedSelectedDatasets = isAlreadySelected
        ? currentData.selectedDatasets.filter(d => d.identifier !== datasetToToggle.identifier)
        : [...currentData.selectedDatasets, datasetToToggle];

      return {
        ...currentData,
        selectedDatasets: updatedSelectedDatasets,
      };
    });
  };

  const fetchDatasetsFromAPI = async () => {
    setDatasetSearchLoading(true);
    setDatasetSearchError("");
    try {
      const res = await fetch("/api/datasets/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: projectData.goal, tasks: projectData.taskTypes })
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setAiSuggestedDatasets(data.datasets || []);
    } catch (err) {
      setDatasetSearchError("Failed to fetch datasets. Try again later.");
      setAiSuggestedDatasets([]);
    }
    setDatasetSearchLoading(false);
  };

  const handleGetFinalRecommendations = async () => {
    setIsLoading(true);
    let modelMergePrompt = "";
    if (projectData.modelStrategy === 'merge') {
        const mergeSuggestions = await InvokeLLM({
            prompt: `Based on the project goal "${projectData.goal}" and task types "${projectData.taskTypes.join(', ')}", suggest the best single open-source model from HuggingFace to use as a base for fine-tuning. Provide only the model identifier (e.g., 'bert-base-uncased').`
        });
        modelMergePrompt = `The user wants to merge with a base model. The suggested model is: ${mergeSuggestions}. Consider this in your architecture recommendation.`;
        setProjectData(pd => ({...pd, mergeModelSuggestion: mergeSuggestions}));
    }

    const response = await InvokeLLM({
      prompt: `You are THE worlds' absolute expert at ML/AI Engineering. You are currently working for me and you are in my no-code,
       ML/AI building platform called ZPE.
       You are a part of a series of advisors that guide the user through the process of building their ML/AI project, 
       that form a sequence called HS-QNN (Hilbert Space Quantum Neural Network). The user has provided the following project requirements. 
       Your task is to generate the FULL BLUEPRINT of every detail of the AI building process and load the suggested configurations, datasets,
       zpe parameters, and other parameters, and all other necessary variables including the model architecture, training parameters, and zpe pytorch code.
       You are the wolds best pytorch engineer and you are also an expert in the field of pytorch.
       You are also an expert in the field of pytorch lightning and you are also an expert in the field of pytorch geometric.
       You are also an expert in the field of pytorch vision and you are also an expert in the field of pytorch audio.
       You are also an expert in the field of pytorch text and you are also an expert in the field of pytorch video.
       You are also an expert in the field of pytorch data and you are also an expert in the field of pytorch metrics.
       You are also an expert in the field of pytorch optimizers and you are also an expert in the field of pytorch loss functions.
       You are also an expert in the field of pytorch metrics and you are also an expert in the field of pytorch data.
       You are also an expert in the field of Quantum Computing and Quantum Machine Learning. 
       You are also an expert in the field of Neural Networks and Deep Learning.
       You are also an expert in the field of Computer Vision and Natural Language Processing.
       You are also an expert in the field of Audio and Speech Processing.
       You are also an expert in the field of Video and Motion Processing.
       You are also an expert in the field of Data Science and Analytics.
       You are also an expert in the field of Advanced AI.
       You are also an expert in the field of Reinforcement Learning and Game AI.
       You are also an expert in the field of Autonomous Driving and Medical Diagnosis.
       You are also an expert in the field of Drug Discovery and Financial Prediction.
       You are also an expert in the field of Fraud Detection and Anomaly Detection.
       You are also an expert in the field of Recommendation System and Tabular Classification.
       You are also an expert in the field of Tabular Regression and Clustering.
       You are also an expert in the field of Financial Prediction and Fraud Detection.
       You are also an expert in the field of Anomaly Detection and Recommendation System.
       You are also an expert in the field of Tabular Classification and Tabular Regression.
       You are also an expert in the field of Clustering and Financial Prediction.
       You are also an expert in the field of Fraud Detection and Anomaly Detection.
       You are also an expert in the field of Recommendation System and Tabular Classification.
       You are also an expert in the field of Tabular Regression and Clustering.
       You are also an expert in the field of Financial Prediction and Fraud Detection.
       You are also an expert in the field of Anomaly Detection and Recommendation System.
       You are also an expert in the field of Tabular Classification and Tabular Regression.
       You are also an expert in the field of Clustering and Financial Prediction.
       You are also an expert in the field of Fraud Detection and Anomaly Detection.
       You are also an expert in the field of batch size detection and batch size optimization.
       You are also an expert in the field of learning rate detection and learning rate optimization.
       You are also an expert in the field of optimizer detection and optimizer optimization.
       You are also an expert in the field of loss function detection and loss function optimization.
       You are also an expert in the field of metric detection and metric optimization.
       You are also an expert in the field of data augmentation detection and data augmentation optimization.
       You are also an expert in the field of data preprocessing detection and data preprocessing optimization.
       You are also an expert Quantum Physicist.
       You are also an expert in Sacred Geometry.
       You are also an expert in the field of Quantum Entanglement.
       You are also an expert in the field of Quantum Computing.
       You are also an expert in the field of Kabbalah.
       You are also an expert in the field of the Tree of Life.
       You are also an expert in the field of the Sefer Yetzirah.
       You are also an expert in the field of Quantum Physics.
       You are also an expert in the field of Quantum Mechanics.
       You are also an expert in the field of Quantum Field Theory.
       You are also an expert in the field of the ZPE platform.
       You are also an expert in the field of Task Recognition from the user's project goal and task types and data.
       You are also an expert in the field of Data Synthesis from the user's project goal and task types and data.
       You are also an expert in the field of Data Preprocessing from the user's project goal and task types and data.
       You are also an expert in the field of Data Augmentation from the user's project goal and task types and data.
       You are also an expert in the field of Data Loading from the user's project goal and task types and data.
       You are also an expert in the field of Data Validation from the user's project goal and task types and data.
       You are also an expert in the field of Data Metrics from the user's project goal and task types and data.
       You are also an expert in the field of Data Visualization from the user's project goal and task types and data.
       You are also an expert in the field of Data Analysis from the user's project goal and task types and data.
       You are also an expert in the field of Data Mining from the user's project goal and task types and data.
       You will make sure that the blueprint is provided in a JSON that fits with the training monitor.
       - Project Goal: ${projectData.goal}
      - Task Types: ${projectData.taskTypes.join(', ')}
      - Selected Datasets: ${projectData.selectedDatasets.map(d => d.name).join(', ')}
      - Task Specifics: Number of classes: ${projectData.numClasses || 'N/A'}, Text Style: ${projectData.textStyle || 'N/A'}, Object Size: ${projectData.objectSize || 'N/A'}, Image Resolution: ${projectData.imageResolution || 'N/A'}, Audio Length: ${projectData.audioLength || 'N/A'}, Data Format: ${projectData.dataFormat || 'N/A'}, Real-time: ${projectData.realTimeRequirement || 'N/A'}, Accuracy Target: ${projectData.accuracyTarget || 'N/A'}
      - Production Scale: ${projectData.productionScale} users.
      - Custom Data Strategies: ${projectData.dataStrategies.join(', ') || 'None'}
      - Custom Data File: ${projectData.customDataFile ? 'Provided' : 'Not provided'}
      - Data Synthesis Prompt: ${projectData.dataSynthesisPrompt || 'None'}
      - Model Strategy: ${projectData.modelStrategy}. ${modelMergePrompt}
      - Compute: ${projectData.computeChoice}

      Based on this, provide:
      1. A final recommended model architecture (e.g., "ZPE-Enhanced ResNet-18").
      2. A complete set of ZPE-specific training parameters.
      3. A recommended GPU for training (e.g., 'NVIDIA T4', 'NVIDIA A100').
      `,
      response_json_schema: {
        type: "object",
        properties: {
          architecture: {
            type: "object",
            properties: {
              recommended: { type: "string" },
              reasoning: { type: "string" }
            }
          },
          training_parameters: {
            type: "object",
            properties: {
              total_epochs: { type: "number" },
              batch_size: { type: "number" },
              learning_rate: { type: "number" },
              dropout_fc: { type: "number" },
              zpe_regularization_strength: { type: "number" },
              quantum_circuit_size: { type: "number" },
              quantum_mode: { type: "boolean" }
            }
          },
          gpu_recommendation: { type: "string" }
        }
      }
    });

    setRecommendations(response);
    setFinalTrainingParams(response.training_parameters);
    setIsLoading(false);
    setStep(s => s + 1);
  };

  const handleGenerateCodeAndBlueprint = async () => {
    setIsLoading(true);
    
    const zpeTemplate = `# ZPE-Enhanced PyTorch Training Script                                                                                                                        import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, Subset
from torch.optim.lr_scheduler import CosineAnnealingLR
import numpy as np

# ZPEDeepNet Definition
class ZPEDeepNet(nn.Module):
    def __init__(self, output_size=10, sequence_length=10):
        super(ZPEDeepNet, self).__init__()
        self.sequence_length = sequence_length
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.zpe_flows = [torch.ones(sequence_length, device=self.device) for _ in range(6)]

        self.conv1 = nn.Sequential(
            nn.Conv2d(1, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.conv4 = nn.Sequential(
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 2048),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(2048, 512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, output_size)
        )
        self.shortcut1 = nn.Sequential(
            nn.Conv2d(1, 64, kernel_size=1, stride=1, padding=0),
            nn.MaxPool2d(2)
        )
        self.shortcut2 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=1, stride=1, padding=0),
            nn.MaxPool2d(2)
        )
        self.shortcut3 = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=1, stride=1, padding=0),
            nn.MaxPool2d(2)
        )
        self.shortcut4 = nn.Sequential(
            nn.Conv2d(256, 512, kernel_size=1, stride=1, padding=0),
            nn.MaxPool2d(2)
        )

    def perturb_zpe_flow(self, data, zpe_idx, feature_size):
        batch_mean = torch.mean(data.detach(), dim=0).view(-1)
        divisible_size = (batch_mean.size(0) // self.sequence_length) * self.sequence_length
        batch_mean_truncated = batch_mean[:divisible_size]
        reshaped = batch_mean_truncated.view(-1, self.sequence_length)
        perturbation = torch.mean(reshaped, dim=0)
        perturbation = torch.tanh(perturbation * 0.3)
        momentum = 0.9 if zpe_idx < 4 else 0.7
        with torch.no_grad():
            self.zpe_flows[zpe_idx] = momentum * self.zpe_flows[zpe_idx] + (1 - momentum) * (1.0 + perturbation)
            self.zpe_flows[zpe_idx] = torch.clamp(self.zpe_flows[zpe_idx], 0.8, 1.2)

    def apply_zpe(self, x, zpe_idx, spatial=True):
        self.perturb_zpe_flow(x, zpe_idx, x.size(1) if spatial else x.size(-1))
        flow = self.zpe_flows[zpe_idx]
        if spatial:
            size = x.size(2) * x.size(3)
            flow_expanded = flow.repeat(size // self.sequence_length + 1)[:size].view(1, 1, x.size(2), x.size(3))
            flow_expanded = flow_expanded.expand(x.size(0), x.size(1), x.size(2), x.size(3))
        else:
            flow_expanded = flow.repeat(x.size(-1) // self.sequence_length + 1)[:x.size(-1)].view(1, -1)
            flow_expanded = flow_expanded.expand(x.size(0), x.size(-1))
        return x * flow_expanded

    def forward(self, x):
        x = self.apply_zpe(x, 0)
        residual = self.shortcut1(x)
        x = self.conv1(x) + residual
        x = self.apply_zpe(x, 1)
        residual = self.shortcut2(x)
        x = self.conv2(x) + residual
        x = self.apply_zpe(x, 2)
        residual = self.shortcut3(x)
        x = self.conv3(x) + residual
        x = self.apply_zpe(x, 3)
        residual = self.shortcut4(x)
        x = self.conv4(x) + residual
        x = self.apply_zpe(x, 4)
        x = self.fc(x)
        x = self.apply_zpe(x, 5, spatial=False)
        return x

    def analyze_zpe_effect(self):
        return [torch.mean(torch.abs(flow - 1.0)).item() for flow in self.zpe_flows]

# Data Setup
train_transform = transforms.Compose([
    transforms.RandomRotation(20),
    transforms.RandomAffine(degrees=0, translate=(0.2, 0.2)),
    transforms.RandomCrop(28, padding=4),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,)),
    transforms.RandomErasing(p=0.5, scale=(0.02, 0.2))
])
test_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

train_dataset = datasets.MNIST(root='./data', train=True, download=True, transform=train_transform)
test_dataset = datasets.MNIST(root='./data', train=False, download=True, transform=test_transform)

train_size = int(0.9 * len(train_dataset))
val_size = len(train_dataset) - train_size
train_subset, val_subset = torch.utils.data.random_split(train_dataset, [train_size, val_size])
train_loader = DataLoader(train_subset, batch_size=32, shuffle=True, num_workers=2)
val_loader = DataLoader(val_subset, batch_size=32, shuffle=False, num_workers=2)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=2)

# MixUp Function
def mixup(data, targets, alpha=1.0):
    indices = torch.randperm(data.size(0))
    shuffled_data = data[indices]
    shuffled_targets = targets[indices]
    lam = np.random.beta(alpha, alpha)
    data = lam * data + (1 - lam) * shuffled_data
    return data, targets, shuffled_targets, lam

# Training Setup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ZPEDeepNet(output_size=10).to(device)
criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
optimizer = optim.Adam(model.parameters(), lr=0.001)
scheduler = CosineAnnealingLR(optimizer, T_max=30)

# Training Loop
num_epochs = 30
for epoch in range(num_epochs):
    model.train()
    total_loss = 0
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        data, target_a, target_b, lam = mixup(data, target)
        optimizer.zero_grad()
        output = model(data)
        loss = lam * criterion(output, target_a) + (1 - lam) * criterion(output, target_b)
        zpe_effects = model.analyze_zpe_effect()
        total_loss = loss + 0.001 * sum(zpe_effects)
        total_loss.backward()
        optimizer.step()
        if batch_idx % 200 == 0:
            print(f'Epoch {epoch+1}/{num_epochs}, Batch {batch_idx}, Loss: {loss.item():.4f}, '
                  f'ZPE Effects: {zpe_effects}')
    scheduler.step()

    # Validation
    model.eval()
    val_correct = 0
    val_total = 0
    with torch.no_grad():
        for data, target in val_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            _, predicted = torch.max(output.data, 1)
            val_total += target.size(0)
            val_correct += (predicted == target).sum().item()
    val_acc = 100 * val_correct / val_total
    print(f'Epoch {epoch+1}/{num_epochs}, Validation Accuracy: {val_acc:.2f}%')

# TTA Function
def tta_predict(model, data, num_augmentations=10):
    model.eval()
    outputs = []
    with torch.no_grad():
        outputs.append(model(data))
        aug_transform = transforms.Compose([
            transforms.RandomRotation(10),
            transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
            transforms.Normalize((0.5,), (0.5,))
        ])
        data_denorm = (data * 0.5) + 0.5
        for _ in range(num_augmentations - 1):
            aug_data = torch.stack([aug_transform(data_denorm[i].cpu()) for i in range(data.size(0))]).to(device)
            output = model(aug_data)
            outputs.append(output)
    return torch.mean(torch.stack(outputs), dim=0)

# Test with TTA
model.eval()
correct = 0
total = 0
with torch.no_grad():
    for data, target in test_loader:
        data, target = data.to(device), target.to(device)
        output = tta_predict(model, data)
        _, predicted = torch.max(output.data, 1)
        total += target.size(0)
        correct += (predicted == target).sum().item()

accuracy = 100 * correct / total
print(f'Accuracy on test set with TTA: {accuracy:.2f}%')

# Save Model
torch.save(model.state_dict(), '/content/zpe_deepnet_colab.pth')                                                                            
                pad_h, pad_w = (h - new_h) // 2, (w - new_w) // 2
                aug_x = torch.nn.functional.pad(aug_x, [pad_w, pad_w, pad_h, pad_h])
            predictions.append(model(aug_x).unsqueeze(0))
        rotations = [5, -5]
        for angle in rotations:
            theta = torch.tensor([[[torch.cos(torch.tensor(angle * np.pi / 180)), torch.sin(torch.tensor(angle * np.pi / 180)), 0],
                                   [-torch.sin(torch.tensor(angle * np.pi / 180)), torch.cos(torch.tensor(angle * np.pi / 180)), 0]]],
                                 dtype=torch.float32, device=x.device)
            theta = theta.repeat(batch_size, 1, 1)
            grid = torch.nn.functional.affine_grid(theta, [batch_size, x.size(1), h, w], align_corners=True)
            aug_x = torch.nn.functional.grid_sample(x, grid, mode='bilinear', align_corners=True)
            predictions.append(model(aug_x).unsqueeze(0))
        flips = [torch.flip(x, [2]), torch.flip(x, [3])]
        for aug_x in flips:
            predictions.append(model(aug_x).unsqueeze(0))
        weights = torch.tensor([1.0] + [0.75] * 9 + [0.9] * 8 + [0.85] * 8 + [0.8] * 2 + [0.7] * 2, device=x.device, dtype=torch.float32)
        weights = weights / weights.sum()
        weighted_preds = torch.cat(predictions, dim=0) * weights.view(-1, 1, 1)
        return torch.sum(weighted_preds, dim=0)

if __name__ == "__main__":
    torch.manual_seed(42)
    np.random.seed(42)
    model = train_zpe_model()


# Dataset loading and transformations would be implemented here
# based on the user's selected datasets and custom data
`;
    
    const response = await InvokeLLM({
      prompt: `Based on the following complete ZPE PyTorch model template and user-defined parameters, generate the final, complete, and runnable PyTorch training script.

**User Configuration & Hyperparameters:**
${JSON.stringify({project: projectData, params: finalTrainingParams}, null, 2)}

**Instructions:**
1. Use the provided ZPE model templates as base
2. Customize the architecture for task types: ${JSON.stringify(projectData.taskTypes)}
3. Include data loading for datasets: ${JSON.stringify(projectData.selectedDatasets.map(d=>d.identifier))}
4. Generate complete training script with ZPE quantum effects
5. Include proper model save/load functionality
6. Add validation and metrics tracking

Generate the complete, production-ready script.`,
    });
    
    setZpeTrainingCode(response);
    setIsLoading(false);
    setStep(s => s + 1);
  };

  const handleStartTraining = async () => {
    const newProject = await createProject({
      name: projectData.goal.substring(0, 50),
      description: projectData.goal,
      goal: projectData.goal,
      task_types: projectData.taskTypes,
      output_format: projectData.dataFormat || '',
      datasets: projectData.selectedDatasets.map(d => d.identifier),
      constraints: [],
      model_config: finalTrainingParams,
      model_id: '',
      status: 'data_prep',
    });
    const encodedParams = btoa(JSON.stringify(finalTrainingParams));
    window.location.href = `/TrainModel?advisorParams=${encodedParams}&projectId=${newProject.id}`;
    onClose();
  };

  const handleNextStep = () => {
    if (step === 1) {
      fetchDatasetsFromAPI();
      setStep(s => s + 1);
      return;
    } else if (step === 6) { // After Compute & Scale step
      handleGetFinalRecommendations();
    } else if (step === 7) { // After AI Review step
      handleGenerateCodeAndBlueprint();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrevStep = () => setStep(s => s - 1);


