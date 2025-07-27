import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function RecommendationCard({ recommendation, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white/70 rounded-xl p-4 hover:bg-white transition-all duration-300 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{recommendation.name}</h3>
          <p className="text-gray-600 text-sm mb-2">{recommendation.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Badge variant="outline" className="text-xs">
              {recommendation.category}
            </Badge>
            <span>•</span>
            <span>{recommendation.reason}</span>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
} 