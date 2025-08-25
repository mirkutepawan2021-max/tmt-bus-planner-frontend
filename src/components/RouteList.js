// frontend/src/components/RouteList.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Row, Col, Spinner, Alert, Modal, ButtonGroup } from 'react-bootstrap';
import API_URL from '../apiConfig';

const RouteList = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [routeToDelete, setRouteToDelete] = useState(null);
    const navigate = useNavigate();

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/bus-routes`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setRoutes(data);
        } catch (err) {
            setError('Failed to fetch routes. Please ensure the backend server is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
    }, []);

    const openDeleteModal = (route) => {
        setRouteToDelete(route);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setRouteToDelete(null);
        setShowDeleteModal(false);
    };

    const handleDelete = async () => {
        if (!routeToDelete) return;
        try {
            await fetch(`${API_URL}/api/bus-routes/${routeToDelete._id}`, { method: 'DELETE' });
            fetchRoutes();
        } catch (err) {
            setError('Delete operation failed.');
        } finally {
            closeDeleteModal();
        }
    };

    if (loading) return <div className="text-center m-5"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <>
            <Container className="my-5">
                <Row className="mb-4 align-items-center">
                    <Col><h1 className="mb-0">Route Dashboard</h1></Col>
                    <Col xs="auto"><Button as={Link} to="/create" variant="primary">+ Create New Route</Button></Col>
                </Row>
                {routes.length === 0 ? (
                    <Alert variant="info">No routes found. Get started by creating one!</Alert>
                ) : (
                    <Row xs={1} md={2} lg={3} className="g-4">
                        {[...routes]
                            .sort((a, b) => parseInt(a.routeNumber, 10) - parseInt(b.routeNumber, 10))
                            .map((route) => (
                                <Col key={route._id}>
                                    <Card className="h-100 shadow-sm">
                                        <Card.Header as="h5">{route.routeNumber}: {route.routeName}</Card.Header>
                                        <Card.Body>
                                            <Card.Text>
                                                <strong>From:</strong> {route.fromTerminal} <br/>
                                                <strong>To:</strong> {route.toTerminal}
                                            </Card.Text>
                                            <Card.Text>
                                                <strong>Buses:</strong> {route.busesAssigned} &nbsp;
                                                <strong>Start:</strong> {route.serviceStartTime} &nbsp;
                                                <strong>Duration:</strong> {route.dutyDurationHours} hrs
                                            </Card.Text>
                                        </Card.Body>
                                        
                                        {/* --- UPDATED BUTTON LAYOUT --- */}
                                        <Card.Footer>
                                            <div className="d-grid gap-2">
                                                <ButtonGroup className="w-100">
                                                    <Button as={Link} to={`/edit/${route._id}`} variant="outline-primary" size="sm">Edit</Button>
                                                    <Button variant="outline-danger" size="sm" onClick={() => openDeleteModal(route)}>Delete</Button>
                                                </ButtonGroup>
                                                <ButtonGroup className="w-100">
                                                    <Button as={Link} to={`/duty-board/${route._id}`} variant="info" size="sm">View Duty</Button>
                                                    <Button as={Link} to={`/schedule/${route._id}`} variant="success" size="sm">View Schedule</Button>
                                                    <Button as={Link} to={`/timetable/${route._id}`} variant="warning" size="sm">View Timetable</Button>
                                                </ButtonGroup>
                                            </div>
                                        </Card.Footer>

                                    </Card>
                                </Col>
                            ))}
                    </Row>
                )}
            </Container>
            <Modal show={showDeleteModal} onHide={closeDeleteModal}>
                <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
                <Modal.Body>Are you sure you want to delete route <strong>{routeToDelete?.routeName}</strong>? This action cannot be undone.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete Route</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default RouteList;
