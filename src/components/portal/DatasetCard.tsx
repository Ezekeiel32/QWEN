import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Download, ExternalLink, Heart, Database, Github, Brain } from "lucide-react";
import { motion } from "framer-motion";

const sourceIcons = {
  kaggle: Database,
  huggingface: Brain,
  github: Github,
  custom: Database
};

const categoryColors = {
  computer_vision: "bg-[var(--neon-blue)]/10 text-[var(--neon-blue)] border-[var(--neon-blue)]",
  natural_language: "bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border-[var(--neon-cyan)]",
  time_series: "bg-[var(--soft-purple)]/10 text-[var(--soft-purple)] border-[var(--soft-purple)]",
  structured_data: "bg-[var(--neon-yellow)]/10 text-[var(--neon-yellow)] border-[var(--neon-yellow)]",
  audio: "bg-[var(--neon-orange)]/10 text-[var(--neon-orange)] border-[var(--neon-orange)]",
  reinforcement_learning: "bg-[var(--segment-green)]/10 text-[var(--segment-green)] border-[var(--segment-green)]",
  other: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]"
};

export default function DatasetCard({ dataset, onToggleFavorite, onDownload }) {
  const SourceIcon = sourceIcons[dataset.source] || Database;

  const formatSize = (sizeInMB) => {
    if (!sizeInMB) return "Unknown size";
    if (sizeInMB < 1024) return `${sizeInMB.toFixed(1)} MB`;
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  const getSourceColor = (source) => {
    const colors = {
      kaggle: "text-[var(--neon-blue)] bg-[var(--neon-blue)]/10",
      huggingface: "text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10", 
      github: "text-[var(--text-muted)] bg-[var(--text-muted)]/10",
      custom: "text-[var(--soft-purple)] bg-[var(--soft-purple)]/10"
    };
    return colors[source] || "text-[var(--text-muted)] bg-[var(--text-muted)]/10";
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 0 24px var(--neon-cyan), 0 0 48px var(--neon-blue)' }}
      transition={{ type: "spring", stiffness: 300 }}
      className="neon-card glass neon-border font-mono"
    >
      <Card className="border-0 glass neon-border shadow-neon h-full bg-[var(--bg-glass)]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${getSourceColor(dataset.source)}`}>
                  <SourceIcon className="w-4 h-4" />
                </div>
                <Badge variant="secondary" className="text-xs capitalize neon-border font-mono">
                  {dataset.source}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold text-[var(--text-main)] line-clamp-2 font-mono">
                {dataset.name}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(dataset.id)}
              className="hover:bg-[var(--neon-yellow)]/10 hover:text-[var(--neon-yellow)] neon-btn transition-colors"
            >
              <Heart 
                className={`w-4 h-4 ${
                  dataset.is_favorited 
                    ? 'fill-[var(--neon-yellow)] text-[var(--neon-yellow)]' 
                    : 'text-[var(--text-muted)]'
                }`} 
              />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-[var(--text-muted)] text-sm line-clamp-3 font-mono">
            {dataset.description || "No description available"}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {dataset.category && (
              <Badge 
                variant="secondary" 
                className={`text-xs border font-mono ${categoryColors[dataset.category]}`}
              >
                {dataset.category.replace(/_/g, ' ')}
              </Badge>
            )}
            {dataset.tags?.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs font-mono neon-border">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-sm text-[var(--text-muted)] font-mono">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[var(--neon-yellow)] text-[var(--neon-yellow)]" />
                <span>{dataset.rating?.toFixed(1) || "N/A"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>{dataset.download_count || 0}</span>
              </div>
            </div>
            <div className="text-xs font-medium">
              {formatSize(dataset.size_mb)}
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onDownload(dataset)}
              className="flex-1 btn-neon bg-[var(--neon-cyan)] text-[var(--bg-main)] font-mono shadow-neon hover:bg-[var(--neon-blue)] hover:text-white"
              style={{ boxShadow: '0 0 12px var(--neon-cyan), 0 0 24px var(--neon-blue)' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            {dataset.url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(dataset.url, '_blank')}
                className="hover:bg-[var(--neon-cyan)]/10 neon-btn font-mono"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 