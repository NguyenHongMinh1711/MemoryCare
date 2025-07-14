
import React, { useState, useEffect, useCallback } from 'react';
import { LocationInfo, GroundingChunk } from '../types';
import Button from '../components/common/Button';
import { MapPinIcon, HomeIcon, ArrowPathIcon, SpeakerWaveIcon } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import useTextToSpeech from '../hooks/useTextToSpeech';
import { generateTextWithGoogleSearch } from '../services/geminiService';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';

const LocationServicesPage: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [homeLocation, setHomeLocation] = useLocalStorage<LocationInfo | null>('homeLocation', null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState(''); // Corrected syntax here
  const [directions, setDirections] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [isFetchingDirections, setIsFetchingDirections] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const { speak, isSupported: ttsSupported, error: ttsError } = useTextToSpeech();

  const handleFetchLocation = useCallback(() => {
    setIsLoadingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: LocationInfo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(loc);
        setIsLoadingLocation(false);
        setNotification({ message: 'Current location updated.', type: 'success'});
        // Simple check if user is away from home (if home is set)
        if (homeLocation) {
          const distance = calculateDistance(loc, homeLocation);
          if (distance > 0.5) { // Roughly 0.5 km, very simplified
             const message = "You seem to be away from home. Remember to stay safe. If you need help returning, click 'Guide Me Home'.";
             setNotification({ message, type: 'info'});
             if(ttsSupported) speak(message);
          }
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

  const handleSetHome = () => {
    if (currentLocation) {
      setHomeLocation(currentLocation);
      setNotification({ message: 'Home location saved!', type: 'success'});
      if(ttsSupported) speak("Home location has been set.");
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
    const prompt = `Provide simple, step-by-step walking directions from latitude ${currentLocation.latitude}, longitude ${currentLocation.longitude} to latitude ${homeLocation.latitude}, longitude ${homeLocation.longitude}. Focus on major landmarks if possible. Keep it very clear and easy to follow for someone who might be disoriented.`;
    
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

  const handleNotifyFamily = () => {
    // This is a simulation. In a real app, this would trigger a backend service.
    setNotification({ message: 'Simulated: Family has been notified that you are leaving home.', type: 'info'});
    if(ttsSupported) speak("Okay, I've sent a notification to your family that you are leaving.");
  };

  // Simplified distance calculation (Haversine not needed for rough check)
  const calculateDistance = (loc1: LocationInfo, loc2: LocationInfo): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
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
          <p className="text-lg">Home is set to: Lat {homeLocation.latitude.toFixed(5)}, Lon {homeLocation.longitude.toFixed(5)}</p>
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
         <Button onClick={handleNotifyFamily} size="lg" variant="secondary">Notify Family (I'm Leaving)</Button>
      </div>

    </div>
  );
};

export default LocationServicesPage;
