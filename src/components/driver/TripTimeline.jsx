import React, { useState } from 'react';
import { MapPin, CheckCircle, Circle, Flag } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const TripTimeline = ({ trip, onStopReached, onTripEnd }) => {
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [processingStop, setProcessingStop] = useState(null);

    const checkLocation = () => {
        return new Promise((resolve) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                    },
                    () => resolve(null)
                );
            } else {
                resolve(null);
            }
        });
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const handleStopClick = async (stop, index) => {
        setProcessingStop(index);
        const currentLocation = await checkLocation();
        const now = new Date();
        
        let mismatchMessages = [];

        // Check location if available
        if (currentLocation && stop.location) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                stop.location.coordinates[1],
                stop.location.coordinates[0]
            );
            
            if (distance > 0.5) { // More than 500 meters away
                mismatchMessages.push(`Location mismatch: You are ${distance.toFixed(2)}km away from the stop.`);
            }
        }

        // Check if we have expected time for this stop
        if (stop.arrivalTime) {
            const expectedTime = new Date(stop.arrivalTime);
            const timeDiff = Math.abs(now - expectedTime) / (1000 * 60); // minutes
            
            if (timeDiff > 30) { // More than 30 minutes difference
                mismatchMessages.push(`Time mismatch: Expected arrival at ${expectedTime.toLocaleTimeString()}, current time is ${now.toLocaleTimeString()}.`);
            }
        }

        if (mismatchMessages.length > 0) {
            setModalData({
                type: 'stop',
                stop,
                index,
                message: mismatchMessages.join('\n'),
                currentLocation
            });
            setShowModal(true);
        } else {
            await onStopReached(index, stop, currentLocation);
        }
        setProcessingStop(null);
    };

    const handleEndTripClick = async () => {
        const currentLocation = await checkLocation();
        const now = new Date();
        
        let mismatchMessages = [];

        // Check if at end destination
        if (currentLocation && trip.endDestination.location) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                trip.endDestination.location.coordinates[1],
                trip.endDestination.location.coordinates[0]
            );
            
            if (distance > 0.5) {
                mismatchMessages.push(`Location mismatch: You are ${distance.toFixed(2)}km away from the destination.`);
            }
        }

        // Check end time
        const expectedEndTime = new Date(trip.endDateTime);
        const timeDiff = (now - expectedEndTime) / (1000 * 60); // minutes
        
        if (Math.abs(timeDiff) > 30) {
            if (timeDiff < 0) {
                mismatchMessages.push(`Time mismatch: Trip is scheduled to end at ${expectedEndTime.toLocaleTimeString()}, but you're ending early.`);
            } else {
                mismatchMessages.push(`Time mismatch: Trip was scheduled to end at ${expectedEndTime.toLocaleTimeString()}.`);
            }
        }

        if (mismatchMessages.length > 0) {
            setModalData({
                type: 'end',
                message: mismatchMessages.join('\n'),
                currentLocation
            });
            setShowModal(true);
        } else {
            await onTripEnd(currentLocation);
        }
    };

    const handleConfirm = async () => {
        if (modalData.type === 'stop') {
            await onStopReached(modalData.index, modalData.stop, modalData.currentLocation);
        } else {
            await onTripEnd(modalData.currentLocation);
        }
        setShowModal(false);
        setModalData(null);
    };

    const allStops = [
        { ...trip.startDestination, type: 'start', status: 'reached' },
        ...(trip.stops || []).map(stop => ({ ...stop, type: 'stop' })),
        { ...trip.endDestination, type: 'end', status: trip.status === 'completed' ? 'reached' : 'pending' }
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Trip Progress</h3>
            
            <div className="relative">
                {allStops.map((stop, index) => (
                    <div key={index} className="flex gap-4 relative">
                        {/* Timeline Line */}
                        {index < allStops.length - 1 && (
                            <div className="absolute left-4 top-10 w-0.5 h-full bg-gray-300" />
                        )}
                        
                        {/* Icon */}
                        <div className="relative z-10 flex-shrink-0">
                            {stop.status === 'reached' ? (
                                <CheckCircle size={32} className="text-green-600" />
                            ) : stop.status === 'departed' ? (
                                <CheckCircle size={32} className="text-blue-600" />
                            ) : stop.type === 'end' ? (
                                <Flag size={32} className="text-red-600" />
                            ) : (
                                <Circle size={32} className="text-gray-400" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-8">
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{stop.name}</h4>
                                        {stop.address && (
                                            <p className="text-sm text-gray-600">{stop.address}</p>
                                        )}
                                        <div className="mt-1">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                                stop.status === 'reached' ? 'bg-green-100 text-green-800' :
                                                stop.status === 'departed' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {stop.type === 'start' ? 'Start Point' :
                                                 stop.type === 'end' ? 'Destination' :
                                                 `Stop ${index}`}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Action Button */}
                                    {stop.type === 'stop' && stop.status === 'pending' && (
                                        <button
                                            onClick={() => handleStopClick(stop, index - 1)}
                                            disabled={processingStop === index - 1}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {processingStop === index - 1 ? 'Processing...' : 'Location Reached'}
                                        </button>
                                    )}
                                    
                                    {stop.type === 'end' && stop.status === 'pending' && index === allStops.length - 1 && (
                                        <button
                                            onClick={handleEndTripClick}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            End Trip
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmationModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setModalData(null);
                }}
                onConfirm={handleConfirm}
                title={modalData?.type === 'stop' ? 'Stop Location Mismatch' : 'Trip End Mismatch'}
                message={modalData?.message || ''}
                type="warning"
            />
        </div>
    );
};

export default TripTimeline;
