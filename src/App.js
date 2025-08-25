import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import BusRouteForm from './components/BusRouteForm';
import RouteList from './components/RouteList';
import BusScheduleView from './components/BusScheduleView'; // NEW IMPORT
import DutyBoard from './components/DutyBoard';
import SchedulePage from './components/SchedulePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RouteList />} />
        <Route path="/create" element={<BusRouteForm />} />
        <Route path="/edit/:id" element={<BusRouteForm />} />
        <Route path="/schedule/:id" element={<BusScheduleView />} /> {/* NEW ROUTE */}
        <Route path="/duty-board/:id" element={<DutyBoard />} />
        <Route path="/timetable/:id" element={<SchedulePage />} />


      </Routes>
    </Router>
  );
}

export default App;
