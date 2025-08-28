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

    if (loading) return <Container className="my-5 text-center"><Spinner animation="border" /></Container>;
    if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!route || !scheduleOutput || !scheduleOutput.schedules || Object.keys(scheduleOutput.schedules).length === 0) {
        return <Container className="my-5"><Alert variant="info">No schedule generated.</Alert></Container>;
    }

    const generateTableData = () => {
        const allSchedulesByShift = scheduleOutput.schedules;
        const busSchedulesLookup = {};
        const shiftHeaderMap = {};
        const allBusDutyIds = [];

        // --- CORRECTED LOGIC: Use a unique ID for each bus duty ---
        Object.entries(allSchedulesByShift).forEach(([shiftName, busesInShift]) => {
            const busNamesForShift = Object.keys(busesInShift).sort((a,b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]));
            shiftHeaderMap[shiftName] = busNamesForShift.length;
            busNamesForShift.forEach(busName => {
                const dutyId = `${busName} - ${shiftName}`; // e.g., "Bus 1 - S1"
                allBusDutyIds.push(dutyId);
                busSchedulesLookup[dutyId] = busesInShift[busName];
            });
        });

        if (allBusDutyIds.length === 0) return { shiftHeaderMap: {}, allBusDutyIds: [], tableRows: [] };

        const displayMap = {};
        const labelMetadata = new Map();

        allBusDutyIds.forEach(dutyId => {
            displayMap[dutyId] = {};
            const schedule = busSchedulesLookup[dutyId] || [];
            schedule.forEach(event => {
                const sortTime = event.rawTime ?? event.rawDepartureTime;
                
                if (event.type === 'Trip') {
                    event.legs.forEach(leg => {
                        const label = `Trip ${event.tripNumber} ${leg.departureLocation}`;
                        displayMap[dutyId][label] = leg.departureTime;
                        if (!labelMetadata.has(label) || leg.rawDepartureTime < labelMetadata.get(label).sortTime) {
                            labelMetadata.set(label, { sortTime: leg.rawDepartureTime, type: event.type });
                        }
                    });
                } else {
                    const label = (event.type === 'Break') ? `Break @ ${event.location}` : event.type;
                    
                    if (event.type === 'Depot Movement' || event.type === 'Trip to Depot') {
                        const leg = event.legs?.[0]; 
                        if (leg) displayMap[dutyId][label] = `${leg.departureTime} to ${leg.arrivalTime}`;
                    } else if (event.type === 'Break') {
                        displayMap[dutyId][label] = `${event.startTime} to ${event.endTime}`;
                    } else {
                        displayMap[dutyId][label] = event.time;
                    }

                    if (!labelMetadata.has(label) || sortTime < labelMetadata.get(label).sortTime) {
                        labelMetadata.set(label, { sortTime, type: event.type });
                    }
                }
            });
        });
        
        const rowLabels = Array.from(labelMetadata.keys());

        const getPriority = (type) => {
            const priorities = ['Calling Time', 'Preparation', 'Depot Movement', 'Trip', 'Break', 'Trip to Depot', 'Checking Time', 'Duty End'];
            const index = priorities.indexOf(type);
            return index === -1 ? 99 : index;
        };

        rowLabels.sort((a, b) => {
            const metaA = labelMetadata.get(a);
            const metaB = labelMetadata.get(b);
            const priorityA = getPriority(metaA.type);
            const priorityB = getPriority(metaB.type);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return metaA.sortTime - metaB.sortTime;
        });
        
        const tableRows = rowLabels.map(label => {
            const rowData = { EVENT: label, data: [] };
            allBusDutyIds.forEach(dutyId => {
                const cellData = displayMap[dutyId]?.[label] || '';
                rowData.data.push(cellData);
            });
            return rowData;
        });

        const sortedShiftHeaders = Object.entries(shiftHeaderMap).sort((a, b) => a[0].localeCompare(b[0]));
        return { sortedShiftHeaders, allBusDutyIds, tableRows };
    };

    const { sortedShiftHeaders, allBusDutyIds, tableRows } = generateTableData();
    const hasSchedulesToDisplay = tableRows.length > 0 && allBusDutyIds.length > 0;

    return (
        <Container className="my-5">
            <Card className="border-0 shadow-sm">
                <Card.Header className="p-3 bg-light d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Schedule for {route.routeName} (Route {route.routeNumber})</h3>
                    <ButtonGroup>
                        <Button variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
                        <Button as={Link} to="/" variant="outline-secondary" size="sm">Back</Button>
                    </ButtonGroup>
                </Card.Header>
                <Card.Body className="p-4">
                    {hasSchedulesToDisplay ? (
                        <div style={{ overflowX: 'auto' }}>
                            <Table striped bordered hover size="sm" className="mb-0">
                                <thead>
                                    <tr>
                                        <th rowSpan="2" className="text-center align-middle">EVENT</th>
                                        {sortedShiftHeaders.map(([shiftName, busCount]) => (
                                            <th key={shiftName} colSpan={busCount} className="text-center">{shiftName}</th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {allBusDutyIds.map(dutyId => <th key={dutyId} className="text-center">{dutyId.split(' - ')[0]}</th>)}
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
                    ) : <Alert variant="info">No schedule generated.</Alert>}
                </Card.Body>
                <Card.Footer className="bg-light p-3">
                    <h5 className="text-muted">Raw Schedule Data (for debugging)</h5>
                    <pre style={{ maxHeight: '200px', overflow: 'auto', background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                        {JSON.stringify(scheduleOutput, null, 2)}
                    </pre>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default BusScheduleView;
