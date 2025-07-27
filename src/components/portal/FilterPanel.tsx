import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FilterPanel({ filters, onFiltersChange }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Category</Label>
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="computer_vision">Computer Vision</SelectItem>
                <SelectItem value="natural_language">Natural Language</SelectItem>
                <SelectItem value="time_series">Time Series</SelectItem>
                <SelectItem value="structured_data">Structured Data</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="reinforcement_learning">Reinforcement Learning</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Dataset Size</Label>
            <Select value={filters.size} onValueChange={(value) => handleFilterChange('size', value)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Any Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Size</SelectItem>
                <SelectItem value="small">Small (&lt; 100MB)</SelectItem>
                <SelectItem value="medium">Medium (100MB - 1GB)</SelectItem>
                <SelectItem value="large">Large (&gt; 1GB)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Minimum Rating</Label>
            <Select value={filters.rating} onValueChange={(value) => handleFilterChange('rating', value)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Any Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Rating</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="3">3+ Stars</SelectItem>
                <SelectItem value="2">2+ Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 