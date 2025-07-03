"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bot, GitCommit } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { formatDistanceToNow } from 'date-fns';

export default function TasksPage() {
  const { tasks, repositories } = useAppContext();

  const getRepoName = (repoId: string) => {
    return repositories.find(r => r.id === repoId)?.name || 'Unknown Repo';
  };

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Tasks</h2>
          <p className="text-muted-foreground">
            A log of all code modifications performed by the AI.
          </p>
        </div>
      </div>
      <Card className="mt-6">
        <CardContent className="pt-6">
        {tasks.length > 0 ? (
          <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {tasks.map((task) => (
                  <TableRow key={task.id}>
                      <TableCell className="font-medium flex items-center gap-2 max-w-sm truncate"><Bot className="w-4 h-4 text-muted-foreground flex-shrink-0" /> <span className="truncate" title={task.prompt}>{task.prompt}</span></TableCell>
                      <TableCell><div className="flex items-center gap-2"><GitCommit className="w-4 h-4 text-muted-foreground"/> {getRepoName(task.repositoryId)}</div></TableCell>
                      <TableCell>
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>{task.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</TableCell>
                  </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="w-16 h-16 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">No AI tasks yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Perform an AI-driven code change in the Debugger to see it here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
