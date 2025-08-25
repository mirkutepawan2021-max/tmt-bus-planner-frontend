import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button, ListGroup, Badge } from 'react-bootstrap';
import API_URL from '../apiConfig';

const SchedulePage = () => {
    const [schedule, setSchedule] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { id } = useParams();

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                // Fetch route details first
                const routeResponse = await fetch(`${API_URL}/api/bus-routes/${id}`);
                if (!routeResponse.ok) throw new Error('Failed to fetch route details.');
                const routeData = await routeResponse.json();
                setRouteInfo(routeData);

                // Then fetch the generated schedule
                const scheduleResponse = await fetch(`${API_URL}/api/bus-routes/${id}/schedule`);
                if (!scheduleResponse.ok) throw new Error('Failed to generate schedule.');
                const scheduleData = await scheduleResponse.json();
                setSchedule(scheduleData.schedules);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, [id]);

    const processTimetable = () => {
        if (!schedule || !routeInfo) return {};

        const timetable = {
            [routeInfo.fromTerminal]: [],
            [routeInfo.toTerminal]: []
        };

        // Iterate through all shifts and all buses
        Object.values(schedule).forEach(shift => {
            Object.values(shift).forEach(busSchedule => {
                busSchedule.forEach(event => {
                    // Check if the event is a 'Trip'
                    if (event.type === 'Trip' && event.legs) {
                        event.legs.forEach(leg => {
                            // Leg 1 is from the starting terminal
                            if (leg.legNumber === 1) {
                                timetable[routeInfo.fromTerminal].push(leg.departureTime);
                            } 
                            // Leg 2 is from the destination terminal (return trip)
                            else if (leg.legNumber === 2) {
                                timetable[routeInfo.toTerminal].push(leg.departureTime);
                            }
                        });
                    }
                });
            });
        });

        // Sort and remove duplicates
        timetable[routeInfo.fromTerminal] = [...new Set(timetable[routeInfo.fromTerminal])].sort();
        timetable[routeInfo.toTerminal] = [...new Set(timetable[routeInfo.toTerminal])].sort();

        return timetable;
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger" className="m-4">{error}</Alert>;
    if (!schedule) return <Alert variant="warning" className="m-4">No schedule data available for this route.</Alert>;

    const timetable = processTimetable();
    const fromLocation = routeInfo.fromTerminal;
    const toLocation = routeInfo.toTerminal;

    return (
        <>
            {/* These styles are only applied when printing */}
            <style type="text/css" media="print">
                {`
                    @page { size: auto; margin: 0.5in; }
                    body { background-color: #FFFFFF !important; }
                    .no-print { display: none !important; }
                    .card { border: none !important; box-shadow: none !important; }
                    h3, h5 { text-align: center; color: #000 !important; }
                    .badge { border: 1px solid #000 !important; color: #000 !important; background-color: #FFFFFF !important; }
                `}
            </style>

            <Container className="my-5">
                <Card className="border-0 shadow-sm">
                    <Card.Header className="p-3 bg-light d-flex justify-content-between align-items-center no-print">
                        <h3 className="mb-0">Public Bus Timetable</h3>
                        <div>
                            <Button variant="outline-secondary" onClick={handlePrint} className="me-2">
                                Print
                            </Button>
                            <Button as={Link} to="/" variant="secondary">
                                Back to Dashboard
                            </Button>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        <h3 className="text-center mb-4">{routeInfo?.routeName} ({routeInfo?.routeNumber})</h3>
                        
                        <Card className="mb-4">
                            <Card.Header as="h5">Departures: {fromLocation} to {toLocation}</Card.Header>
                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex flex-wrap">
                                    {timetable[fromLocation]?.length > 0 ? timetable[fromLocation].map((time, index) => (
                                        <Badge key={index} bg="primary" className="m-1 p-2" style={{ fontSize: '1rem' }}>
                                            {time}
                                        </Badge>
                                    )) : (
                                        <p className="p-3 text-muted">No departures scheduled.</p>
                                    )}
                                </ListGroup.Item>
                            </ListGroup>
                        </Card>

                        <Card>
                            <Card.Header as="h5">Departures: {toLocation} to {fromLocation}</Card.Header>
                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex flex-wrap">
                                    {timetable[toLocation]?.length > 0 ? timetable[toLocation].map((time, index) => (
                                        <Badge key={index} bg="success" className="m-1 p-2" style={{ fontSize: '1rem' }}>
                                            {time}
                                        </Badge>
                                    )) : (
                                        <p className="p-3 text-muted">No departures scheduled.</p>
                                    )}
                                </ListGroup.Item>
                            </ListGroup>
                        </Card>
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
};

export default SchedulePage; // Or SchedulePage, depending on your file name
