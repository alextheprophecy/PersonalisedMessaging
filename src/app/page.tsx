"use client"
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star } from 'lucide-react';

interface House {
  id: number;
  url: string;
  content: string;
  scraped_at: string;
  liked: boolean;
  status: string;
}

interface ParsedContent {
  miete_per_monat: string;
  adresse: string;
  [key: string]: unknown;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [houses, setHouses] = useState<House[]>([]);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const glossRef = useRef<HTMLDivElement>(null);

  const fetchHouses = useCallback(async () => {
    try {
      const res = await fetch('/api/houses');
      if (res.ok) {
        const data = await res.json();
        setHouses(data);
      } else {
        console.error('Failed to fetch houses');
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
    }
  }, []);

  useEffect(() => {
    fetchHouses();
    const intervalId = setInterval(fetchHouses, 5000); // poll every 5s
    return () => clearInterval(intervalId);
  }, [fetchHouses]);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!containerRef.current || !glossRef.current) return;

    const { clientX: x, clientY: y } = e;
    const { innerWidth: width, innerHeight: height } = window;
    
    const rotateX = ((y / height) - 0.5) * -25;
    const rotateY = ((x / width) - 0.5) * 25;
    
    containerRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;

    const { width: panelWidth, height: panelHeight } = containerRef.current.getBoundingClientRect();
    const glossX = (x - containerRef.current.offsetLeft) - (panelWidth / 2) + (rotateY * 12);
    const glossY = (y - containerRef.current.offsetTop) - (panelHeight / 2) - (rotateX * 12);

    glossRef.current.style.background = `radial-gradient(circle at ${glossX}px ${glossY}px, rgba(255, 255, 255, 0.2), transparent 50%)`;
  };

  const handleMouseLeave = () => {
    if (!containerRef.current || !glossRef.current) return;
    containerRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    glossRef.current.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 60%)';
  };

  const handleScrape = async () => {
    if (!url) return;

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        console.error('Failed to start scraping');
      }
      // Immediately refresh list to show the new "loading" entry
      await fetchHouses();
      setUrl('');
    } catch (err) {
      console.error('Error initiating scrape:', err);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScrape();
    }
  };

  const handleHouseClick = (e: MouseEvent<HTMLDivElement>, houseUrl: string) => {
    if ((e.target as HTMLElement).closest('.like-button')) {
        e.stopPropagation();
        return;
      }
    router.push(`/scraping?url=${encodeURIComponent(houseUrl)}`);
  };

  const handleLike = async (id: number, liked: boolean) => {
    try {
      const res = await fetch(`/api/houses/${id}/like`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: !liked }),
      });

      if (res.ok) {
        await fetchHouses();
      } else {
        console.error('Failed to update like status');
      }
    } catch (error) {
      console.error('Error updating like status:', error);
    }
  };

  const parseHouseContent = (content: string): ParsedContent | null => {
    try {
      const parsed = JSON.parse(content);
      return {
        ...parsed,
        miete_per_monat: parsed['miete_/_monat'],
      };
    } catch (error) {
      console.error("Failed to parse house content:", error);
      return null;
    }
  };

  return (
    <main 
      className="relative flex flex-col items-center justify-between min-h-screen w-full bg-black overflow-hidden p-4"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.1] z-0"></div>
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <div className="flex-grow flex items-center justify-center w-full">
        <div 
          ref={containerRef}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative z-10 w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 transition-transform duration-300 ease-out"
        >
          <div 
            ref={glossRef}
            className="absolute inset-0 rounded-2xl pointer-events-none transition-background"
            style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 60%)' }} 
          />
          <div className="relative flex flex-col items-center justify-center p-8 space-y-8">
              <div className="text-center">
                <h1 className="text-5xl font-bold text-white tracking-wider">
                  WG-Zimmer Scraper
                </h1>
              </div>

              <div className="flex w-full max-w-lg items-center space-x-2">
                <Input
                  type="url"
                  placeholder="https://wgzimmer.ch"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-grow bg-white/10 border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-white/40 rounded-lg"
                />
                <Button onClick={handleScrape} className="bg-white/20 text-white hover:bg-white/30 rounded-lg">
                  Scrape
                </Button>
              </div>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-5xl mx-auto p-4 perspective-1000">
        <h2 className="text-2xl font-semibold text-white mb-4 text-center">Previously Scraped</h2>
        <div className="relative h-96 overflow-y-auto" style={{transformStyle: 'preserve-3d'}}>
          {houses.map((house) => {
            const isLoading = house.status === 'loading';
            const content = parseHouseContent(house.content);

            return (
              <div
                key={house.id}
                onClick={(e) => handleHouseClick(e, house.url)}
                className="w-full h-24 bg-white/5 p-4 rounded-lg cursor-pointer border border-white/10 mb-4 transition-transform duration-300 ease-out hover:bg-white/10 flex justify-between items-center"
              >
                <div className="flex-grow">
                    <h3 className="text-white font-semibold truncate">{isLoading ? 'Loading…' : `${content?.miete_per_monat ?? ''} - ${content?.adresse ?? ''}`}</h3>
                    <p className="text-xs text-white/50">{new Date(house.scraped_at).toLocaleDateString()}</p>
                </div>
                <button
                  className="like-button p-2 rounded-full hover:bg-white/20 transition-colors"
                  onClick={() => handleLike(house.id, house.liked)}
                >
                  <Star className={`w-5 h-5 ${house.liked ? 'text-yellow-400 fill-current' : 'text-white/50'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
