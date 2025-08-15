import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col, Card, ProgressBar, Alert, InputGroup, ToggleButtonGroup, ToggleButton, Spinner } from 'react-bootstrap';

const getInitialState = () => ({
    routeNumber: '',
    routeName: '',
    fromTerminal: '',
    toTerminal: '',
    leg1: { kilometers: '', timePerKm: '5' },
    leg2: { kilometers: '', timePerKm: '5' },
    depotName: '',
    isTurnoutFromDepot: false,
    depotConnections: { timeFromDepotToStart: '', timeFromDepotToEnd: '', timeFromStartToDepot: '', timeFromEndToDepot: '' },
    busesAssigned: '',
    serviceStartTime: '06:00',
    serviceEndTime: '23:00',
    timeAdjustmentRules: [],
    crewDutyRules: {
        hasBreak: true,
        breakLocation: '',
        breakDuration: '30',
        breakWindowStart: '150',
        breakWindowEnd: '240',
        breakLayoverDuration: '0'
    }
});

const BusRouteForm = () => {
    const [formData, setFormData] = useState(getInitialState());
    const { id } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const totalSteps = 4;

    useEffect(() => {
        if (id) {
            setLoading(true);
            const fetchRouteData = async () => {
                try {
                    const response = await fetch(`http://localhost:4000/api/bus-routes/${id}`);
                    if (!response.ok) throw new Error('Could not fetch route data.');
                    const data = await response.json();
                    
                    const mergedData = {
                        ...getInitialState(),
                        ...data,
                        leg1: { ...getInitialState().leg1, ...(data.leg1 || {}) },
                        leg2: { ...getInitialState().leg2, ...(data.leg2 || {}) },
                        depotConnections: { ...getInitialState().depotConnections, ...(data.depotConnections || {}) },
                        crewDutyRules: { ...getInitialState().crewDutyRules, ...(data.crewDutyRules || {}) },
                    };
                    setFormData(mergedData);

                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchRouteData();
        } else {
            setFormData(getInitialState());
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, type, checked, value } = e.target;
        
        if (name === 'crewDutyRules.breakDurationHours') {
            const hours = parseFloat(value);
            const minutes = !isNaN(hours) ? Math.round(hours * 60) : '';
            setFormData(prev => ({ ...prev, crewDutyRules: { ...prev.crewDutyRules, breakDuration: minutes.toString() } }));
            return;
        }

        const val = type === 'checkbox' ? checked : value;
        if (name.includes('.')) {
            const [outerKey, innerKey] = name.split('.');
            setFormData(prev => ({ ...prev, [outerKey]: { ...prev[outerKey], [innerKey]: val } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };
    
    const handleToggleChange = (val) => { setFormData(prev => ({ ...prev, isTurnoutFromDepot: val })); };
    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);
    const isStepValid = () => {
        if (step === 1) return formData.routeNumber && formData.routeName && formData.fromTerminal && formData.toTerminal;
        if (step === 2) return formData.leg1?.kilometers && formData.leg1?.timePerKm && formData.leg2?.kilometers && formData.leg2?.timePerKm;
        if (step === 3) return formData.busesAssigned !== '';
        return true;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const url = `http://localhost:4000/api/bus-routes${id ? '/' + id : ''}`;
        const method = id ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Save operation failed.');
            }
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <>
            <h4>Step 1: Core Route Details</h4><hr />
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Route Number</Form.Label><Form.Control type="text" placeholder="e.g., 101" name="routeNumber" value={formData.routeNumber || ''} onChange={handleChange} required /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Route Name</Form.Label><Form.Control type="text" placeholder="e.g., Central to Downtown" name="routeName" value={formData.routeName || ''} onChange={handleChange} required /></Form.Group></Col>
            </Row>
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>From Terminal</Form.Label><Form.Control type="text" placeholder="Enter starting terminal" name="fromTerminal" value={formData.fromTerminal || ''} onChange={handleChange} required /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>To Terminal</Form.Label><Form.Control type="text" placeholder="Enter ending terminal" name="toTerminal" value={formData.toTerminal || ''} onChange={handleChange} required /></Form.Group></Col>
            </Row>
        </>
    );

    const renderStep2 = () => (
        <>
            <h4>Step 2: Trip Leg Details</h4><hr />
            <h5>Trip from '{formData.fromTerminal || 'Start'}' to '{formData.toTerminal || 'End'}'</h5>
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Distance</Form.Label><InputGroup><Form.Control type="number" placeholder="e.g., 12.5" name="leg1.kilometers" value={formData.leg1?.kilometers || ''} onChange={handleChange} required /><InputGroup.Text>km</InputGroup.Text></InputGroup></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Time per KM</Form.Label><InputGroup><Form.Control type="number" name="leg1.timePerKm" value={formData.leg1?.timePerKm || ''} onChange={handleChange} required /><InputGroup.Text>mins</InputGroup.Text></InputGroup></Form.Group></Col>
            </Row>
            <h5 className="mt-4">Return Trip from '{formData.toTerminal || 'End'}' to '{formData.fromTerminal || 'Start'}'</h5>
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Distance</Form.Label><InputGroup><Form.Control type="number" placeholder="e.g., 13.1" name="leg2.kilometers" value={formData.leg2?.kilometers || ''} onChange={handleChange} required /><InputGroup.Text>km</InputGroup.Text></InputGroup></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Time per KM</Form.Label><InputGroup><Form.Control type="number" name="leg2.timePerKm" value={formData.leg2?.timePerKm || ''} onChange={handleChange} required /><InputGroup.Text>mins</InputGroup.Text></InputGroup></Form.Group></Col>
            </Row>
        </>
    );
    
    const renderStep3 = () => (
        <>
            <h4>Step 3: Depot, Fleet & Crew Details</h4><hr />
            <Card className="p-3 mb-4 bg-light">
                <Form.Label as="h5">Depot Turnout?</Form.Label>
                <p className="text-muted mb-2">Does this route start its first trip from a depot?</p>
                <ToggleButtonGroup type="radio" name="isTurnoutFromDepot" value={formData.isTurnoutFromDepot} onChange={handleToggleChange}>
                    <ToggleButton id="tbg-radio-1" value={true} variant="outline-success">Yes</ToggleButton>
                    <ToggleButton id="tbg-radio-2" value={false} variant="outline-danger">No</ToggleButton>
                </ToggleButtonGroup>
            </Card>
            {formData.isTurnoutFromDepot && (
                <>
                    <Form.Group className="mb-4">
                        <Form.Label as="h5">Depot Name</Form.Label>
                        <Form.Control type="text" placeholder="e.g., Central Depot" name="depotName" value={formData.depotName || ''} onChange={handleChange} />
                    </Form.Group>
                    <h5 className="mt-4">Depot Connection Times</h5>
                    <p className="text-muted">Enter travel times in minutes.</p>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Depot to "{formData.fromTerminal || 'Start'}"</Form.Label><Form.Control type="number" name="depotConnections.timeFromDepotToStart" value={formData.depotConnections?.timeFromDepotToStart || ''} onChange={handleChange} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Depot to "{formData.toTerminal || 'End'}"</Form.Label><Form.Control type="number" name="depotConnections.timeFromDepotToEnd" value={formData.depotConnections?.timeFromDepotToEnd || ''} onChange={handleChange} /></Form.Group></Col>
                    </Row>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>"{formData.fromTerminal || 'Start'}" to Depot</Form.Label><Form.Control type="number" name="depotConnections.timeFromStartToDepot" value={formData.depotConnections?.timeFromStartToDepot || ''} onChange={handleChange} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>"{formData.toTerminal || 'End'}" to Depot</Form.Label><Form.Control type="number" name="depotConnections.timeFromEndToDepot" value={formData.depotConnections?.timeFromEndToDepot || ''} onChange={handleChange} /></Form.Group></Col>
                    </Row>
                </>
            )}
            <h5 className="mt-4">Fleet & Service Times</h5>
             <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Number of Buses Assigned</Form.Label><Form.Control type="number" placeholder="e.g., 8" name="busesAssigned" value={formData.busesAssigned || ''} onChange={handleChange} required /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Service Start Time</Form.Label><Form.Control type="text" placeholder="HH:mm" pattern="[0-2][0-9]:[0-5][0-9]" name="serviceStartTime" value={formData.serviceStartTime || ''} onChange={handleChange} required /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Service End Time</Form.Label><Form.Control type="text" placeholder="HH:mm" pattern="[0-2][0-9]:[0-5][0-9]" name="serviceEndTime" value={formData.serviceEndTime || ''} onChange={handleChange} required /></Form.Group></Col>
            </Row>
            
            <h5 className="mt-4">Crew Rules</h5>
            <Form.Group className="mb-3">
                <Form.Check 
                    type="switch"
                    id="has-break-switch"
                    label="Schedule a Crew Break for this Route?"
                    name="crewDutyRules.hasBreak"
                    checked={formData.crewDutyRules?.hasBreak || false}
                    onChange={handleChange}
                />
            </Form.Group>
            
            {formData.crewDutyRules?.hasBreak && (
                <Row>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Break Location</Form.Label><Form.Select name="crewDutyRules.breakLocation" value={formData.crewDutyRules?.breakLocation || ''} onChange={handleChange} disabled={!formData.fromTerminal || !formData.toTerminal}><option value="">Select...</option><option value={formData.fromTerminal}>{formData.fromTerminal}</option><option value={formData.toTerminal}>{formData.toTerminal}</option></Form.Select></Form.Group></Col>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Break Duration (hrs)</Form.Label>
                            <Form.Control type="number" placeholder="e.g., 0.5 or 1" name="crewDutyRules.breakDurationHours" value={Number(formData.crewDutyRules?.breakDuration || 0) / 60} onChange={handleChange} />
                        </Form.Group>
                    </Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Break Layover (mins)</Form.Label><Form.Control type="number" name="crewDutyRules.breakLayoverDuration" value={formData.crewDutyRules?.breakLayoverDuration || ''} onChange={handleChange} /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Break Window Start (mins)</Form.Label><Form.Control type="number" name="crewDutyRules.breakWindowStart" value={formData.crewDutyRules?.breakWindowStart || ''} onChange={handleChange} /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Break Window End (mins)</Form.Label><Form.Control type="number" name="crewDutyRules.breakWindowEnd" value={formData.crewDutyRules?.breakWindowEnd || ''} onChange={handleChange} /></Form.Group></Col>
                </Row>
            )}
        </>
    );

    const renderReviewStep = () => (
        <>
            <h4>Step 4: Review & Submit</h4><hr />
            <p className="text-muted">Please review all the details below before saving.</p>
            <Row>
                <Col md={6} className="mb-2"><strong>Route Number:</strong><p className="text-primary">{formData.routeNumber}</p></Col>
                <Col md={6} className="mb-2"><strong>Route Name:</strong><p className="text-primary">{formData.routeName}</p></Col>
            </Row>
        </>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderReviewStep();
            default: return <h2>Something went wrong.</h2>;
        }
    };

    return (
        <Container className="my-5">
            <Card className="border-0 shadow-sm">
                <Card.Header as="h3" className="p-3 bg-light">{id ? `Edit Route: ${formData.routeName}` : 'Create New Bus Route'}</Card.Header>
                <Card.Body className="p-4">
                    <ProgressBar animated now={(step / totalSteps) * 100} label={`Step ${step} of ${totalSteps}`} className="mb-4" />
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : renderStepContent()}
                        <div className="mt-4 d-flex justify-content-between">
                            <Button variant="secondary" onClick={step === 1 ? () => navigate('/') : prevStep}>{step === 1 ? 'Cancel' : 'Back'}</Button>
                            {step < totalSteps ? 
                                <Button variant="primary" onClick={nextStep} disabled={!isStepValid()}>Next</Button> :
                                <Button variant="success" type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : (id ? 'Update Route' : 'Confirm & Save')}
                                </Button>
                            }
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default BusRouteForm;
