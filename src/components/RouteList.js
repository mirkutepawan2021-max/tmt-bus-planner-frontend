import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Button, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import API_URL from '../apiConfig'; // IMPORTING OUR COMMON URL

const RouteList = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [routeToDelete, setRouteToDelete] = useState(null);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            // USING THE COMMON URL
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
            // USING THE COMMON URL
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
                        {routes.map((route) => (
                            <Col key={route._id}>
                                <Card className="h-100 shadow-sm">
                                    <Card.Header as="h5">{route.routeNumber}: {route.routeName}</Card.Header>
                                    <Card.Body>
                                        <Card.Text>
                                            <strong>From:</strong> {route.fromTerminal} <br/>
                                            <strong>To:</strong> {route.toTerminal}
                                        </Card.Text>
                                    </Card.Body>
                                    <Card.Footer className="text-end">
                                        <Button as={Link} to={`/edit/${route._id}`} variant="outline-primary" size="sm" className="me-2">Edit</Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => openDeleteModal(route)}>Delete</Button>
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
