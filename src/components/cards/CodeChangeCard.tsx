"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, GitCompareArrows } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import React from 'react';

interface CodeChangeCardProps {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  onApply: () => void;
}

// A simple diff algorithm to find differences line by line.
// This is a basic implementation for demonstration purposes.
const diffLines = (original: string, modified: string) => {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const N = originalLines.length;
  const M = modifiedLines.length;
  const max = N + M;
  const v: number[] = new Array(2 * max + 1);
  const trace = [];

  v[max + 1] = 0;

  for (let d = 0; d <= max; d++) {
    const newV = [...v];
    for (let k = -d; k <= d; k += 2) {
      const index = max + k;
      let x: number;
      if (k === -d || (k !== d && v[index - 1] < v[index + 1])) {
        x = v[index + 1];
      } else {
        x = v[index - 1] + 1;
      }
      let y = x - k;
      while (x < N && y < M && originalLines[x] === modifiedLines[y]) {
        x++;
        y++;
      }
      newV[index] = x;
      if (x >= N && y >= M) {
        trace.push(newV);
        const result: { value: string; added?: boolean; removed?: boolean }[] = [];
        let px = N, py = M;
        for (let i = trace.length - 1; i >= 0; i--) {
            const pv = trace[i-1] || v;
            const k = px - py;
            const pIndex = max+k;

            let prevX;
            if (k === -d || (k !== d && pv[pIndex - 1] < pv[pIndex + 1])) {
                prevX = pv[pIndex + 1];
            } else {
                prevX = pv[pIndex - 1] + 1;
            }
            const prevY = prevX - k;
            
            while(px > prevX && py > prevY){
                result.unshift({value: originalLines[px - 1]});
                px--;
                py--;
            }
            if(i > 0) {
                 if(prevX < px) {
                    result.unshift({value: originalLines[px - 1], removed: true});
                    px--;
                 } else {
                    result.unshift({value: modifiedLines[py - 1], added: true});
                    py--;
                 }
            }
        }
        return result;
      }
    }
    trace.push(newV);
    v.splice(0, v.length, ...newV);
  }
  return [];
};


const UnifiedDiffViewer = ({ original, modified }: { original: string, modified: string }) => {
  const [diffResult, setDiffResult] = React.useState<any[]>([]);

  React.useEffect(() => {
    // This is computationally expensive, so memoize it.
    const changes = diffLines(original, modified);
    setDiffResult(changes);
  }, [original, modified]);


  if (diffResult.length === 0 && original === modified) {
     return (
        <pre className="diff-container">
          <code className="diff">
            {original.split('\n').map((line, index) => (
              <div key={index} className="diff-line diff-line-unchanged">
                <span className="diff-line-number text-center"> </span>
                <span className="diff-line-content">{line}</span>
              </div>
            ))}
          </code>
        </pre>
     )
  }

  return (
    <pre className="diff-container">
      <code className="diff">
        {diffResult.map((part, index) => {
          const colorClass = part.added ? 'diff-line-added' : part.removed ? 'diff-line-removed' : 'diff-line-unchanged';
          const symbol = part.added ? '+' : part.removed ? '-' : ' ';
          return (
            <div key={index} className={`diff-line ${colorClass}`}>
              <span className="diff-line-number text-center">{symbol}</span>
              <span className="diff-line-content">{part.value}</span>
            </div>
          );
        })}
      </code>
    </pre>
  );
};


export function CodeChangeCard({ filePath, originalCode, modifiedCode, onApply }: CodeChangeCardProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(modifiedCode);
    toast({ title: "Copied to clipboard!" });
  };
  
  const handleDownload = () => {
    const blob = new Blob([modifiedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "File downloaded!" });
  };

  return (
    <Card className="mt-4 bg-background/50 border border-border/50 shadow-inner">
      <CardHeader className="p-4">
        <CardTitle className="text-base flex items-center gap-2"><GitCompareArrows className="w-5 h-5"/>Suggested Change</CardTitle>
        <CardDescription>{filePath}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
           <UnifiedDiffViewer original={originalCode} modified={modifiedCode} />
        </ScrollArea>
      </CardContent>
      <CardFooter className="justify-end gap-2 p-2 bg-muted/30">
        <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="mr-2 h-3 w-3" /> Copy</Button>
        <Button variant="outline" size="sm" onClick={handleDownload}><Download className="mr-2 h-3 w-3" /> Download</Button>
        <Button size="sm" onClick={onApply}><Check className="mr-2 h-3 w-3" /> Apply Change</Button>
      </CardFooter>
    </Card>
  );
}
