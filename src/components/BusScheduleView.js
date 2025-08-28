// frontend/src/components/BusScheduleView.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button, ButtonGroup, Table } from 'react-bootstrap';
import API_URL from '../apiConfig';

const BusScheduleView = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [scheduleOutput, setScheduleOutput] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRouteAndSchedule = async () => {
            setLoading(true);
            try {
                const [routeResponse, scheduleResponse] = await Promise.all([
                    fetch(`${API_URL}/api/bus-routes/${id}`),
                    fetch(`${API_URL}/api/bus-routes/${id}/schedule`)
                ]);

                if (!routeResponse.ok) throw new Error('Could not fetch route data.');
                const routeData = await routeResponse.json();
                setRoute(routeData);

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

    if (loading) return <Container className="text-center my-5"><Spinner animation="border" /></Container>;
    if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!route || !scheduleOutput || !scheduleOutput.schedules || Object.keys(scheduleOutput.schedules).length === 0) {
        return <Container className="my-5"><Alert variant="warning">No schedule could be generated for this route.</Alert></Container>;
    }

    const generateTableData = () => {
        const allSchedulesByShift = scheduleOutput.schedules;
        const busSchedulesLookup = {};
        
        // Step 1: Group buses into S1, General, and S2+
        const headerGroups = { s1: new Set(), general: new Set(), others: {} };
        Object.entries(allSchedulesByShift).forEach(([shiftName, busesInShift]) => {
            Object.entries(busesInShift).forEach(([busName, schedule]) => {
                busSchedulesLookup[busName] = schedule;
                if (busName.startsWith('General')) {
                    headerGroups.general.add(busName);
                } else if (shiftName === 'S1') {
                    headerGroups.s1.add(busName);
                } else {
                    if (!headerGroups.others[shiftName]) headerGroups.others[shiftName] = new Set();
                    headerGroups.others[shiftName].add(busName);
                }
            });
        });

        const sortBusNames = (arr) => Array.from(arr).sort((a,b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
        
        // Step 2: Build the final column order and headers
        const s1Sorted = sortBusNames(headerGroups.s1);
        const generalSorted = sortBusNames(headerGroups.general);
        const otherShiftsSorted = Object.entries(headerGroups.others).sort(([a], [b]) => a.localeCompare(b));
        
        const allBusNamesSorted = [
            ...s1Sorted,
            ...generalSorted,
            ...otherShiftsSorted.flatMap(([, busSet]) => sortBusNames(busSet))
        ];

        const finalHeaders = [];
        if (s1Sorted.length > 0) finalHeaders.push({ name: 'S1', count: s1Sorted.length });
        if (generalSorted.length > 0) finalHeaders.push({ name: 'General', count: generalSorted.length });
        otherShiftsSorted.forEach(([shiftName, busSet]) => {
            finalHeaders.push({ name: shiftName, count: busSet.size });
        });

        // Step 3: Map all events to a displayable format
        const displayMap = {};
        const labelMetadata = new Map();
        allBusNamesSorted.forEach(busName => {
            displayMap[busName] = {};
            const schedule = busSchedulesLookup[busName] || [];
            schedule.forEach(event => {
                const sortTime = event.rawTime ?? event.rawDepartureTime;
                if (event.type === 'Trip') {
                    event.legs.forEach(leg => {
                        const label = `Trip Leg ${leg.legNumber} - Trip ${event.tripNumber}`;
                        if (!labelMetadata.has(label)) {
                            labelMetadata.set(label, { sortTime: leg.rawDepartureTime, type: 'Trip', displayText: `${leg.departureLocation} -> ${leg.arrivalLocation}`, tripNumber: event.tripNumber, legNumber: leg.legNumber });
                        }
                        displayMap[busName][label] = leg.departureTime;
                    });
                } else {
                    const label = (event.type === 'Break') ? `Break @ ${event.location}` : event.type;
                    if (!labelMetadata.has(label)) labelMetadata.set(label, { sortTime, type: event.type, displayText: label });
                    if (event.type === 'Depot Movement' || event.type === 'Trip to Depot') displayMap[busName][label] = `${event.legs?.[0]?.departureTime} to ${event.legs?.[0]?.arrivalTime}`;
                    else displayMap[busName][label] = event.time || `${event.startTime} to ${event.endTime}`;
                }
            });
        });
        
        // Step 4: Sort event rows logically
        const getPriority = (type) => { const p = ['Calling Time', 'Preparation', 'Depot Movement', 'Trip', 'Break', 'Trip to Depot', 'Checking Time', 'Duty End']; return p.indexOf(type) !== -1 ? p.indexOf(type) : 99; };
        const rowLabels = Array.from(labelMetadata.keys()).sort((a,b) => {
            const metaA = labelMetadata.get(a);
            const metaB = labelMetadata.get(b);
            const prioA = getPriority(metaA.type);
            const prioB = getPriority(metaB.type);
            if (prioA !== prioB) return prioA - prioB;
            if (metaA.type === 'Trip') return metaA.tripNumber !== metaB.tripNumber ? metaA.tripNumber - metaB.tripNumber : metaA.legNumber - metaB.legNumber;
            return metaA.sortTime - metaB.sortTime;
        });

        // Step 5: Build final table rows
        const tableRows = rowLabels.map(labelKey => ({
            EVENT: labelMetadata.get(labelKey).displayText,
            data: allBusNamesSorted.map(busName => displayMap[busName]?.[labelKey] || '')
        }));

        return { finalHeaders, allBusNamesSorted, tableRows };
    };

    const { finalHeaders, allBusNamesSorted, tableRows } = generateTableData();
    const hasSchedulesToDisplay = tableRows.length > 0 && allBusNamesSorted.length > 0;

    return (
        <Container fluid className="my-5">
            <Card className="border-0 shadow-sm">
                <Card.Header className="p-3 bg-light d-flex justify-content-between align-items-center no-print">
                    <h3 className="mb-0">Schedule: {route.routeName}</h3>
                    <ButtonGroup><Button variant="outline-secondary" onClick={handlePrint}>Print</Button><Button as={Link} to="/" variant="secondary">Back</Button></ButtonGroup>
                </Card.Header>
                <Card.Body>
                    {hasSchedulesToDisplay ? (
                        <Table bordered striped responsive hover size="sm">
                            <thead>
                                <tr>
                                    <th rowSpan="2" className="align-middle text-center" style={{minWidth: '200px'}}>EVENT</th>
                                    {finalHeaders.map(({ name, count }) => (
                                        <th key={name} colSpan={count} className="text-center">{name}</th>
                                    ))}
                                </tr>
                                <tr>
                                    {allBusNamesSorted.map(busName => (
                                        <th key={busName} className="text-center">{busName}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.map((row, rowIndex) => (
                                    <tr key={rowIndex}><td>{row.EVENT}</td>{row.data.map((cellData, colIndex) => <td key={colIndex} className="text-center">{cellData}</td>)}</tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : ( <Alert variant="info">No schedule details could be generated.</Alert> )}
                </Card.Body>
                <Card.Footer className="text-muted no-print">
                    <details><summary>Raw Schedule Data (for debugging)</summary><pre>{JSON.stringify(scheduleOutput, null, 2)}</pre></details>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default BusScheduleView;
