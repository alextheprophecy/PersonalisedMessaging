"use client"
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Trash2, CheckCircle2, MapPin, Clock } from 'lucide-react';
import HousesMap from '@/components/HousesMap';
import './scraping.css';

interface HouseData {
  adresse?: string;
  "miete_/_monat"?: string;
  price?: string;
  ort?: string;
  kreis_quartier?: string;
  region?: string;
  ab_dem?: string;
  availableFrom?: string;
  bis?: string;
  "in_der_nähe"?: string;
  description?: string;
  seeking?: string;
  we_are?: string;
  features?: string[];
  [key: string]: unknown;
}

interface House {
  id: number;
  url: string;
  content: string;
  scraped_at: string;
  liked: boolean;
  status: string;
  done: boolean;
  walking_time: string | null;
  transit_time: string | null;
  cycling_time: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function ScrapingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const [data, setData] = useState<HouseData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [houseId, setHouseId] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [done, setDone] = useState(false);
  const [calculatingTransport, setCalculatingTransport] = useState(false);
  const [houseWithTransport, setHouseWithTransport] = useState<House | null>(null);
  // Function to fetch all houses
  const fetchAllHouses = async () => {
    try {
      const response = await fetch('/api/houses');
      if (response.ok) {
        const houses = await response.json();
        return houses;
      }
      return [];
    } catch (err) {
      console.error('Error fetching houses:', err);
      return [];
    }
  };

  // Set up a polling interval to refresh houses regularly
  useEffect(() => {
    // Initial fetch
    fetchAllHouses();
    
    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchAllHouses();
    }, 10000); // Refresh every 10 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  useEffect(() => {
    if (!url) {
      setError('No URL provided.');
      setLoading(false);
      return;
    }

    const fetchHouseData = async () => {
      try {
        // First, try to fetch the house from the database
        const houses = await fetchAllHouses();
        const house = houses.find((h: House) => h.url === url);
          
        if (house) {
          setData(JSON.parse(house.content));
          setHouseId(house.id);
          setLiked(house.liked);
          setDone(house.done);
          setHouseWithTransport(house); // Store the full house data including transport times
          setLoading(false);
          return;
        }
        
        // If not found, scrape it
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
          
          // After scraping, fetch the house again to get the ID and transport data
          const updatedHouses = await fetchAllHouses();
          const updatedHouse = updatedHouses.find((h: House) => h.url === url);
          if (updatedHouse) {
            setHouseId(updatedHouse.id);
            setLiked(updatedHouse.liked);
            setDone(updatedHouse.done);
            setHouseWithTransport(updatedHouse);
            console.log('House loaded with transport data:', updatedHouse);
          }
        } else {
          setError(result.error || 'An error occurred.');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHouseData();
  }, [url]);

