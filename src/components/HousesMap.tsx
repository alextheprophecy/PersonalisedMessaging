"use client"

import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useState } from 'react';

interface House {
  id: number;
  content: string;
  latitude: number | null;
  longitude: number | null;
  walking_time: string | null;
  transit_time: string | null;
  cycling_time: string | null;
  liked: boolean;
  done: boolean;
}

interface ParsedContent {
  miete_per_monat: string;
  adresse: string;
  [key: string]: unknown;
}

interface HousesMapProps {
  houses: House[];
  apiKey: string;
}

// ETH Zurich coordinates
const ETH_LOCATION = {
  lat: 47.3769,
  lng: 8.5417
};

// Zurich center as default map center
const MAP_CENTER = {
  lat: 47.3769,
  lng: 8.5417
};

export default function HousesMap({ houses, apiKey }: HousesMapProps) {
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [showEthInfo, setShowEthInfo] = useState(false);

  const parseHouseContent = (content: string): ParsedContent | null => {
    try {
      const parsed = JSON.parse(content);
      return {
        ...parsed,
        miete_per_monat: parsed['miete_/_monat'] || parsed['miete_per_monat'],
      };
    } catch (error) {
      console.error("Failed to parse house content:", error);
      return null;
    }
  };

  // Filter houses that have coordinates
  const housesWithCoordinates = houses.filter(house => 
    house.latitude !== null && house.longitude !== null
  );

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return (
      <div className="w-full h-96 bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <h3 className="text-lg font-semibold mb-2">Google Maps Not Configured</h3>
          <p className="text-sm text-gray-300">
            Please add your Google Maps API key to the environment variables
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={MAP_CENTER}
          defaultZoom={12}
          mapId="houses-map"
          style={{ width: '100%', height: '100%' }}
          options={{
            styles: [
              {
                elementType: "geometry",
                stylers: [{ color: "#212121" }]
              },
              {
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }]
              },
              {
                elementType: "labels.text.fill",
                stylers: [{ color: "#757575" }]
              },
              {
                elementType: "labels.text.stroke",
                stylers: [{ color: "#212121" }]
              },
              {
                featureType: "administrative",
                elementType: "geometry",
                stylers: [{ color: "#757575" }]
              },
              {
                featureType: "road",
                elementType: "geometry.fill",
                stylers: [{ color: "#2c2c2c" }]
              },
              {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#8a8a8a" }]
              },
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#000000" }]
              },
              {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#3d3d3d" }]
              }
            ]
          }}
        >
          {/* ETH Marker */}
          <AdvancedMarker
            position={ETH_LOCATION}
            onClick={() => setShowEthInfo(true)}
          >
            <Pin background={'#10b981'} borderColor={'#059669'} glyphColor={'#ffffff'}>
              🏫
            </Pin>
          </AdvancedMarker>

          {/* House Markers */}
          {housesWithCoordinates.map((house) => {
            const content = parseHouseContent(house.content);
            const pinColor = house.done ? '#6b7280' : house.liked ? '#f59e0b' : '#3b82f6';
            const borderColor = house.done ? '#4b5563' : house.liked ? '#d97706' : '#2563eb';
            
            return (
              <AdvancedMarker
                key={house.id}
                position={{ lat: house.latitude!, lng: house.longitude! }}
                onClick={() => setSelectedHouse(house)}
              >
                <Pin 
                  background={pinColor} 
                  borderColor={borderColor} 
                  glyphColor={'#ffffff'}
                >
                  🏠
                </Pin>
              </AdvancedMarker>
            );
          })}

          {/* ETH Info Window */}
          {showEthInfo && (
            <InfoWindow
              position={ETH_LOCATION}
              onCloseClick={() => setShowEthInfo(false)}
            >
              <div className="p-2">
                <h3 className="font-bold text-lg text-green-600">ETH Zurich</h3>
                <p className="text-sm text-gray-600">Main Building</p>
                <p className="text-xs text-gray-500">Rämistrasse 101, 8006 Zürich</p>
              </div>
            </InfoWindow>
          )}

          {/* House Info Window */}
          {selectedHouse && (
            <InfoWindow
              position={{ lat: selectedHouse.latitude!, lng: selectedHouse.longitude! }}
              onCloseClick={() => setSelectedHouse(null)}
            >
              <div className="p-3 max-w-xs">
                {(() => {
                  const content = parseHouseContent(selectedHouse.content);
                  return (
                    <>
                      <h3 className="font-bold text-lg mb-2 text-blue-600">
                        {content?.miete_per_monat || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {content?.adresse || 'Address not available'}
                      </p>
                      
                      {/* Transport Times */}
                      <div className="space-y-1 text-xs">
                        <h4 className="font-semibold text-gray-700">Transport to ETH:</h4>
                        
                        {selectedHouse.walking_time && (
                          <div className="flex items-center space-x-1">
                            <span>🚶</span>
                            <span className="text-gray-600">{selectedHouse.walking_time}</span>
                          </div>
                        )}
                        
                        {selectedHouse.transit_time && (
                          <div className="flex items-center space-x-1">
                            <span>🚌</span>
                            <span className="text-gray-600">{selectedHouse.transit_time}</span>
                          </div>
                        )}
                        
                        {selectedHouse.cycling_time && (
                          <div className="flex items-center space-x-1">
                            <span>🚴</span>
                            <span className="text-gray-600">{selectedHouse.cycling_time}</span>
                          </div>
                        )}
                        
                        {!selectedHouse.walking_time && !selectedHouse.transit_time && !selectedHouse.cycling_time && (
                          <p className="text-gray-500 italic">Transport data not calculated</p>
                        )}
                      </div>
                      
                      {/* Status indicators */}
                      <div className="flex items-center space-x-2 mt-2">
                        {selectedHouse.liked && (
                          <span className="text-yellow-500 text-sm">⭐ Liked</span>
                        )}
                        {selectedHouse.done && (
                          <span className="text-green-500 text-sm">✅ Done</span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
