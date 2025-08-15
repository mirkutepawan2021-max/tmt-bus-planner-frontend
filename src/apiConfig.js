// This file determines the base URL for the API.
// It checks for a production environment variable from Render.
// If it doesn't exist, it defaults to the local development server.

const API_URL = process.env.REACT_APP_API_URL || 'https://tmt-bus-planner.onrender.com';

export default API_URL;
