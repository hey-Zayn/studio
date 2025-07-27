'use client';

import { useState } from 'react';
import type { ScrapeResult } from '@/app/actions';
import { useToast } from "@/hooks/use-toast"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Copy, Mail, Phone, User } from 'lucide-react';

interface LeadResultsProps {
  data: ScrapeResult;
}

type CopiedState = {
  [key: string]: boolean;
};

export function LeadResults({ data }: LeadResultsProps) {
  const [copied, setCopied] = useState<CopiedState>({});
  const { toast } = useToast();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [id]: true });
    toast({
        title: "Copied to clipboard!",
        description: text,
    });
    setTimeout(() => {
      setCopied((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }, 2000);
  };

  const copyAll = (items: string[], type: string) => {
    if(items.length === 0) return;
    const textToCopy = items.join('\n');
    navigator.clipboard.writeText(textToCopy);
    toast({
        title: `All ${type}s copied!`,
        description: `${items.length} items copied to clipboard.`,
    });
  }

  const renderTable = (items: string[], type: 'email' | 'phone' | 'name') => {
    if (items.length === 0) {
      return <p className="text-muted-foreground text-center p-8">No {type}s found on this page.</p>;
    }
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
            <Button variant="outline" onClick={() => copyAll(items, type)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy All
            </Button>
        </div>
        <div className="rounded-md border">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>{type.charAt(0).toUpperCase() + type.slice(1)}</TableHead>
                <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, index) => (
                <TableRow key={`${type}-${index}`}>
                    <TableCell className="font-medium">{item}</TableCell>
                    <TableCell className="text-right">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(item, `${type}-${index}`)}
                        aria-label={`Copy ${item}`}
                    >
                        {copied[`${type}-${index}`] ? (
                        <Check className="h-4 w-4 text-green-500" />
                        ) : (
                        <Copy className="h-4 w-4" />
                        )}
                    </Button>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle>Scraping Results</CardTitle>
        <CardDescription>
          Found {data.emails.length} emails, {data.phones.length} phone numbers, and {data.names.length} potential names.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="emails" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emails">
                <Mail className="mr-2 h-4 w-4" />
                Emails ({data.emails.length})
            </TabsTrigger>
            <TabsTrigger value="phones">
                <Phone className="mr-2 h-4 w-4" />
                Phones ({data.phones.length})
            </TabsTrigger>
            <TabsTrigger value="names">
                <User className="mr-2 h-4 w-4" />
                Names ({data.names.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="emails" className="mt-4">
            {renderTable(data.emails, 'email')}
          </TabsContent>
          <TabsContent value="phones" className="mt-4">
            {renderTable(data.phones, 'phone')}
          </TabsContent>
          <TabsContent value="names" className="mt-4">
            {renderTable(data.names, 'name')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
