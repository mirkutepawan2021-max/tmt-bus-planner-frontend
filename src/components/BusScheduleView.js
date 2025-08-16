// frontend/src/components/BusScheduleView.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button, ButtonGroup, Table } from 'react-bootstrap';

import API_URL from '../apiConfig';

const parseTimeToMinutes = (timeValue) => {
    if (typeof timeValue === 'number') return timeValue;
    if (typeof timeValue !== 'string' || !timeValue.includes(':')) {
        return 9999;
    }
    const [hours, minutes] = timeValue.split(':').map(Number);
    return hours * 60 + minutes;
};

const BusScheduleView = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [scheduleOutput, setScheduleOutput] = useState(null);
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRouteAndSchedule = async () => {
            setLoading(true);
            setError('');
            try {
                const routeResponse = await fetch(`${API_URL}/api/bus-routes/${id}`);
                if (!routeResponse.ok) throw new Error('Could not fetch route data.');
                const routeData = await routeResponse.json(); 
                setRoute(routeData);

                const scheduleResponse = await fetch(`${API_URL}/api/bus-routes/${id}/schedule`);
                if (!scheduleResponse.ok) {
                    const errorData = await scheduleResponse.json();
                    throw new Error(errorData.message || 'Could not generate schedule.');
                }
                const generatedData = await scheduleResponse.json();
                setScheduleOutput(generatedData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchRouteAndSchedule();
    }, [id]);

    const handlePrint = () => { window.print(); };

    if (loading) return <Container className="my-5 text-center"><Spinner animation="border" /></Container>;
    if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!route) return <Container className="my-5"><Alert variant="info">Route not found.</Alert></Container>;

    const allSchedulesByShift = scheduleOutput?.schedules || {};

    const generateTableData = () => {
        const allBusNamesSorted = [];
        const shiftHeaderMap = {};
        const busSchedulesLookup = {}; 

        Object.entries(allSchedulesByShift).sort((a, b) => a[0].localeCompare(b[0])).forEach(([shiftName, busesInShift]) => {
            const currentShiftBusNames = Object.keys(busesInShift).sort((a, b) => {
                const busNumA = parseInt(a.split(' ')[1]);
                const busNumB = parseInt(b.split(' ')[1]);
                return busNumA - busNumB;
            });
            shiftHeaderMap[shiftName] = currentShiftBusNames.length;
            allBusNamesSorted.push(...currentShiftBusNames);
            currentShiftBusNames.forEach(busName => { busSchedulesLookup[busName] = busesInShift[busName]; });
        });

        const tableRows = [];
        const findEvent = (schedule, type) => schedule ? schedule.find(e => e.type === type) : null;
        const findTrip = (schedule, tripNum) => schedule ? schedule.find(e => e.type === 'Trip' && e.tripNumber === tripNum) : null;

        const breaksByTripMap = new Map();
        allBusNamesSorted.forEach((busName, busIndex) => {
            const schedule = busSchedulesLookup[busName] || [];
            const busBreaks = schedule.filter(e => e.type === 'Break');

            busBreaks.forEach(breakEvent => {
                const breakStartTime = parseTimeToMinutes(breakEvent.startTime);
                let precedingTripNum = 0;

                for (const trip of schedule.filter(e => e.type === 'Trip')) {
                    if (trip.rawArrivalTime <= breakStartTime) {
                        precedingTripNum = trip.tripNumber;
                    } else {
                        break;
                    }
                }
                
                if (!breaksByTripMap.has(precedingTripNum)) {
                    breaksByTripMap.set(precedingTripNum, Array(allBusNamesSorted.length).fill(''));
                }
                
                breaksByTripMap.get(precedingTripNum)[busIndex] = `${breakEvent.startTime} to ${breakEvent.endTime}`;
            });
        });

        tableRows.push({ EVENT: 'Calling Time', data: allBusNamesSorted.map(name => findEvent(busSchedulesLookup[name], 'Calling Time')?.time || '') });
        tableRows.push({ EVENT: 'Ready', data: allBusNamesSorted.map(name => findEvent(busSchedulesLookup[name], 'Preparation')?.time || '') });
        if (route.isTurnoutFromDepot) {
            tableRows.push({ EVENT: 'Depot Movement', data: allBusNamesSorted.map(name => findEvent(busSchedulesLookup[name], 'Depot Movement')?.time || '') });
        }

        const allTripNumbers = [...new Set(Object.values(busSchedulesLookup).flat().filter(e => e.type === 'Trip').map(e => e.tripNumber))].sort((a, b) => a - b);
        
        allTripNumbers.forEach(tripNumber => {
            tableRows.push({ 
                EVENT: `Trip ${tripNumber} ${route.toTerminal}`, 
                data: allBusNamesSorted.map(name => findTrip(busSchedulesLookup[name], tripNumber)?.legs[0]?.departureTime || '') 
            });
            
            const hasSecondLeg = allBusNamesSorted.some(name => findTrip(busSchedulesLookup[name], tripNumber)?.legs.length > 1);
            if (hasSecondLeg) {
                tableRows.push({ 
                    EVENT: `Trip ${tripNumber} ${route.fromTerminal}`, 
                    data: allBusNamesSorted.map(name => findTrip(busSchedulesLookup[name], tripNumber)?.legs[1]?.departureTime || '') 
                });
            }

            if (breaksByTripMap.has(tripNumber)) {
                tableRows.push({ EVENT: 'Break', data: breaksByTripMap.get(tripNumber) });
            }
        });

        const tripToDepotEventExists = Object.values(busSchedulesLookup).some(schedule => schedule.some(e => e.type === 'Trip to Depot'));
        if (tripToDepotEventExists) {
            tableRows.push({ EVENT: `Trip to ${route.depotName}`, data: allBusNamesSorted.map(name => findEvent(busSchedulesLookup[name], 'Trip to Depot')?.departureTime || '') });
        }
        tableRows.push({ EVENT: 'Checking Time', data: allBusNamesSorted.map(name => findEvent(busSchedulesLookup[name], 'Checking Time')?.time || '') });
        tableRows.push({ EVENT: 'Duty End', data: allBusNamesSorted.map(name => findEvent(busSchedulesLookup[name], 'Duty End')?.time || '') });

        return { shiftHeaderMap, allBusNamesSorted, tableRows };
    };

    const { shiftHeaderMap, allBusNamesSorted, tableRows } = generateTableData();
    const hasSchedulesToDisplay = tableRows.length > 0 && allBusNamesSorted.length > 0;

    return (
        <Container className="my-5">
            {/* *** CHANGE: Removed print-specific styles as they are no longer needed *** */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="p-3 bg-light d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Schedule for {route.routeName} (Route {route.routeNumber})</h3>
                    <ButtonGroup>
                        <Button variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
                        <Button as={Link} to="/" variant="outline-secondary" size="sm">Back</Button>
                    </ButtonGroup>
                </Card.Header>
                <Card.Body className="p-4">
                    {scheduleOutput?.warnings?.length > 0 && (
                        <Alert variant="danger" className="mb-4">
                            <h5>CRITICAL WARNINGS:</h5>
                            <ul>{scheduleOutput.warnings.map((warn, idx) => <li key={idx}>{warn}</li>)}</ul>
                        </Alert>
                    )}
                    {hasSchedulesToDisplay ? (
                        <>
                            <h4 className="mb-3">Generated Schedule Details</h4>
                            <div style={{ overflowX: 'auto' }}>
                                <Table striped bordered hover size="sm" className="mb-0">
                                    <thead>
                                        <tr>
                                            <th rowSpan="2" className="text-center align-middle">EVENT</th>
                                            {Object.entries(shiftHeaderMap).map(([shiftName, busCount]) => (
                                                <th key={shiftName} colSpan={busCount} className="text-center">{shiftName}</th>
                                            ))}
                                        </tr>
                                        <tr>
                                            {allBusNamesSorted.map(busName => <th key={busName} className="text-center">{busName.split(' - ')[0]}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                <td>{row.EVENT}</td>
                                                {row.data.map((cellData, colIndex) => <td key={colIndex} style={{whiteSpace: 'nowrap'}}>{cellData}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </>
                    ) : <Alert variant="info">No schedule generated.</Alert>}
                </Card.Body>
            </Card>
            {/* *** CHANGE: The entire Raw Schedule Output card has been removed *** */}
        </Container>
    );
};

export default BusScheduleView;
