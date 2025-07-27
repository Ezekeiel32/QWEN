import { config } from 'dotenv';
config();

import '@/ai/flows/quantize-colab-model.ts';
import '@/ai/flows/configure-model-for-dataset.ts';
import '@/ai/flows/hs-qnn-parameter-advisor.ts';