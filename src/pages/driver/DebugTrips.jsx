import React, { useState } from 'react';
import axios from 'axios';

const DebugTrips = () => {
    const [result, setResult] = useState('');

    const testEndpoint = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const role = localStorage.getItem('userRole');

            console.log('Token:', token ? 'Present' : 'Missing');
            console.log('Role:', role);

            setResult(`Token: ${token ? 'Present' : 'Missing'}\nRole: ${role}\n\n`);

            const BASE_URL = import.meta.env.VITE_TRIP_SERVICE_URL || import.meta.env.VITE_API_URL || 'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';
            const response = await axios.get(`${BASE_URL}/api/trips/driver/assigned`, {
                headers: { 'x-auth-token': token }
            });

            console.log('Response:', response.data);
            setResult(prev => prev + `Success!\nTrips found: ${response.data.trips?.length || 0}\n${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
            console.error('Error:', error);
            setResult(prev => prev + `Error: ${error.response?.status || 'Network Error'}\n${JSON.stringify(error.response?.data || error.message, null, 2)}`);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Debug Driver Trips Endpoint</h1>
            <button
                onClick={testEndpoint}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
            >
                Test Endpoint
            </button>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {result || 'Click button to test...'}
            </pre>
        </div>
    );
};

export default DebugTrips;
