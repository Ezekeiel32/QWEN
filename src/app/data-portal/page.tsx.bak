"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { InvokeLLM } from "@/types/entities";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Sparkles, TrendingUp, Brain, Target, Zap, ArrowRight, Lightbulb } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { adviseForDataset, DatasetAdvisorInput } from "@/ai/flows/dataset-advisor";
import AIAdvisor from "@/components/portal/AIAdvisor";
import DatasetCard from "@/components/portal/DatasetCard";
import FilterPanel from "@/components/portal/FilterPanel";
import RecommendationCard from "@/components/portal/RecommendationCard";
import SearchBar from "@/components/portal/SearchBar";

export default function DataPortalPage() {
  // Discovery logic
  const [datasets, setDatasets] = useState<any[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<any[]>([]);
  const [activeSource, setActiveSource] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ category: "all", size: "all", rating: "all" });
  const [isLoading, setIsLoading] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<any>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<any>({});

  // Form-based logic
  const [source, setSource] = useState("kaggle");
  const [identifier, setIdentifier] = useState("");
  const [destDir, setDestDir] = useState("datasets/");
  const [kaggleUsername, setKaggleUsername] = useState("");
  const [kaggleKey, setKaggleKey] = useState("");
  const [split, setSplit] = useState("train");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [advisorInput, setAdvisorInput] = useState("");
  const [advisorResponse, setAdvisorResponse] = useState("");

  // Advisor state
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [projectGoal, setProjectGoal] = useState("");
  const [currentData, setCurrentData] = useState("");

  useEffect(() => {
    loadDatasets();
    generateAIRecommendations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [datasets, activeSource, searchQuery, filters]);

  const loadDatasets = async () => {
    setIsLoading(true);
    setDatasets([]);
    setIsLoading(false);
  };

  const generateAIRecommendations = async () => {
    setAiLoading(true);
    try {
      const response = await InvokeLLM({
        prompt: `Generate 3 trending dataset recommendations for machine learning projects. Focus on popular, high-quality datasets across different domains like computer vision, NLP, and structured data. For each recommendation, provide: name, brief description, and why it's trending.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  reason: { type: "string" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });
      setAiRecommendations(response.recommendations || []);
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
    }
    setAiLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...datasets];
    if (activeSource !== "all") {
      filtered = filtered.filter(dataset => dataset.source === activeSource);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dataset =>
        dataset.name.toLowerCase().includes(query) ||
        dataset.description?.toLowerCase().includes(query) ||
        dataset.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    if (filters.category !== "all") {
      filtered = filtered.filter(dataset => dataset.category === filters.category);
    }
    if (filters.size !== "all") {
      const sizeRanges: any = {
        small: [0, 100],
        medium: [100, 1000],
        large: [1000, Infinity]
      };
      const [min, max] = sizeRanges[filters.size];
      filtered = filtered.filter(dataset => dataset.size_mb >= min && dataset.size_mb < max);
    }
    if (filters.rating !== "all") {
      const minRating = parseInt(filters.rating);
      filtered = filtered.filter(dataset => dataset.rating >= minRating);
    }
    setFilteredDatasets(filtered);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadDatasets(); // Reset to default if search is cleared
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/datasets/search?query=${encodeURIComponent(query)}`);
      const { results, errors } = await response.json();
      if (errors && errors.length > 0) {
        errors.forEach((err: any) => {
          toast.error(`Error searching ${err.source}: ${err.error}`);
        });
      }
      setDatasets(results);
    } catch (error: any) {
      toast.error(`Search failed: ${error.message}`);
    }
    setIsLoading(false);
  };

  const toggleFavorite = async (datasetId: any) => {
    setDatasets(ds => ds.map(d => d.id === datasetId ? { ...d, is_favorited: !d.is_favorited } : d));
  };

  const handleDirectDownload = async (dataset: any) => {
    let url = '';
    if (dataset.source === 'huggingface') {
      url = `http://192.168.1.151:9001/download-hf?dataset=${encodeURIComponent(dataset.name)}`;
    } else if (dataset.source === 'github') {
      const match = dataset.url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (match) {
        url = `http://192.168.1.151:9001/download-github?repo=${encodeURIComponent(match[1])}`;
      }
    } else if (dataset.source === 'kaggle') {
      const ref = dataset.url.split('/').slice(-2).join('/');
      url = `http://192.168.1.151:9001/download-kaggle?ref=${encodeURIComponent(ref)}`;
    }

    if (!url) {
      toast.error("Could not create download link for this dataset source.");
      return;
    }

    // Use a hidden anchor to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Form-based logic (from your original page) ---
  const handleFormSearch = async () => {
    setSearchResults([
      { name: "Example Dataset 1", id: "example1" },
      { name: "Example Dataset 2", id: "example2" },
    ]);
  };
  const handleAdvisor = async () => {
    setAdvisorResponse("Try 'mnist' for digit recognition, or 'imagenet' for general vision tasks.");
  };
  const handleSelectResult = (result: any) => {
    setIdentifier(result.id || result.name);
    setSearchOpen(false);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const payload: any = { source, identifier, dest_dir: destDir };
    if (source === "kaggle") {
      if (kaggleUsername) payload.kaggle_username = kaggleUsername;
      if (kaggleKey) payload.kaggle_key = kaggleKey;
    }
    if (source === "huggingface") {
      payload.split = split;
    }
    try {
      const res = await fetch("/api/datasets/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setStatus(data.message || JSON.stringify(data));
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  return (
    <>
    <div className="min-h-screen p-6 md:p-8 bg-transparent">
      <div className="max-w-7xl mx-auto">
          {/* --- AI Advisor Modal --- */}
          <AnimatePresence>
            {advisorOpen && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <AIAdvisor onClose={() => setAdvisorOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        {/* --- AI Advisor Panel --- */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Discover <span className="gradient-text">Datasets</span>
              </h1>
              <p className="text-gray-600 text-lg">Find the perfect data for your next AI project</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 hover-lift">
                <Filter className="w-4 h-4" /> Filters
              </Button>
              <Button onClick={generateAIRecommendations} className="flex items-center gap-2 hover-lift bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <Sparkles className="w-4 h-4" /> AI Suggest
              </Button>
              <Button onClick={() => setAdvisorOpen(o => !o)} className="flex items-center gap-2 hover-lift bg-gradient-to-r from-blue-500 to-green-500 text-white">
                <Brain className="w-4 h-4" /> AI Advisor
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <SearchBar value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} />
          <div className="mt-6">
            <Tabs value={activeSource} onValueChange={setActiveSource}>
              <TabsList className="glass-effect border-0 p-1">
                <TabsTrigger value="all" className="data-[state=active]:bg-white/30">All Sources</TabsTrigger>
                <TabsTrigger value="kaggle" className="data-[state=active]:bg-white/30">Kaggle</TabsTrigger>
                <TabsTrigger value="huggingface" className="data-[state=active]:bg-white/30">Hugging Face</TabsTrigger>
                <TabsTrigger value="github" className="data-[state=active]:bg-white/30">GitHub</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                <FilterPanel filters={filters} setFilters={setFilters} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* AI Recommendations */}
        <AnimatePresence>
          {aiLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
              <div className="flex gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse glass-effect border-0">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </Card>
                ))}
              </div>
            </motion.div>
          ) : aiRecommendations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }} className="mb-8">
                {aiRecommendations.map((recommendation, index) => (
                  <RecommendationCard key={index} recommendation={recommendation} />
                ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredDatasets.length} Dataset{filteredDatasets.length !== 1 ? 's' : ''} Found
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" /> Sorted by relevance
            </div>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="glass-effect border-0 animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {filteredDatasets.map((dataset, index) => (
                  <motion.div 
                    key={dataset.url} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }} 
                    transition={{ delay: index * 0.05 }}
                    className={index % 2 !== 0 ? 'blue-coated-card' : ''}
                  >
                    <DatasetCard
                      key={dataset.id || index}
                      dataset={dataset}
                      onFavorite={toggleFavorite}
                      onDirectDownload={handleDirectDownload}
                      downloadStatus={downloadStatus[dataset.name]}
                      onLoadToCloud={handleDirectDownload}
                      cloudStatus={cloudStatus[dataset.name]}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {!isLoading && filteredDatasets.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No datasets found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
              <Button onClick={() => { setSearchQuery(""); setFilters({ category: "all", size: "all", rating: "all" }); setActiveSource("all"); }} variant="outline" className="hover-lift">Clear All Filters</Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
    </>
  );
} 