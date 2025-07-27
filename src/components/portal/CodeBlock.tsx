import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CodeBlock({ code, language = "python" }: { code: string; language?: string }) {
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(code).then(() => {
        setHasCopied(true);
        toast({
          title: "Copied to clipboard!",
          description: "The training script is ready to be used.",
        });
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
      }).catch(err => {
        toast({
          variant: "destructive",
          title: "Failed to copy",
          description: "Could not copy to clipboard. Please try again.",
        });
      });
    } else {
      toast({
        variant: "destructive",
        title: "Clipboard API not available",
        description: "Please use a secure (HTTPS) environment to enable clipboard access.",
      });
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg my-4 relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 w-6"
          onClick={copyToClipboard}
        >
          {hasCopied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre>
          <code className={`language-${language} text-sm text-white font-mono`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}