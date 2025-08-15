import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import BusRouteForm from './components/BusRouteForm';
import RouteList from './components/RouteList';
import { Container, Navbar } from 'react-bootstrap';

function App() {
  return (
    <Router>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="/">Bus Route Planner</Navbar.Brand>
        </Container>
      </Navbar>
      <main className="py-4">
        <Container>
            <Routes>
              <Route path="/" element={<RouteList />} />
              <Route path="/create" element={<BusRouteForm />} />
              <Route path="/edit/:id" element={<BusRouteForm />} />
            </Routes>
        </Container>
      </main>
    </Router>
  );
}

export default App;
