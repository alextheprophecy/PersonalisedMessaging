"use client"
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import './scraping.css';

export default function ScrapingPage() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError('No URL provided.');
      setLoading(false);
      return;
    }

    const scrapeUrl = async () => {
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
      } catch {
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    scrapeUrl();
  }, [url]);

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-black overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.2] z-0"></div>
      
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <div className="relative flex flex-col items-center justify-center space-y-8">
          {loading && (
            <div className="flex flex-col items-center space-y-4">
              <div className="loader"></div>
              <p className="text-white text-lg">Scraping website...</p>
              <p className="text-white/60 text-sm max-w-md truncate">{url}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 w-full text-center p-4 bg-red-500/30 rounded-lg">
              <p className="text-white">{error}</p>
            </div>
          )}

          {data && (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Scraped Data</h2>
              <pre className="text-left text-sm text-white/80 bg-black/20 p-4 rounded-md overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
