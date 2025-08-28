import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button, Table } from 'react-bootstrap';
import API_URL from '../apiConfig';

const formatMinutesToHHMM = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00';
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
            Object.entries(schedule.schedules).forEach(([shiftId, shiftData]) => {
                Object.entries(shiftData).forEach(([busName, busSchedule]) => {
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
                    
                    const dutyData = {
                        busName: busName, // Keep original name for sorting
                        busNo: busName.startsWith('General') ? busName.replace('Bus ', '') : busNumber,
                        reportingTime: callingTimeEvent.time,
                        busBoardingTime: preparationEvent.time,
                        busDepartureTime: firstDepartureTime,
                        totalShiftHours: totalShiftHours,
                        shiftId: shiftId,
                    };

                    if (breakEvent) {
                        duties.push(dutyData);
                        duties.push({ ...dutyData, reportingTime: breakEvent.endTime, busBoardingTime: dutyEndEvent.time, busDepartureTime: '', totalShiftHours: '' });
                    } else {
                        duties.push(dutyData);
                    }
                });
            });

            // --- NEW SORTING LOGIC ---
            duties.sort((a, b) => {
                const getSortOrder = (item) => {
                    if (item.busName.startsWith('General')) return 2; // General is second
                    if (item.shiftId === 'S1') return 1; // S1 is first
                    if (item.shiftId === 'S2') return 3; // S2 is third
                    return 4; // Other shifts after
                };

                const orderA = getSortOrder(a);
                const orderB = getSortOrder(b);

                if (orderA !== orderB) return orderA - orderB;
                
                // If in the same group, sort by reporting time
                return a.reportingTime.localeCompare(b.reportingTime);
            });

            setProcessedDuties(duties);
        }
    }, [route, schedule]);
    
    const handlePrint = () => { window.print(); };

    if (loading) return <Container className="my-5 text-center"><Spinner animation="border" /></Container>;
    if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!route) return <Container className="my-5"><Alert variant="info">No route data found.</Alert></Container>;

    return (
        <>
            <style type="text/css" media="print">{`.no-print { display: none !important; }`}</style>
            <Container className="my-5">
                <Card className="border-0 shadow-sm">
                    <Card.Header className="p-3 bg-light text-center">
                        <h4 className="mb-0">Transport Service, Thane Municipal Corporation, Thane</h4>
                        <p className="mb-0 text-muted">Duty Board for Route {route.routeNumber}: {route.routeName}</p>
                    </Card.Header>
                    <Card.Body>
                        <div className="d-flex justify-content-end mb-3 no-print">
                            <Button variant="outline-secondary" onClick={handlePrint}>Print Duty Board</Button>
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
                                ) : ( <tr><td colSpan="6" className="text-center">No duty information to display.</td></tr> )}
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
