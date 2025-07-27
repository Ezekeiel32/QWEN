import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mic } from "lucide-react";
import { motion } from "framer-motion";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        onSearch(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="glass neon-border font-mono"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute inset-0 neon-border rounded-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none"></div>
          <div className="relative glass rounded-2xl shadow-lg border border-[var(--neon-cyan)] p-2 flex items-center">
            <Search className="w-5 h-5 text-[var(--neon-cyan)] ml-4" />
            <Input
              type="text"
              placeholder="Search datasets, models, or describe your project goals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent text-lg py-4 px-4 focus:ring-2 focus:ring-[var(--neon-cyan)] focus:outline-none placeholder:text-[var(--text-muted)] font-mono text-[var(--text-main)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <div className="flex items-center gap-2 mr-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVoiceSearch}
                className={`rounded-lg neon-btn transition-all duration-200 ${
                  isListening ? 'bg-[var(--neon-yellow)] text-[var(--neon-orange)]' : 'hover:bg-[var(--neon-cyan)]/10'
                }`}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
              </Button>
              <Button
                type="submit"
                className="btn-neon rounded-lg px-6 py-2 font-semibold bg-[var(--neon-blue)] text-white shadow-neon hover:bg-[var(--neon-cyan)] transition-all duration-200"
                style={{ boxShadow: '0 0 12px var(--neon-cyan), 0 0 24px var(--neon-blue)' }}
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
} 