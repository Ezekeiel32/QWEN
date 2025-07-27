// src/types/entities.ts
import type { TrainingParameters as FullTrainingParameters } from './training'; // Import the detailed one

export interface ModelConfig {
  id?: string | null; // Allow null to match FastAPI
  name: string;
  // For frontend display & creation, use the more detailed TrainingParameters
  // This might differ from FastAPI's strict TrainingParameters if FastAPI doesn't handle couplingParams
  parameters: FullTrainingParameters; 
  date_created: string; // ISO date string e.g., "YYYY-MM-DD"
  accuracy: number;
  loss: number; // Added based on FastAPI ModelConfig
  use_quantum_noise: boolean; // Added based on FastAPI ModelConfig (maps to quantumMode in TrainingParameters)
  
  // These were in the original frontend ModelConfig, ensure they map correctly or are handled
  channel_sizes?: number[]; // May be part of model architecture rather than training params
  zpe_momentum?: number[]; // These are inside parameters object now
  zpe_strength?: number[]; // These are inside parameters object now
  zpe_noise?: number[]; // These are inside parameters object now
  zpe_coupling?: number[]; // These are inside parameters object now
}


export interface PerformanceMetric {
  id?: string;
  config_id?: string; // ID of the associated model configuration
  epoch: number;
  training_loss?: number;
  validation_accuracy?: number; 
  training_accuracy?: number; 
  validation_loss?: number; 
  zpe_effects: number[];
  avg_zpe_effect?: number; 
  timestamp: string; // ISO date-time string
  date?: string; 
}

export interface QuantumNoiseSample {
  id?: string;
  sample_id: string;
  values: number[];
  mean: number;
  std: number;
  num_qubits: number;
  timestamp: string; // ISO date-time string
}

export interface InvokeLLMOptions {
  prompt: string;
  response_json_schema?: any; 
}

export type InvokeLLMResponse = {
  explanation?: string;
  performance_assessment?: string;
  quantum_insights?: string;
  optimization_recommendations?: Array<{
    title: string;
    description: string;
    priority: string;
    expected_impact: string;
    suggested_parameters?: Partial<FullTrainingParameters>; 
  }>;
  attention_areas?: string[];
  response?: string;
  suggestions?: string[];
  follow_up_questions?: string[];
  [key: string]: any; 
};

export async function InvokeLLM(options: InvokeLLMOptions): Promise<InvokeLLMResponse> {
  console.warn("InvokeLLM is a placeholder and not implemented. Returning mock data based on prompt content.");
  
  if (options.prompt.includes("Explain in about 150 words how quantum fluctuations")) {
    return { 
      explanation: "Quantum fluctuations, derived from zero-point energy (ZPE) in quantum field theory, represent the lowest possible energy state of a quantum mechanical system. When applied to neural networks, these microscopic quantum effects could create non-deterministic perturbations in network weights. This quantum noise might help escape local minima during training by inducing small, random weight adjustments. The theoretical advantage comes from quantum superposition, allowing the network to probabilistically explore multiple parameter configurations simultaneously. By carefully calibrating the quantum coupling strength, these fluctuations could enhance generalization by preventing overfitting to training data. This approach combines quantum mechanical principles with classical neural computation, potentially offering advantages in specific learning scenarios where controlled randomness benefits optimization."
    };
  }
  if (options.prompt.includes("Analyze this ZPE quantum neural network performance data")) {
     return {
        performance_assessment: "Overall performance is strong with promising accuracy. Quantum configurations show potential but require further tuning.",
        quantum_insights: "Quantum noise seems to enhance exploration, leading to slightly higher peak accuracies in some configurations but can also introduce instability if not well-calibrated with ZPE parameters.",
        optimization_recommendations: [
          { title: "Refine ZPE Strength for Quantum Models", description: "Experiment with slightly lower ZPE strength values (e.g., 0.2-0.4 range) in layers where quantum noise is active to potentially improve stability.", priority: "High", expected_impact: "Potential +0.2% accuracy", suggested_parameters: null },
          { title: "Increase Epochs for Complex Configs", description: "For models with high ZPE coupling and quantum noise, consider increasing total epochs by 10-20% to allow for more thorough convergence.", priority: "Medium", expected_impact: "May unlock higher accuracy", suggested_parameters: { totalEpochs: 50 } },
          { title: "Explore Asymmetric ZPE Momentum", description: "Try a non-uniformly decreasing ZPE momentum profile, perhaps with slightly higher momentum in later layers.", priority: "Low", expected_impact: "Exploratory, potential for new optima", suggested_parameters: { momentumParams: [0.9, 0.85, 0.82, 0.80, 0.78, 0.75] } }
        ],
        attention_areas: ["Overfitting in some non-quantum models with high ZPE strength.", "Computational cost of quantum noise generation."]
      };
  }
  if(options.prompt.toLowerCase().includes("what is zpe?")){
     return {
        response: "Zero-Point Energy (ZPE) is the lowest possible energy that a quantum mechanical system may have, even at absolute zero temperature! Think of it as the universe's subtle background hum. In ZPE neural networks, we conceptualize harnessing these quantum fluctuations, perhaps via novel encoding methods, to introduce beneficial randomness and adaptive behaviors, potentially leading to more robust and efficient AI models. It's like giving the network a touch of quantum intuition!",
        suggestions: ["How is ZPE applied in this platform's models?", "What are the benefits of ZPE in AI?"],
        follow_up_questions: ["Can ZPE help with model generalization?", "Is ZPE related to quantum noise?"]
     };
  }
  if(options.prompt.includes("User Question:") || options.prompt.toLowerCase().includes("how can i") || options.prompt.toLowerCase().includes("what should i do")){
     return {
        response: "Thank you for your question! Based on current best practices, when exploring ZPE parameters, consider starting with moderate strength and high momentum for initial layers, gradually adjusting based on validation performance. If using quantum noise, a smaller learning rate might be beneficial to stabilize training. Keep an eye on the ZPE effects per layer in the monitor!",
        suggestions: ["Try incrementally increasing ZPE strength for layer 3.", "If validation accuracy plateaus, consider reducing learning rate or adjusting weight decay."],
        follow_up_questions: ["What's the impact of coupling parameters?", "How do I balance ZPE effects with model stability?"]
     };
  }
  return { response: "I'm learning to answer that! For now, I can say that ZPE concepts are fascinating in AI." };
}
