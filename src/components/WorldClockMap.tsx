import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

export function WorldClockMap() {
  interface City {
    name: string;
    timezone: string;
    lat: number;
    lng: number;
  }

  const [time, setTime] = useState<Date>(new Date());
  const [isRunning, setIsRunning] = useState(true);

  const cities: City[] = [
    { name: 'London', timezone: 'Europe/London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', timezone: 'Europe/Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Dubai', timezone: 'Asia/Dubai', lat: 25.2048, lng: 55.2708 },
    { name: 'Tokyo', timezone: 'Asia/Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'Sydney', timezone: 'Australia/Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'New York', timezone: 'America/New_York', lat: 40.7128, lng: -74.006 },
    { name: 'Los Angeles', timezone: 'America/Los_Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'Toronto', timezone: 'America/Toronto', lat: 43.6532, lng: -79.3832 },
    { name: 'São Paulo', timezone: 'America/Sao_Paulo', lat: -23.5505, lng: -46.6333 },
    { name: 'Moscow', timezone: 'Europe/Moscow', lat: 55.7558, lng: 37.6173 },
    { name: 'Hong Kong', timezone: 'Asia/Hong_Kong', lat: 22.3193, lng: 114.1694 },
    { name: 'Singapore', timezone: 'Asia/Singapore', lat: 1.3521, lng: 103.8198 },
  ];

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const getTimeInCity = (timezone: string): string => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return formatter.format(time);
    } catch {
      return '--:--:--';
    }
  };

  const getDateInCity = (timezone: string): string => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
      });
      return formatter.format(time);
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 py-8 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Clock className="h-8 w-8 text-blue-600" />
          World Clock Map
        </h1>
        <p className="text-gray-600">Current time across major cities worldwide</p>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => setIsRunning(!isRunning)}
          variant={isRunning ? 'default' : 'outline'}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTime(new Date());
            setIsRunning(true);
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Cities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cities.map((city) => (
          <Card key={city.name} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{city.name}</CardTitle>
              <CardDescription className="text-xs">{city.timezone}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="font-mono text-2xl font-bold">{getTimeInCity(city.timezone)}</div>
              <div className="text-sm text-gray-600">{getDateInCity(city.timezone)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>Cities plotted by latitude and longitude</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-video bg-blue-50 rounded-lg border-2 border-blue-200 overflow-hidden">
            {/* Simplified world map background */}
            <svg
              viewBox="0 0 1000 600"
              className="absolute inset-0 w-full h-full opacity-10"
            >
              <rect width="1000" height="600" fill="#e0f2fe" />
              {/* Equator line */}
              <line x1="0" y1="300" x2="1000" y2="300" stroke="#0284c7" strokeWidth="1" />
              {/* Prime Meridian */}
              <line x1="500" y1="0" x2="500" y2="600" stroke="#0284c7" strokeWidth="1" />
            </svg>

            {/* City markers */}
            {cities.map((city) => {
              // Normalize coordinates to SVG space (0-1000, 0-600)
              const x = ((city.lng + 180) / 360) * 1000;
              const y = ((90 - city.lat) / 180) * 600;

              return (
                <div
                  key={city.name}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${(x / 1000) * 100}%`, top: `${(y / 600) * 100}%` }}
                >
                  {/* Marker dot */}
                  <div className="relative">
                    <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-md" />
                    <div className="absolute animate-pulse w-3 h-3 bg-blue-400 rounded-full" />
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                    <div className="font-semibold">{city.name}</div>
                    <div className="text-gray-300">{getTimeInCity(city.timezone)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            • <strong>View Times:</strong> See the current time in 12 major cities across the globe
          </p>
          <p>
            • <strong>Pause/Resume:</strong> Use the buttons above to pause or resume the clock
          </p>
          <p>
            • <strong>Hover Map:</strong> Hover over the city markers on the map to see detailed
            information
          </p>
          <p>
            • <strong>Automatic Updates:</strong> The clock updates every second with accurate
            timezone information
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
