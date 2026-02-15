import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, MapPin, Loader2 } from 'lucide-react';
import LiveMap from './LiveMap';
import axios from 'axios';

const LiveTrackingModal = ({ isOpen, onClose, vehicle }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [fetchingCredentials, setFetchingCredentials] = useState(true);
  const positionHistoryRef = useRef({});
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isOpen && vehicle) {
      fetchCredentials();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, vehicle]);

  const fetchCredentials = async () => {
    try {
      setFetchingCredentials(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:5002/api/tracking-device/credentials/${vehicle._id}/decrypt`,
        {
          headers: { 'x-auth-token': token }
        }
      );

      if (response.data.success) {
        setCredentials(response.data.data);
        // Start fetching positions once credentials are loaded
        fetchPositions(response.data.data);
        intervalRef.current = setInterval(() => fetchPositions(response.data.data), 5000);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
      setError('Failed to load tracking credentials');
      setFetchingCredentials(false);
    }
  };

  const fetchPositions = async (creds) => {
    if (!creds) return;

    try {
      setError(null);
      const API_URL = 'https://demo.traccar.org/api/positions';
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${creds.email}:${creds.password}`),
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update position history for trails
      data.forEach(position => {
        const deviceId = position.deviceId;
        if (!positionHistoryRef.current[deviceId]) {
          positionHistoryRef.current[deviceId] = [];
        }
        
        // Add current position to history
        positionHistoryRef.current[deviceId].push({
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: position.fixTime || Date.now()
        });
        
        // Keep only last 50 positions per device (for trail visualization)
        if (positionHistoryRef.current[deviceId].length > 50) {
          positionHistoryRef.current[deviceId].shift();
        }
      });
      
      setPositions(data);
      setLastUpdate(new Date());
      setLoading(false);
      setFetchingCredentials(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setFetchingCredentials(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const formatSpeed = (speed) => {
    if (!speed) return '0';
    return (speed * 3.6).toFixed(1); // Convert m/s to km/h
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="text-green-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Live GPS Tracking</h2>
              <p className="text-sm text-gray-600">
                {vehicle?.regnNo || vehicle?.registrationNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => credentials && fetchPositions(credentials)}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {fetchingCredentials ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-green-600" size={40} />
                <p className="text-gray-600">Loading tracking data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Error: {error}
            </div>
          ) : loading && positions.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-green-600" size={32} />
                <p className="text-gray-600">Loading positions...</p>
              </div>
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-600 font-medium">No positions found</p>
              <p className="text-gray-500 text-sm mt-1">The tracking device may be offline</p>
            </div>
          ) : (
            <div>
              {/* Live Map */}
              <LiveMap 
                positions={positions} 
                positionHistory={positionHistoryRef.current}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingModal;
