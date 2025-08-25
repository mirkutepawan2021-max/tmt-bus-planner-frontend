// frontend/src/components/DutyBoard.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button, Table } from 'react-bootstrap';
import API_URL from '../apiConfig';

// Helper function to format minutes into HH:MM
const formatMinutesToHHMM = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) {
        return '00:00';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const DutyBoard = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [processedDuties, setProcessedDuties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDutyData = async () => {
            setLoading(true);
            try {
                const [routeResponse, scheduleResponse] = await Promise.all([
                    fetch(`${API_URL}/api/bus-routes/${id}`),
                    fetch(`${API_URL}/api/bus-routes/${id}/schedule`)
                ]);

                if (!routeResponse.ok) throw new Error('Could not fetch route metadata.');
                const routeData = await routeResponse.json();
                setRoute(routeData);

                if (!scheduleResponse.ok) throw new Error('Could not fetch schedule data.');
                const scheduleData = await scheduleResponse.json();
                setSchedule(scheduleData);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDutyData();
    }, [id]);

    useEffect(() => {
        if (route && schedule && schedule.schedules) {
            const duties = [];
            Object.values(schedule.schedules).forEach(shift => {
                Object.entries(shift).forEach(([busName, busSchedule]) => {
                    const callingTimeEvent = busSchedule.find(e => e.type === 'Calling Time');
                    const preparationEvent = busSchedule.find(e => e.type === 'Preparation');
                    const firstTripEvent = busSchedule.find(e => e.type === 'Trip');
                    const breakEvent = busSchedule.find(e => e.type === 'Break');
                    const dutyEndEvent = busSchedule.find(e => e.type === 'Duty End');

                    if (!callingTimeEvent || !dutyEndEvent) return;

                    const totalShiftMinutes = dutyEndEvent.rawTime - callingTimeEvent.rawTime;
                    const totalShiftHours = formatMinutesToHHMM(totalShiftMinutes);
                    const busNumber = busName.split(' ')[1];
                    const firstDepartureTime = firstTripEvent?.legs?.[0]?.departureTime || 'N/A';

                    if (breakEvent) {
                        duties.push({
                            busNo: busNumber,
                            reportingTime: callingTimeEvent.time,
                            busBoardingTime: preparationEvent.time,
                            busDepartureTime: firstDepartureTime,
                            totalShiftHours: totalShiftHours,
                        });
                        duties.push({
                            busNo: busNumber,
                            reportingTime: breakEvent.endTime,
                            busBoardingTime: dutyEndEvent.time,
                            busDepartureTime: '', // No departure time for the second part
                            totalShiftHours: totalShiftHours,
                        });
                    } else {
                        duties.push({
                            busNo: busNumber,
                            reportingTime: callingTimeEvent.time,
                            busBoardingTime: preparationEvent.time,
                            busDepartureTime: firstDepartureTime,
                            totalShiftHours: totalShiftHours,
                        });
                    }
                });
            });

            duties.sort((a, b) => {
                if (a.busNo !== b.busNo) return parseInt(a.busNo, 10) - parseInt(b.busNo, 10);
                return a.reportingTime.localeCompare(b.reportingTime);
            });

            setProcessedDuties(duties);
        }
    }, [route, schedule]);
    
    // --- FUNCTION TO HANDLE PRINTING ---
    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Container className="my-5 text-center"><Spinner animation="border" /></Container>;
    if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!route) return <Container className="my-5"><Alert variant="info">No route data found.</Alert></Container>;

    return (
        <>
            {/* --- STYLESHEET FOR PRINT-FRIENDLY VIEW --- */}
            <style type="text/css" media="print">
                {`
                    @page { size: auto; margin: 0.5in; }
                    body { background-color: #FFFFFF !important; }
                    .no-print { display: none !important; }
                    .card { border: none !important; box-shadow: none !important; }
                    .card-header, .card-footer { background-color: #FFFFFF !important; }
                    h4, p { color: #000 !important; }
                `}
            </style>
            <Container className="my-5">
                <Card className="border-0 shadow-sm">
                    <Card.Header className="p-3 bg-light text-center">
                        <h4 className="mb-0">Transport Service, Thane Municipal Corporation, Thane</h4>
                        <p className="mb-0 text-muted">Duty Board for Route {route.routeNumber}: {route.routeName}</p>
                    </Card.Header>
                    <Card.Body>
                        {/* --- PRINT BUTTON ADDED --- */}
                        <div className="d-flex justify-content-end mb-3 no-print">
                            <Button variant="outline-secondary" onClick={handlePrint}>
                                Print Duty Board
                            </Button>
                        </div>
                        <Table striped bordered hover responsive>
                            <thead className="table-dark">
                                <tr>
                                    <th>SR. NO.</th>
                                    <th>BUS NO.</th>
                                    <th>REPORTING TIME</th>
                                    <th>BUS BOARDING TIME</th>
                                    <th>BUS DEPARTURE TIME</th>
                                    <th>TOTAL SHIFT HOURS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedDuties.length > 0 ? (
                                    processedDuties.map((duty, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{duty.busNo}</td>
                                            <td>{duty.reportingTime}</td>
                                            <td>{duty.busBoardingTime}</td>
                                            <td>{duty.busDepartureTime}</td>
                                            <td>{duty.totalShiftHours}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center">No duty information available to display.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                    <Card.Footer className="text-center no-print">
                         <Button as={Link} to="/" variant="outline-secondary" size="sm">Back to Dashboard</Button>
                    </Card.Footer>
                </Card>
            </Container>
        </>
    );
};

export default DutyBoard;
