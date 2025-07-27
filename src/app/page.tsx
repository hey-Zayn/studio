'use client';

import { useState, useTransition } from 'react';
import { Search, Bot, FileWarning } from 'lucide-react';
import type { ScrapeResult } from './actions';
import { scrapeUrl, ScrapeRequest } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LeadResults } from '@/components/LeadResults';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState('');
  const [deepScan, setDeepScan] = useState(false);
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ total: 0, completed: 0, currentUrl: '' });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    setProgress({ total: 0, completed: 0, currentUrl: '' });
    
    if (!url) {
      setError("Please enter a URL.");
      return;
    }

    startTransition(async () => {
      let allResults: ScrapeResult = { emails: [], phones: [], names: [] };
      const visitedUrls = new Set<string>();
      const urlsToVisit: string[] = [url];
      visitedUrls.add(url);
      
      let completedCount = 0;
      
      const startTime = Date.now();

      while (urlsToVisit.length > 0) {
        const currentUrl = urlsToVisit.shift()!;
        if (!currentUrl) continue;
        
        completedCount++;
        setProgress({ 
            total: visitedUrls.size, 
            completed: completedCount, 
            currentUrl: currentUrl 
        });

        const request: ScrapeRequest = { url: currentUrl, deepScan };
        const response = await scrapeUrl(request, url); // Pass base URL for origin check

        if (response.success && response.data) {
          allResults.emails.push(...(response.data.emails || []));
          allResults.phones.push(...(response.data.phones || []));
          allResults.names.push(...(response.data.names || []));

          if (deepScan && response.data.links) {
            response.data.links.forEach(link => {
              if (!visitedUrls.has(link)) {
                visitedUrls.add(link);
                urlsToVisit.push(link);
              }
            });
          }
        } else if (response.error) {
            // Display first error and stop
            setError(response.error);
            break;
        }

        // De-duplicate results
        allResults = {
            emails: [...new Set(allResults.emails)],
            phones: [...new Set(allResults.phones)],
            names: [...new Set(allResults.names)],
        };

        setResults(allResults);
      }
      
      setProgress(prev => ({ ...prev, completed: visitedUrls.size, currentUrl: 'Done!' }));
    });
  };

  const estimatedTimeRemaining = () => {
    if (progress.completed === 0 || progress.total === 0) return null;

    const elapsedTime = (Date.now() - (progress.startTime || 0)) / 1000; // seconds
    const timePerUrl = elapsedTime / progress.completed;
    const remainingUrls = progress.total - progress.completed;
    const estimatedSeconds = Math.round(remainingUrls * timePerUrl);
    
    if (estimatedSeconds < 0) return null;

    if (estimatedSeconds < 60) return `${estimatedSeconds}s`;
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  return (
    <main className="flex min-h-full w-full items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                <Bot className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight mt-4">
              LeadMiner
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Enter a website URL to extract contact information for lead generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        required
                        className="h-12 text-base"
                        disabled={isPending}
                    />
                    <Button type="submit" className="h-12 text-base px-8 bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPending}>
                        {isPending ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Scraping...
                        </>
                        ) : (
                        <>
                            <Search className="mr-2 h-5 w-5" />
                            Scrape
                        </>
                        )}
                    </Button>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="deep-scan" checked={deepScan} onCheckedChange={(checked) => setDeepScan(Boolean(checked))} disabled={isPending} />
                    <Label htmlFor="deep-scan" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Deep Scan (scans all pages on the domain)
                    </Label>
                </div>
            </form>
          </CardContent>
        </Card>
        
        {isPending && (
            <Card>
                <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">Scanning: {progress.currentUrl}</p>
                    <Progress value={(progress.completed / progress.total) * 100} className="w-full" />
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                        <span>{progress.completed} of {progress.total} pages scanned</span>
                        {estimatedTimeRemaining() && <span>~{estimatedTimeRemaining()} left</span>}
                    </div>
                </CardContent>
            </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <FileWarning className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && <LeadResults data={results} />}

        {!isPending && !results && !error && (
            <Card className="text-center border-dashed">
                <CardContent className="p-10">
                    <h3 className="text-xl font-semibold">Ready to find leads?</h3>
                    <p className="text-muted-foreground mt-2">Enter a URL above and click "Scrape" to begin.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </main>
  );
}
