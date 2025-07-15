
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { locationAPI } from '../lib/api/location';
import type { Database } from '../lib/database.types';
import { GroundingChunk } from '../types';
import Button from '../components/common/Button';
import { MapPinIcon, HomeIcon, ArrowPathIcon, SpeakerWaveIcon } from '../constants';
import useTextToSpeech from '../hooks/useTextToSpeech';
import { generateTextWithGoogleSearch } from '../services/geminiService';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';

type LocationLog = Database['public']['Tables']['location_logs']['Row']
type SafeZone = Database['public']['Tables']['safe_zones']['Row']

interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
}

const LocationServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [homeLocation, setHomeLocation] = useState<SafeZone | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState('');
  const [directions, setDirections] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [isFetchingDirections, setIsFetchingDirections] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const { speak, isSupported: ttsSupported, error: ttsError } = useTextToSpeech();

  // Load home location on component mount
  React.useEffect(() => {
    if (user) {
      loadHomeLocation();
    }
  }, [user]);

  const loadHomeLocation = async () => {
    try {
      const home = await locationAPI.getHomeSafeZone();
      setHomeLocation(home);
    } catch (error) {
      console.error('Error loading home location:', error);
    }
  };

  const handleFetchLocation = useCallback(() => {
    setIsLoadingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc: LocationInfo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(loc);
        
        try {
          // Log location to database
          await locationAPI.logLocation(loc.latitude, loc.longitude, position.coords.accuracy);
          setNotification({ message: 'Current location updated.', type: 'success'});
          
          // Check if user is away from home (if home is set)
          if (homeLocation) {
            const distance = locationAPI.calculateDistance(
              loc.latitude, 
              loc.longitude, 
              homeLocation.center_latitude, 
              homeLocation.center_longitude
            );
            if (distance > homeLocation.radius_meters) {
               const message = "You seem to be away from home. Remember to stay safe. If you need help returning, click 'Guide Me Home'.";
               setNotification({ message, type: 'info'});
               if(ttsSupported) speak(message);
            }
          }
        } catch (error) {
          console.error('Error logging location:', error);
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (geoError) => {
        setError(`Error getting location: ${geoError.message}`);
        setIsLoadingLocation(false);
        setNotification({ message: `Error getting location: ${geoError.message}`, type: 'error'});
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [homeLocation, speak, ttsSupported, setNotification]); // Added setNotification to deps

  useEffect(() => {
    handleFetchLocation(); // Fetch location on component mount
  }, [handleFetchLocation]);

  const handleSetHome = async () => {
    if (currentLocation) {
      try {
        const newHome = await locationAPI.createSafeZone(
          'Home',
          currentLocation.latitude,
          currentLocation.longitude,
          100, // 100 meter radius
          true  // is home
        );
        setHomeLocation(newHome);
        setNotification({ message: 'Home location saved!', type: 'success'});
        if(ttsSupported) speak("Home location has been set.");
      } catch (error) {
        console.error('Error setting home location:', error);
        setNotification({ message: 'Error setting home location', type: 'error'});
      }
    } else {
      setNotification({ message: 'Could not set home location. Current location unknown.', type: 'error'});
    }
  };

  const handleGuideHome = async () => {
    if (!currentLocation) {
      setNotification({ message: 'Cannot guide home, current location unknown. Try refreshing location.', type: 'error'});
      return;
    }
    if (!homeLocation) {
      setNotification({ message: 'Home location is not set. Please set it first.', type: 'info'});
      return;
    }
    setIsFetchingDirections(true);
    setDirections(null);
    setSources([]);
    const prompt = `Provide simple, step-by-step walking directions from latitude ${currentLocation.latitude}, longitude ${currentLocation.longitude} to latitude ${homeLocation.center_latitude}, longitude ${homeLocation.center_longitude}. Focus on major landmarks if possible. Keep it very clear and easy to follow for someone who might be disoriented.`;
    
    try {
      const {text: resultText, sources: resultSources} = await generateTextWithGoogleSearch(prompt);
      setDirections(resultText);
      setSources(resultSources);
      if(ttsSupported) speak(`Here are directions home: ${resultText}`);
    } catch (apiError) {
      setDirections("Sorry, I couldn't get directions home at this time.");
      if(ttsSupported) speak("Sorry, I couldn't get directions home at this time.");
    } finally {
      setIsFetchingDirections(false);
    }
  };

  const handleGuideToDestination = async () => {
    if (!currentLocation) {
      setNotification({ message: 'Cannot guide, current location unknown. Try refreshing location.', type: 'error'});
      return;
    }
    if (!destination.trim()) {
      setNotification({ message: 'Please enter a destination.', type: 'info'});
      return;
    }
    setIsFetchingDirections(true);
    setDirections(null);
    setSources([]);
    const prompt = `Provide simple, step-by-step walking directions from my current location (around latitude ${currentLocation.latitude}, longitude ${currentLocation.longitude}) to "${destination}". Focus on major landmarks if possible. Keep it very clear and easy to follow for someone who might be disoriented.`;
    
    try {
      const {text: resultText, sources: resultSources} = await generateTextWithGoogleSearch(prompt);
      setDirections(resultText);
      setSources(resultSources);
      if(ttsSupported) speak(`Here are directions to ${destination}: ${resultText}`);
    } catch (apiError) {
      setDirections(`Sorry, I couldn't get directions to ${destination} at this time.`);
      if(ttsSupported) speak(`Sorry, I couldn't get directions to ${destination} at this time.`);
    } finally {
      setIsFetchingDirections(false);
    }
  };

  const handleNotifyFamily = async () => {
    // This is a simulation. In a real app, this would trigger a backend service.
    try {
      if (currentLocation) {
        await locationAPI.sendLocationUpdate(currentLocation.latitude, currentLocation.longitude);
        setNotification({ message: 'Family has been notified of your current location.', type: 'info'});
        if(ttsSupported) speak("Okay, I've sent a notification to your family with your current location.");
      }
    } catch (error) {
      console.error('Error notifying family:', error);
      setNotification({ message: 'Error sending notification', type: 'error'});
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn">
      <PageHeader title="Location Services" subtitle="Stay safe and find your way." icon={<MapPinIcon className="w-10 h-10" />} />

      {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {ttsError && <NotificationBanner message={`Text-to-speech error: ${ttsError}`} type="error" onDismiss={() => {}} />}


      <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h3 className="text-2xl font-semibold text-sky-700">Current Location</h3>
        {isLoadingLocation && <p className="text-slate-500 text-lg">Finding your location...</p>}
        {currentLocation && (
          <div className="text-lg">
            <p>Latitude: <span className="font-medium text-sky-600">{currentLocation.latitude.toFixed(5)}</span></p>
            <p>Longitude: <span className="font-medium text-sky-600">{currentLocation.longitude.toFixed(5)}</span></p>
          </div>
        )}
        <Button onClick={handleFetchLocation} isLoading={isLoadingLocation} leftIcon={<ArrowPathIcon className="w-6 h-6"/>} size="lg">Refresh Location</Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h3 className="text-2xl font-semibold text-sky-700">Home Settings</h3>
        {homeLocation ? (
          <p className="text-lg">Home is set to: Lat {homeLocation.center_latitude.toFixed(5)}, Lon {homeLocation.center_longitude.toFixed(5)}</p>
        ) : (
          <p className="text-slate-500 text-lg">Home location not set. Go to your home and click "Set Current Location as Home".</p>
        )}
        <Button onClick={handleSetHome} disabled={!currentLocation || isLoadingLocation} leftIcon={<HomeIcon className="w-6 h-6"/>} size="lg">Set Current Location as Home</Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h3 className="text-2xl font-semibold text-sky-700">Navigation Help</h3>
        <Button onClick={handleGuideHome} disabled={!homeLocation || !currentLocation || isLoadingLocation || isFetchingDirections} isLoading={isFetchingDirections && !destination} leftIcon={<HomeIcon className="w-6 h-6"/>} size="xl" variant="primary">Guide Me Home</Button>
        
        <div className="pt-4 space-y-3">
            <label htmlFor="destinationInput" className="block text-lg font-medium text-slate-700">Where do you want to go?</label>
            <input 
                type="text" 
                id="destinationInput" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g., Post Office, Doctor's Clinic"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg"
                aria-label="Destination input"
            />
            <Button onClick={handleGuideToDestination} disabled={!currentLocation || isLoadingLocation || isFetchingDirections || !destination.trim()} isLoading={isFetchingDirections && !!destination} leftIcon={<MapPinIcon className="w-6 h-6"/>} size="lg" variant="secondary">Guide to Destination</Button>
        </div>

        {isFetchingDirections && <p className="text-slate-500 text-lg">Getting directions...</p>}
        {directions && (
          <div className="mt-6 p-4 bg-sky-50 rounded-lg">
            <h4 className="text-xl font-semibold text-sky-700 mb-2">Directions:</h4>
            <p className="text-slate-700 whitespace-pre-line text-lg">{directions}</p>
            <Button onClick={() => {if(ttsSupported) speak(directions)}} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-5 h-5"/>} className="mt-2">Read Directions</Button>
            {sources && sources.length > 0 && (
              <div className="mt-4">
                <h5 className="text-md font-semibold text-slate-600">Information Sources:</h5>
                <ul className="list-disc list-inside text-sm text-slate-500">
                  {sources.map((source, index) => source.web && (
                    <li key={index}><a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{source.web.title || source.web.uri}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg">
         <h3 className="text-2xl font-semibold text-sky-700 mb-4">Safety Actions</h3>
         <Button onClick={handleNotifyFamily} size="lg" variant="secondary">Notify Family (Current Location)</Button>
      </div>

    </div>
  );
};

export default LocationServicesPage;
