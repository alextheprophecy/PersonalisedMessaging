"use client"
import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();
      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || 'An error occurred.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-black overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.2] z-0"></div>
      
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl p-8 space-y-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white">
            Web Scraper
          </h1>
          <p className="mt-2 text-lg text-white/80">
            Enter a URL to scrape its content.
          </p>
        </div>

        <div className="flex w-full max-w-lg items-center space-x-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-grow bg-white/20 border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 rounded-lg"
          />
          <Button onClick={handleScrape} disabled={loading} className="bg-white/30 text-white hover:bg-white/40 rounded-lg">
            {loading ? 'Scraping...' : 'Scrape'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 w-full text-center p-4 bg-red-500/30 rounded-lg">
            <p className="text-white">{error}</p>
          </div>
        )}

        {data && (
          <div className="mt-4 w-full p-4 bg-black/30 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-2">Scraped Data</h2>
            <pre className="text-left text-sm text-white/80 bg-black/20 p-4 rounded-md overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
