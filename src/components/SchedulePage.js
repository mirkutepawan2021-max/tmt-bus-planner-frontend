import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button, ListGroup } from 'react-bootstrap';
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
                const routeResponse = await fetch(`${API_URL}/api/bus-routes/${id}`);
                if (!routeResponse.ok) throw new Error('Failed to fetch route details.');
                const routeData = await routeResponse.json();
                setRouteInfo(routeData);

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

        const fromAllTrips = [];
        const toAllTrips = [];

        // Step 1: Collect all trips for each direction, preserving original order
        Object.values(schedule).forEach(shift => {
            Object.entries(shift).forEach(([busName, busSchedule]) => {
                const busNo = busName.startsWith('General') 
                    ? `Gen ${busName.split(' ')[2]}` 
                    : `Bus ${busName.split(' ')[1]}`;
                
                busSchedule.forEach(event => {
                    if (event.type === 'Trip' && event.legs) {
                        event.legs.forEach(leg => {
                            const departureData = { time: leg.departureTime, bus: busNo };
                            if (leg.legNumber === 1) {
                                fromAllTrips.push(departureData);
                            } else if (leg.legNumber === 2) {
                                toAllTrips.push(departureData);
                            }
                        });
                    }
                });
            });
        });

        // Custom function to create the wrap-around sort order
        const createWrapAroundSort = (trips, anchorBus) => {
            // First, get a unique list of trips
            const seen = new Set();
            const uniqueTrips = trips.filter(item => {
                const identifier = `${item.time}-${item.bus}`;
                if (seen.has(identifier)) return false;
                seen.add(identifier);
                return true;
            });

            // Find the first occurrence of the anchor bus in the original data
            const anchorIndex = uniqueTrips.findIndex(trip => trip.bus === anchorBus);

            if (anchorIndex !== -1) {
                // Isolate the anchor trip and its time
                const anchorTrip = uniqueTrips[anchorIndex];
                const anchorTime = anchorTrip.time;

                // Get all other trips
                const otherTrips = uniqueTrips.filter((_, index) => index !== anchorIndex);

                // Create two groups: after the anchor and before the anchor
                const afterOrEqualAnchor = otherTrips.filter(trip => trip.time >= anchorTime);
                const beforeAnchor = otherTrips.filter(trip => trip.time < anchorTime);

                // Sort both groups chronologically
                afterOrEqualAnchor.sort((a, b) => a.time.localeCompare(b.time));
                beforeAnchor.sort((a, b) => a.time.localeCompare(b.time));

                // Return the final, reassembled list
                return [anchorTrip, ...afterOrEqualAnchor, ...beforeAnchor];
            }
            
            // If anchor bus is not found, return the list sorted chronologically as a fallback
            return uniqueTrips.sort((a, b) => a.time.localeCompare(b.time));
        };
        
        const finalTimetable = {
            [routeInfo.fromTerminal]: createWrapAroundSort(fromAllTrips, 'Bus 1'),
            [routeInfo.toTerminal]: createWrapAroundSort(toAllTrips, 'Bus 1')
        };

        return finalTimetable;
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger" className="m-4">{error}</Alert>;
    if (!schedule || !routeInfo) return <Alert variant="warning" className="m-4">No schedule data available.</Alert>;

    const timetable = processTimetable();
    const fromLocation = routeInfo.fromTerminal;
    const toLocation = routeInfo.toTerminal;

    return (
        <>
            <style type="text/css" media="print">{`
                @page { size: auto; margin: 0.5in; }
                body { background-color: #FFFFFF !important; }
                .no-print { display: none !important; }
                .card { border: none !important; box-shadow: none !important; }
                h3, h5 { text-align: center; color: #000 !important; }
                .time-block { border: 1px solid #dee2e6 !important; }
                .bus-header { background-color: #e9ecef !important; color: #212529 !important; font-weight: 600; }
                .time-main { color: #212529 !important; }
            `}</style>

            <Container className="my-5">
                <Card className="border-0 shadow-sm">
                    <Card.Header className="p-3 bg-light d-flex justify-content-between align-items-center no-print">
                        <h3 className="mb-0">Public Bus Timetable</h3>
                        <div>
                            <Button variant="outline-secondary" onClick={handlePrint} className="me-2">Print</Button>
                            <Button as={Link} to="/" variant="secondary">Back to Dashboard</Button>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        <h3 className="text-center mb-4">{routeInfo?.routeName} ({routeInfo?.routeNumber})</h3>
                        
                        <Card className="mb-4">
                            <Card.Header as="h5">Departures: {fromLocation} to {toLocation}</Card.Header>
                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex flex-wrap p-3">
                                    {timetable[fromLocation]?.length > 0 ? timetable[fromLocation].map((item, index) => (
                                        <div key={index} className="text-center border rounded m-1 time-block" style={{ minWidth: '85px' }}>
                                            <div className="p-1 bus-header" style={{ backgroundColor: '#e9ecef', borderTopLeftRadius: '0.25rem', borderTopRightRadius: '0.25rem' }}>
                                                <small className="fw-bold text-secondary">{item.bus}</small>
                                            </div>
                                            <div className="p-1 time-main">
                                                <span className="fw-bolder fs-4 text-dark">{item.time}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="p-3 text-muted">No departures scheduled.</p>
                                    )}
                                </ListGroup.Item>
                            </ListGroup>
                        </Card>

                        <Card>
                            <Card.Header as="h5">Departures: {toLocation} to {fromLocation}</Card.Header>
                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex flex-wrap p-3">
                                    {timetable[toLocation]?.length > 0 ? timetable[toLocation].map((item, index) => (
                                        <div key={index} className="text-center border rounded m-1 time-block" style={{ minWidth: '85px' }}>
                                            <div className="p-1 bus-header" style={{ backgroundColor: '#e9ecef', borderTopLeftRadius: '0.25rem', borderTopRightRadius: '0.25rem' }}>
                                                <small className="fw-bold text-secondary">{item.bus}</small>
                                            </div>
                                            <div className="p-1 time-main">
                                                <span className="fw-bolder fs-4 text-dark">{item.time}</span>
                                            </div>
                                        </div>
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

export default SchedulePage;
