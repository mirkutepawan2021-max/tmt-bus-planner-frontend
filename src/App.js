import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import BusRouteForm from './components/BusRouteForm';
import RouteList from './components/RouteList';
import BusScheduleView from './components/BusScheduleView'; // NEW IMPORT

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RouteList />} />
        <Route path="/create" element={<BusRouteForm />} />
        <Route path="/edit/:id" element={<BusRouteForm />} />
        <Route path="/schedule/:id" element={<BusScheduleView />} /> {/* NEW ROUTE */}
      </Routes>
    </Router>
  );
}

export default App;
