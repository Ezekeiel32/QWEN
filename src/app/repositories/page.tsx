"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Code, Eye, Trash2, Github } from "lucide-react";
import { ImportRepositoryDialog } from '@/components/dialogs/ImportRepositoryDialog';
import type { Repository } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link';
import { useAppContext } from '@/contexts/AppContext';

export default function RepositoriesPage() {
  const [isImporting, setIsImporting] = useState(false);
  const { repositories, addRepository, removeRepository } = useAppContext();

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Repositories</h2>
          <p className="text-muted-foreground">
            Manage your imported code repositories.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsImporting(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Import Repository
          </Button>
        </div>
      </div>
      <Card className="mt-6">
        <CardContent className="pt-6">
          {repositories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Language</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Imported At</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repositories.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                         <Github className="h-4 w-4 text-muted-foreground"/>
                         <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{repo.name}</a>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{repo.language || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={repo.status === 'imported' ? 'default' : 'secondary'}>
                        {repo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(repo.importedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/debugger?repoId=${repo.id}`}>
                                <Eye className="mr-2 h-4 w-4"/>
                                View & Debug
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => removeRepository(repo.id)} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Github className="w-16 h-16 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">No repositories found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Import your first GitHub repository to get started.
              </p>
               <Button onClick={() => setIsImporting(true)} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Import Repository
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <ImportRepositoryDialog
        isOpen={isImporting}
        onClose={() => setIsImporting(false)}
        onRepoImported={addRepository}
      />
    </>
  );
}