  const handleLike = async () => {
    if (houseId === null) return;
    
    try {
      const res = await fetch(`/api/houses/${houseId}/like`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: !liked }),
      });

      if (res.ok) {
        setLiked(!liked);
      } else {
        console.error('Failed to update like status');
      }
    } catch (error) {
      console.error('Error updating like status:', error);
    }
  };

  const handleDelete = async () => {
    if (houseId === null) return;
    
    if (!confirm('Are you sure you want to delete this house?')) {
      return;
    }

    try {
      const res = await fetch(`/api/houses/${houseId}/delete`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/');
      } else {
        console.error('Failed to delete house');
      }
    } catch (error) {
      console.error('Error deleting house:', error);
    }
  };
  
  const handleDone = async () => {
    if (houseId === null) return;
    
    try {
      const res = await fetch(`/api/houses/${houseId}/done`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !done }),
      });

      if (res.ok) {
        setDone(!done);
        // Refresh all houses to update the dropdown
        await fetchAllHouses();
      } else {
        console.error('Failed to update done status');
      }
    } catch (error) {
      console.error('Error updating done status:', error);
    }
  };

  const calculateTransportTime = async () => {
    if (!houseId || !data?.adresse || calculatingTransport) return;
    
    setCalculatingTransport(true);
    try {
      console.log('Starting transport calculation for:', {
        houseId,
        address: data.adresse
      });
      
      // Check if address exists
      if (!data.adresse) {
        alert('No address found in house data. Cannot calculate transport times.');
        return;
      }

      // First, check debug info
      const debugResponse = await fetch('/api/debug');
      if (debugResponse.ok) {
        const debugInfo = await debugResponse.json();
        console.log('API Debug info:', debugInfo);
      }

      const response = await fetch('/api/transport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          houseId,
          address: data.adresse,
          ort: data.ort
        }),
      });
      
      console.log('Transport API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Transport calculation completed:', result);
        
        // Update the house data with transport times
        const updatedHouses = await fetchAllHouses();
        const updatedHouse = updatedHouses.find((h: House) => h.id === houseId);
        if (updatedHouse) {
          setHouseWithTransport(updatedHouse);
          console.log('Updated house with transport data:', updatedHouse);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to calculate transport times:', response.status, errorText);
        alert(`Failed to calculate transport times: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error calculating transport times:', error);
      alert(`Error calculating transport times: ${error}`);
    } finally {
      setCalculatingTransport(false);
    }
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-black overflow-hidden p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.2] z-0"></div>
      
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <div className="flex justify-between items-center absolute top-4 left-4 right-4">
          <Button 
            onClick={() => router.back()}
            className="bg-white/20 text-white hover:bg-white/30 rounded-lg"
          >
            &larr; Back
          </Button>
          
          {houseId !== null && (
            <div className="flex space-x-2">
              <button
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                onClick={handleDone}
                disabled={loading}
                title={done ? "Mark as not done" : "Mark as done"}
              >
                <CheckCircle2 className={`w-5 h-5 ${done ? 'text-green-400 fill-current' : 'text-white/50 hover:text-green-400'}`} />
              </button>
              <button
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                onClick={handleLike}
                disabled={loading}
              >
                <Star className={`w-5 h-5 ${liked ? 'text-yellow-400 fill-current' : 'text-white/50'}`} />
              </button>
              <button
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="w-5 h-5 text-white/50 hover:text-red-400" />
              </button>
            </div>
          )}
        </div>
        <div className="relative flex flex-col items-center justify-center space-y-8 mt-16">
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
              <div className="bg-white/10 rounded-lg p-6 text-white">
                <div className="flex flex-wrap justify-between items-start mb-6 border-b border-white/20 pb-4">
                  <div className="mb-2 md:mb-0">
                    <p className="text-3xl font-bold text-green-400">{data["miete_/_monat"] || data.price || 'Price not available'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-medium">
                      {data.adresse || ''} {data.ort && data.adresse && ', '}{data.ort || ''}
                      {data.kreis_quartier && <span className="text-white/70 text-base"> (District {data.kreis_quartier})</span>}
                    </p>
                    {data.region && <p className="text-white/70">{data.region}</p>}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-white/70 text-sm">Available From</p>
                    <p className="mt-1 text-base font-semibold text-red-300">{data.ab_dem || data.availableFrom || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <p className="text-white/70 text-sm">Available Until</p>
                    <p className="mt-1  text-base font-semibold text-red-300">{data.bis || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <p className="text-white/70 text-sm">Nearby</p>
                    <p>{data.in_der_nähe || 'Not specified'}</p>
                  </div>
                </div>
                
                {(data.description || data.seeking) && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-white/90 mb-1">Description</h3>
                    <p className="text-white/80 whitespace-pre-line">{data.description || data.seeking}</p>
                  </div>
                )}
                
                {data.we_are && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-white/90 mb-1">About the Flatmates</h3>
                    <p className="text-white/80 whitespace-pre-line">{data.we_are}</p>
                  </div>
                )}
                
                {data.features && data.features.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-white/90 mb-1">Features</h3>
                    <ul className="list-disc pl-5 text-white/80">
                      {data.features.map((feature: string, index: number) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t border-white/20">
                  <details className="cursor-pointer mb-6">
                    <summary className="text-white/60 hover:text-white/80">Show Raw Data</summary>
                    <pre className="mt-2 text-left text-xs text-white/60 bg-black/30 p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </details>
                </div>

                {/* Transport and Map Section */}
                {data?.adresse && (
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <h3 className="text-xl font-semibold text-white/90 mb-4">Transport to ETH Zurich</h3>
                    
                    {/* Transport Controls */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      {/* Only show calculate button if transport data is missing */}
                      {!(houseWithTransport?.walking_time || houseWithTransport?.transit_time || houseWithTransport?.cycling_time) && (
                        <Button 
                          onClick={calculateTransportTime}
                          disabled={calculatingTransport}
                          className="bg-blue-500/20 text-white hover:bg-blue-500/30 rounded-lg flex items-center space-x-2"
                        >
                          <Clock className="w-4 h-4" />
                          <span>{calculatingTransport ? 'Calculating...' : 'Calculate Transport Times'}</span>
                        </Button>
                      )}
                      
                      {/* Show recalculate button if transport data exists */}
                      {(houseWithTransport?.walking_time || houseWithTransport?.transit_time || houseWithTransport?.cycling_time) && (
                        <Button 
                          onClick={calculateTransportTime}
                          disabled={calculatingTransport}
                          className="bg-yellow-500/20 text-white hover:bg-yellow-500/30 rounded-lg flex items-center space-x-2"
                        >
                          <Clock className="w-4 h-4" />
                          <span>{calculatingTransport ? 'Recalculating...' : 'Recalculate Transport'}</span>
                        </Button>
                      )}
                      
                    </div>

                    {/* Transport Times Display */}
                    {houseWithTransport && (houseWithTransport.walking_time || houseWithTransport.transit_time || houseWithTransport.cycling_time) ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {houseWithTransport.walking_time && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-2xl">🚶</span>
                              <span className="text-white font-semibold">Walking</span>
                            </div>
                            <p className="text-white/80">{houseWithTransport.walking_time}</p>
                          </div>
                        )}
                        
                        {houseWithTransport.transit_time && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-2xl">🚌</span>
                              <span className="text-white font-semibold">Public Transport</span>
                            </div>
                            <p className="text-white/80">{houseWithTransport.transit_time}</p>
                          </div>
                        )}
                        
                        {houseWithTransport.cycling_time && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-2xl">🚴</span>
                              <span className="text-white font-semibold">Cycling</span>
                            </div>
                            <p className="text-white/80">{houseWithTransport.cycling_time}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-lg p-4 mb-4">
                        <p className="text-white/70 text-sm">
                          {calculatingTransport 
                            ? "Calculating transport times..." 
                            : "Transport times will be calculated automatically during scraping, or click the button above to calculate now."
                          }
                        </p>
                      </div>
                    )}

                    {/* Map Section */}
                    <div className="mt-4">
                      <HousesMap 
                        houses={houseWithTransport && houseWithTransport.latitude && houseWithTransport.longitude ? [houseWithTransport] : []} 
                        apiKey={typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'your_google_maps_api_key_here') : 'your_google_maps_api_key_here'}
                      />
                    </div>
                  

                    {/* Address Info */}
                    <div className="mt-4 p-3 bg-white/5 rounded-lg">
                      <p className="text-white/70 text-sm">Address: {data.adresse}</p>
                      <p className="text-white/70 text-sm">Destination: ETH Zurich Main Building (Rämistrasse 101, 8006 Zürich)</p>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
