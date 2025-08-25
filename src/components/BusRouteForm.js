import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Form, Button, Container, Row, Col, Card, ProgressBar, Alert, InputGroup, ToggleButtonGroup, ToggleButton, Spinner } from 'react-bootstrap';
import API_URL from '../apiConfig';

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
    serviceStartTime: '',
    dutyDurationHours: 8, 
    numberOfShifts: 2,
    hasDynamicSecondShift: false,
    secondShiftStartTime: '',
    frequency: {
        type: 'standard', 
        dynamicMinutes: ''
    },
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
                    const response = await fetch(`${API_URL}/api/bus-routes/${id}`);
                    if (!response.ok) throw new Error('Could not fetch route data.');
                    const data = await response.json();
                    
                    const rulesWithIds = (data.timeAdjustmentRules || []).map((rule, index) => ({
                        ...rule,
                        id: rule.id || Date.now() + index
                    }));

                    setFormData(prev => ({
                        ...getInitialState(),
                        ...data,
                        leg1: { ...getInitialState().leg1, ...(data.leg1 || {}) },
                        leg2: { ...getInitialState().leg2, ...(data.leg2 || {}) },
                        depotConnections: { ...getInitialState().depotConnections, ...(data.depotConnections || {}) },
                        crewDutyRules: { ...getInitialState().crewDutyRules, ...(data.crewDutyRules || {}) },
                        frequency: { ...getInitialState().frequency, ...(data.frequency || {}) },
                        timeAdjustmentRules: rulesWithIds,
                    }));

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
    
    const handleAddAdjustmentRule = () => {
        setFormData(prev => ({ ...prev, timeAdjustmentRules: [...(prev.timeAdjustmentRules || []), { id: Date.now(), startTime: '', endTime: '', timeAdjustment: '0' }] }));
    };

    const handleRemoveAdjustmentRule = (ruleId) => {
        setFormData(prev => ({ ...prev, timeAdjustmentRules: prev.timeAdjustmentRules.filter(rule => rule.id !== ruleId) }));
    };

    const handleAdjustmentRuleChange = (ruleId, field, value) => {
        setFormData(prev => ({ ...prev, timeAdjustmentRules: prev.timeAdjustmentRules.map(rule => rule.id === ruleId ? { ...rule, [field]: value } : rule) }));
    };
    
    const handleToggleChange = (val) => { setFormData(prev => ({ ...prev, isTurnoutFromDepot: val })); };
    
    const handleFrequencyTypeChange = (val) => {
        setFormData(prev => ({ ...prev, frequency: { ...prev.frequency, type: val } }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const url = `${API_URL}/api/bus-routes${id ? '/' + id : ''}`;
        const method = id ? 'PUT' : 'POST';

        const submissionData = JSON.parse(JSON.stringify(formData));
        if (submissionData.timeAdjustmentRules) {
            submissionData.timeAdjustmentRules.forEach(rule => delete rule.id);
        }

        try {
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData) });
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);
    const isStepValid = () => { /* ... validation logic ... */ return true; };

    const renderStep1 = () => (
        <>
            <h4>Step 1: Core Route Details</h4><hr />
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Route Number</Form.Label><Form.Control type="text" placeholder="e.g., 101" name="routeNumber" value={formData.routeNumber} onChange={handleChange} required /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Route Name</Form.Label><Form.Control type="text" placeholder="e.g., Central to Downtown" name="routeName" value={formData.routeName} onChange={handleChange} required /></Form.Group></Col>
            </Row>
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>From Terminal</Form.Label><Form.Control type="text" placeholder="Enter starting terminal" name="fromTerminal" value={formData.fromTerminal} onChange={handleChange} required /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>To Terminal</Form.Label><Form.Control type="text" placeholder="Enter ending terminal" name="toTerminal" value={formData.toTerminal} onChange={handleChange} required /></Form.Group></Col>
            </Row>
        </>
    );

    const renderStep2 = () => (
        <>
            <h4>Step 2: Trip Leg Details</h4><hr />
            <h5>Trip from '{formData.fromTerminal || 'Start'}' to '{formData.toTerminal || 'End'}'</h5>
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Distance (km)</Form.Label><InputGroup><Form.Control type="number" placeholder="e.g., 12.5" name="leg1.kilometers" value={formData.leg1.kilometers} onChange={handleChange} required /><InputGroup.Text>km</InputGroup.Text></InputGroup></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Time per KM (mins)</Form.Label><InputGroup><Form.Control type="number" placeholder="e.g., 5" name="leg1.timePerKm" value={formData.leg1.timePerKm} onChange={handleChange} required /><InputGroup.Text>mins</InputGroup.Text></InputGroup></Form.Group></Col>
            </Row>
            <h5 className="mt-4">Return Trip from '{formData.toTerminal || 'End'}' to '{formData.fromTerminal || 'Start'}'</h5>
            <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Distance (km)</Form.Label><InputGroup><Form.Control type="number" placeholder="e.g., 13.1" name="leg2.kilometers" value={formData.leg2.kilometers} onChange={handleChange} required /><InputGroup.Text>km</InputGroup.Text></InputGroup></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Time per KM (mins)</Form.Label><InputGroup><Form.Control type="number" placeholder="e.g., 5" name="leg2.timePerKm" value={formData.leg2.timePerKm} onChange={handleChange} required /><InputGroup.Text>mins</InputGroup.Text></InputGroup></Form.Group></Col>
            </Row>
        </>
    );

    const renderStep3 = () => (
        <>
            <h4>Step 3: Operational Details & Rules</h4><hr />
            <Card className="p-3 mb-4 bg-light">
                <Form.Label as="h5">Depot Turnout?</Form.Label>
                <ToggleButtonGroup type="radio" name="isTurnoutFromDepot" value={formData.isTurnoutFromDepot} onChange={handleToggleChange}>
                    <ToggleButton id="tbg-radio-1" value={true} variant="outline-success">Yes</ToggleButton>
                    <ToggleButton id="tbg-radio-2" value={false} variant="outline-danger">No</ToggleButton>
                </ToggleButtonGroup>
            </Card>
            {formData.isTurnoutFromDepot && (
                 <>
                    <Form.Group className="mb-4"><Form.Label as="h5">Depot Name</Form.Label><Form.Control type="text" placeholder="e.g., Central Depot" name="depotName" value={formData.depotName} onChange={handleChange} /></Form.Group>
                    <h5 className="mt-4">Depot Connection Times (mins)</h5>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Depot to "{formData.fromTerminal || 'Start'}"</Form.Label><Form.Control type="number" placeholder="e.g., 10" name="depotConnections.timeFromDepotToStart" value={formData.depotConnections.timeFromDepotToStart} onChange={handleChange} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Depot to "{formData.toTerminal || 'End'}"</Form.Label><Form.Control type="number" placeholder="e.g., 12" name="depotConnections.timeFromDepotToEnd" value={formData.depotConnections.timeFromDepotToEnd} onChange={handleChange} /></Form.Group></Col>
                    </Row>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>"{formData.fromTerminal || 'Start'}" to Depot</Form.Label><Form.Control type="number" placeholder="e.g., 11" name="depotConnections.timeFromStartToDepot" value={formData.depotConnections.timeFromStartToDepot} onChange={handleChange} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>"{formData.toTerminal || 'End'}" to Depot</Form.Label><Form.Control type="number" placeholder="e.g., 15" name="depotConnections.timeFromEndToDepot" value={formData.depotConnections.timeFromEndToDepot} onChange={handleChange} /></Form.Group></Col>
                    </Row>
                </>
            )}
            <h5 className="mt-4">Fleet & Shift Details</h5>
             <Row>
                <Col md={4}><Form.Group className="mb-3"><Form.Label>Buses Assigned</Form.Label><Form.Control type="number" placeholder="e.g., 4" name="busesAssigned" value={formData.busesAssigned} onChange={handleChange} required /></Form.Group></Col>
                <Col md={4}><Form.Group className="mb-3"><Form.Label>First Shift Start</Form.Label><Form.Control type="text" placeholder="HH:mm (e.g., 06:00)" pattern="[0-2][0-9]:[0-5][0-9]" name="serviceStartTime" value={formData.serviceStartTime} onChange={handleChange} required /><Form.Text muted>Use 24-hour format.</Form.Text></Form.Group></Col>
                <Col md={4}><Form.Group className="mb-3"><Form.Label>Duty Duration (hrs)</Form.Label><Form.Control type="number" placeholder="e.g., 8" name="dutyDurationHours" value={formData.dutyDurationHours} onChange={handleChange} required /></Form.Group></Col>
                <Col md={4}><Form.Group className="mb-3"><Form.Label>Number of Shifts</Form.Label><Form.Control type="number" placeholder="e.g., 2" name="numberOfShifts" value={formData.numberOfShifts} onChange={handleChange} required /></Form.Group></Col>
            </Row>

            <Card className="p-3 my-4 bg-light">
                <Form.Group>
                    <Form.Check type="switch" id="dynamic-second-shift-switch" label="Set a specific start time for the second shift?" name="hasDynamicSecondShift" checked={formData.hasDynamicSecondShift} onChange={handleChange}/>
                </Form.Group>
                {formData.hasDynamicSecondShift && (
                    <Form.Group className="mt-3">
                        <Form.Label>Second Shift Start Time</Form.Label>
                        <Form.Control type="text" placeholder="HH:mm (e.g., 14:30)" pattern="[0-2][0-9]:[0-5][0-9]" name="secondShiftStartTime" value={formData.secondShiftStartTime} onChange={handleChange} required={formData.hasDynamicSecondShift} />
                        <Form.Text muted>Use 24-hour format.</Form.Text>
                    </Form.Group>
                )}
            </Card>

            <h5 className="mt-4">Frequency</h5>
            <ToggleButtonGroup type="radio" name="frequencyType" value={formData.frequency.type} onChange={handleFrequencyTypeChange} className="mb-3">
                <ToggleButton id="freq-radio-1" value={'standard'} variant="outline-primary">Standard</ToggleButton>
                <ToggleButton id="freq-radio-2" value={'dynamic'} variant="outline-primary">Dynamic</ToggleButton>
            </ToggleButtonGroup>
            {formData.frequency.type === 'dynamic' && (
                <Card className="p-3 bg-light"><Row><Col md={6}><Form.Group><Form.Label>Frequency (mins)</Form.Label><Form.Control type="number" placeholder="e.g., 15" name="frequency.dynamicMinutes" value={formData.frequency.dynamicMinutes} onChange={handleChange} required min="1" /></Form.Group></Col></Row></Card>
            )}

            <h5 className="mt-4">Time Adjustment Rules</h5>
            {(formData.timeAdjustmentRules || []).map((rule, index) => (
                <Card key={rule.id || index} className="p-3 mb-3 bg-light"><Row className="align-items-end">
                    <Col md={4}><Form.Group><Form.Label>Start Time</Form.Label><Form.Control type="text" placeholder="HH:mm" pattern="[0-2][0-9]:[0-5][0-9]" value={rule.startTime} onChange={(e) => handleAdjustmentRuleChange(index, 'startTime', e.target.value)} /></Form.Group></Col>
                    <Col md={4}><Form.Group><Form.Label>End Time</Form.Label><Form.Control type="text" placeholder="HH:mm" pattern="[0-2][0-9]:[0-5][0-9]" value={rule.endTime} onChange={(e) => handleAdjustmentRuleChange(index, 'endTime', e.target.value)} /></Form.Group></Col>
                    <Col md={3}><Form.Group><Form.Label>Adjustment (mins)</Form.Label><Form.Control type="number" placeholder="e.g., 5" value={rule.timeAdjustment} onChange={(e) => handleAdjustmentRuleChange(index, 'timeAdjustment', e.target.value)} /></Form.Group></Col>
                    <Col md={1}><Button variant="outline-danger" onClick={() => handleRemoveAdjustmentRule(rule.id || index)}>X</Button></Col>
                </Row></Card>
            ))}
            <Button variant="outline-secondary" onClick={handleAddAdjustmentRule} className="mb-4">+ Add Rule</Button>

            <h5 className="mt-4">Crew Rules</h5>
            <Form.Group className="mb-3">
                <Form.Check type="switch" id="has-break-switch" label="Schedule a Crew Break for this Route?" name="crewDutyRules.hasBreak" checked={formData.crewDutyRules.hasBreak} onChange={handleChange}/>
            </Form.Group>
            {formData.crewDutyRules.hasBreak && (
                <Row>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Break Location</Form.Label>
                        <Form.Select name="crewDutyRules.breakLocation" value={formData.crewDutyRules.breakLocation} onChange={handleChange} disabled={!formData.fromTerminal && !formData.toTerminal}>
                            <option value="">Select...</option>
                            {formData.fromTerminal && <option value={formData.fromTerminal}>{formData.fromTerminal}</option>}
                            {formData.toTerminal && <option value={formData.toTerminal}>{formData.toTerminal}</option>}
                            {formData.isTurnoutFromDepot && <option value="depot">{formData.depotName || 'Depot'}</option>}
                        </Form.Select>
                    </Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Break Duration (hrs)</Form.Label><Form.Control type="number" placeholder="e.g., 0.5" name="crewDutyRules.breakDurationHours" value={Number(formData.crewDutyRules.breakDuration) / 60} onChange={handleChange} step="0.1" /></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Break Layover (mins)</Form.Label><Form.Control type="number" placeholder="e.g., 5" name="crewDutyRules.breakLayoverDuration" value={formData.crewDutyRules.breakLayoverDuration} onChange={handleChange} /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Break Window Start (mins from duty start)</Form.Label><Form.Control type="number" placeholder="e.g., 180" name="crewDutyRules.breakWindowStart" value={formData.crewDutyRules.breakWindowStart} onChange={handleChange} /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Break Window End (mins from duty start)</Form.Label><Form.Control type="number" placeholder="e.g., 300" name="crewDutyRules.breakWindowEnd" value={formData.crewDutyRules.breakWindowEnd} onChange={handleChange} /></Form.Group></Col>
                </Row>
            )}
        </>
    );

    const renderStep4 = () => (
        <>
            <h4>Step 4: Review & Submit</h4><hr/>
            <Row>
                <Col md={6} className="mb-2"><strong>Route Number:</strong><p>{formData.routeNumber}</p></Col>
                <Col md={6} className="mb-2"><strong>Route Name:</strong><p>{formData.routeName}</p></Col>
                <Col md={6} className="mb-2"><strong>From:</strong><p>{formData.fromTerminal}</p></Col>
                <Col md={6} className="mb-2"><strong>To:</strong><p>{formData.toTerminal}</p></Col>
                <Col md={6} className="mb-2"><strong>Buses:</strong><p>{formData.busesAssigned}</p></Col>
                <Col md={6} className="mb-2"><strong>First Shift Start:</strong><p>{formData.serviceStartTime}</p></Col>
                {formData.hasDynamicSecondShift && <Col md={6} className="mb-2"><strong>Second Shift Start:</strong><p>{formData.secondShiftStartTime}</p></Col>}
                <Col md={12} className="mb-2"><strong>Frequency:</strong><p>{formData.frequency.type === 'dynamic' ? `Dynamic (${formData.frequency.dynamicMinutes} mins)` : 'Standard'}</p></Col>
            </Row>
        </>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return <h2>Something went wrong.</h2>;
        }
    };

    return (
        <Container className="my-5">
            <Card className="border-0 shadow-sm">
                <Card.Header className="p-3 bg-light d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">{id ? `Edit Route: ${formData.routeName}` : 'Create New Bus Route'}</h3>
                    <Button as={Link} to="/" variant="outline-secondary" size="sm">View Dashboard</Button>
                </Card.Header>
                <Card.Body className="p-4">
                    <ProgressBar animated now={(step / totalSteps) * 100} label={`Step ${step} of ${totalSteps}`} className="mb-4" />
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : renderStepContent()}
                        <div className="mt-4 d-flex justify-content-between">
                            <Button variant="secondary" onClick={step === 1 ? () => navigate('/') : prevStep}>{step === 1 ? 'Cancel' : 'Back'}</Button>
                            {step < totalSteps ? 
                                <Button variant="primary" onClick={nextStep} disabled={!isStepValid()}>Next</Button> :
                                <Button variant="success" type="submit" disabled={loading}>{loading ? 'Saving...' : (id ? 'Update' : 'Save')}</Button>
                            }
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default BusRouteForm;
