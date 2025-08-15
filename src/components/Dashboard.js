import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const Dashboard = () => {
    return (
        <div className="text-center m-5">
            <h1>This is the Dashboard</h1>
            <p>If you see this, the main route is working.</p>
            <Button as={Link} to="/create">Go to Create Page</Button>
        </div>
    );
};

export default Dashboard;
