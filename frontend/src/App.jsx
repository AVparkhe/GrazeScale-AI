import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Search, FileText, Home, List, Clock, 
  CheckCircle, XCircle, AlertCircle, Component 
} from 'lucide-react';
import UploadForm from "./components/UploadForm";
import GrazeScaleDashboard from "./components/GrazeScaleDashboard";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper function to render decision badges with light, decent colors
const getDecisionBadge = (decision) => {
  switch (decision) {
    case 'MATCHED':
      return (
        <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
          <CheckCircle className="w-4 h-4 mr-1.5" /> Matched
        </span>
      );
    case 'UNMATCHED':
      return (
        <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
          <XCircle className="w-4 h-4 mr-1.5" /> Unmatched
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-4 h-4 mr-1.5" /> Pending
        </span>
      );
  }
};

const CattleRecognitionSystem = () => {
  const [activeTab, setActiveTab] = useState('home');

  // Registration states
  const [registrationData, setRegistrationData] = useState({
    owner_name: '',
    owner_contact: '',
    breed: '',
    age: ''
  });
  const [registrationFile, setRegistrationFile] = useState(null);
  const [registrationPreview, setRegistrationPreview] = useState(null);

  // Verification states
  const [verificationFile, setVerificationFile] = useState(null);
  const [verificationPreview, setVerificationPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [cattleList, setCattleList] = useState([]); 
  const [verificationResult, setVerificationResult] = useState(null);
  const [registeredCattle, setRegisteredCattle] = useState(null);
  const [logs, setLogs] = useState([]);

  const registrationInputRef = useRef(null);
  const verificationInputRef = useRef(null);

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === 'list') fetchCattleList();
    else if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  // API calls
  const fetchCattleList = async () => {
    try {
      const response = await fetch(`${API_URL}/cattle`);
      const data = await response.json();
      // Defensive check for API response
      setCattleList(Array.isArray(data) ? data : []); 
    } catch (error) {
      console.error('Error fetching cattle list:', error);
      setCattleList([]); // Ensure state is array on error
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/logs`);
      const data = await response.json();
      setLogs(Array.isArray(data) ? data.sort((a, b) => new Date(b.verification_date) - new Date(a.verification_date)) : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]); // Ensure state is array on error
    }
  };

  // File change handlers
  const handleRegistrationFileChange = (e) => {
    const file = e.target.files[0];
    setRegistrationFile(file);
    setRegistrationPreview(file ? URL.createObjectURL(file) : null);
    setMessage(null);
    setVerificationResult(null);
    setRegisteredCattle(null);
  };

  const handleVerificationFileChange = (e) => {
    const file = e.target.files[0];
    setVerificationFile(file);
    setVerificationPreview(file ? URL.createObjectURL(file) : null);
    setMessage(null);
    setVerificationResult(null);
    setRegisteredCattle(null);
  };

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({ ...prev, [name]: value }));
  };

  // Registration submission
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    if (!registrationFile) {
      setMessage({ type: 'error', text: 'Please select a muzzle image for registration.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('muzzle_image', registrationFile);
    formData.append('owner_name', registrationData.owner_name);
    formData.append('owner_contact', registrationData.owner_contact);
    formData.append('breed', registrationData.breed);
    formData.append('age', registrationData.age);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `Cattle ID ${data.cattle_id} successfully registered!` });
        setRegistrationData({ owner_name: '', owner_contact: '', breed: '', age: '' });
        setRegistrationFile(null);
        setRegistrationPreview(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Registration failed.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Could not connect to the server.' });
    } finally {
      setLoading(false);
    }
  };

  // Verification submission
  const handleVerificationSubmit = async () => {
    if (!verificationFile) {
      setMessage({ type: 'error', text: 'Please select a muzzle image for verification.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setVerificationResult(null);
    setRegisteredCattle(null);

    const formData = new FormData();
    formData.append('muzzle_image', verificationFile);

    try {
      const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setVerificationResult(data);
        if (data.is_matched && data.matched_cattle) {
          setRegisteredCattle(data.matched_cattle);
        }
        setMessage({ type: 'success', text: data.is_matched ? 'Verification Successful! Muzzle matched.' : 'Verification Failed. No match found.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Verification failed.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Could not connect to the server.' });
    } finally {
      setLoading(false);
    }
  };

  // Render message
  const renderMessage = () => {
    if (!message) return null;
    const isSuccess = message.type === 'success';
    const bgColor = isSuccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700';
    const Icon = isSuccess ? CheckCircle : AlertCircle;

    return (
      <div className={`p-4 mb-6 rounded-lg border flex items-start ${bgColor}`} role="alert">
        <Icon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
        <p className="font-medium text-sm">{message.text}</p>
      </div>
    );
  };

  const getSidebarItemClasses = (tabName) => (
    `flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-semibold mb-1 ${
      activeTab === tabName 
        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30' 
        : 'text-slate-700 hover:bg-white/70 hover:text-sky-700'
    }`
  );

  return (
    <div className="min-h-screen flex text-slate-900 bg-gradient-to-br from-slate-100 via-slate-50 to-sky-50">
      
      {/* Rebranded Sidebar */}
      <aside className="w-60 p-5 bg-white/60 shadow-xl sticky top-0 h-screen backdrop-blur-md border-r border-white/40 flex flex-col justify-between">
        <div>
          <div className="text-2xl font-black text-slate-900 flex items-center mb-1">
            <Component className="w-7 h-7 mr-2 text-sky-600" />
            GrazeScale AI
          </div>
          <div className="text-xs font-extrabold text-sky-700 mb-8 tracking-wider uppercase">by AVparkhe</div>
          <nav className="space-y-1">
            <button className={getSidebarItemClasses('home')} onClick={() => setActiveTab('home')}>
              <Home className="w-5 h-5 mr-3" /> Home
            </button>
            <button className={getSidebarItemClasses('grazescale')} onClick={() => setActiveTab('grazescale')}>
              <Camera className="w-5 h-5 mr-3 text-emerald-600" /> AI Dashboard
            </button>
            <button className={getSidebarItemClasses('register')} onClick={() => setActiveTab('register')}>
              <FileText className="w-5 h-5 mr-3" /> Register Cattle
            </button>
            <button className={getSidebarItemClasses('verify')} onClick={() => setActiveTab('verify')}>
              <Search className="w-5 h-5 mr-3" /> Verify Muzzle
            </button>
            <button className={getSidebarItemClasses('list')} onClick={() => setActiveTab('list')}>
              <List className="w-5 h-5 mr-3" /> Cattle Registry
            </button>
            <button className={getSidebarItemClasses('logs')} onClick={() => setActiveTab('logs')}>
              <Clock className="w-5 h-5 mr-3" /> Verification Logs
            </button>
          </nav>
        </div>
        <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-center">
          <p className="text-xs font-bold text-sky-800">Production Ready</p>
          <a href="https://github.com/AVparkhe" target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-sky-600 hover:underline">github.com/AVparkhe</a>
        </div>
      </aside>

      {/* Main Content Area - EXPANDED WIDTH FOR MODERN UX */}
      <main className="flex-1 p-10 space-y-8 max-w-6xl mx-auto">
        
        {/* Message Alert */}
        {renderMessage()}

        {/* Home Tab - Hero Section - Minimized text, translucent background and blur */}
        {activeTab === 'home' && (
          <div className="flex flex-col lg:flex-row items-center bg-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden backdrop-blur-md">
            <div className="lg:w-1/2 space-y-4">
              <span className="text-sm font-semibold text-sky-600 bg-sky-100/50 px-3 py-1 rounded-full">
                Biometric Identification
              </span>
              <h1 className="text-4xl font-extrabold text-black leading-tight">
                Cattle Muzzle <span className="text-sky-600">Recognition</span>
              </h1>
              {/* REMOVED: Descriptive Paragraph */}
              
              <button 
                onClick={() => setActiveTab('register')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition duration-150"
              >
                Register New Cattle <Component className="w-5 h-5 ml-2" />
              </button>
            </div>
            <div className="lg:w-1/2 mt-6 lg:mt-0 lg:pl-8">
              {/* Image of a happy cow - Placeholder for one of your images */}
              <img 
                src="/2FadMhn5.jpg" 
                alt="Cattle Muzzle Recognition" 
                className="rounded-3xl shadow-xl object-cover w-full h-72"
              />
            </div>
          </div>
        )}

        {/* Registration Tab - Translucent background and blur */}
        {activeTab === 'register' && (
          <div className="bg-white/10 rounded-xl shadow-2xl overflow-hidden p-6 backdrop-blur-md">
            <div className="border-b border-black/30 pb-4 mb-5">
              <h2 className="text-2xl font-bold text-black">Cattle Registration</h2>
              <p className="text-black/80 mt-1 font-semibold">Register new cattle by capturing and uploading a unique muzzle image.</p>
            </div>

            <form onSubmit={handleRegistrationSubmit} className="space-y-5">
              {/* Image Upload Section */}
              <div className="flex flex-col md:flex-row space-y-5 md:space-y-0 md:space-x-6">
                <div className="md:w-1/2">
                  <label className="block text-sm font-semibold text-black/90 mb-2">Muzzle Image</label>
                  <div 
                    className={`h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition duration-150 bg-black/5 ${
                      registrationPreview ? 'border-sky-500' : 'border-black/30 hover:border-sky-400'
                    }`}
                    onClick={() => registrationInputRef.current.click()}
                  >
                    <input
                      type="file"
                      ref={registrationInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleRegistrationFileChange}
                      disabled={loading}
                    />
                    {registrationPreview ? (
                      <img src={registrationPreview} alt="Muzzle Preview" className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-7 h-7 mx-auto text-sky-600" />
                        <p className="mt-2 text-sm font-semibold text-black/90">Click to upload or drag & drop</p>
                        <p className="text-xs text-black/60">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Registration Details Section */}
                <div className="md:w-1/2 space-y-3">
                  <h3 className="text-lg font-semibold text-black border-b pb-1 mb-3">Owner & Cattle Details</h3>
                  <div>
                    <label htmlFor="owner_name" className="block text-sm font-semibold text-black/90">Owner Name</label>
                    <input
                      type="text"
                      name="owner_name"
                      id="owner_name"
                      value={registrationData.owner_name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-black/30 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border bg-white/50 text-black font-semibold placeholder-black/60"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner_contact" className="block text-sm font-semibold text-black/90">Owner Contact</label>
                    <input
                      type="text"
                      name="owner_contact"
                      id="owner_contact"
                      value={registrationData.owner_contact}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-black/30 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border bg-white/50 text-black font-semibold placeholder-black/60"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label htmlFor="breed" className="block text-sm font-semibold text-black/90">Breed</label>
                    <input
                      type="text"
                      name="breed"
                      id="breed"
                      value={registrationData.breed}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-black/30 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border bg-white/50 text-black font-semibold placeholder-black/60"
                      placeholder="Holstein Friesian"
                    />
                  </div>
                  <div>
                    <label htmlFor="age" className="block text-sm font-semibold text-black/90">Age (years)</label>
                    <input
                      type="number"
                      name="age"
                      id="age"
                      value={registrationData.age}
                      onChange={handleInputChange}
                      required
                      min="0"
                      className="mt-1 block w-full rounded-lg border-black/30 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border bg-white/50 text-black font-semibold placeholder-black/60"
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition duration-150"
                >
                  {loading ? 'Registering...' : <><FileText className="w-5 h-5 mr-2" /> Complete Registration</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* GrazeScale Tab - Weight Estimation */}
        {activeTab === 'grazescale' && (
          <div className="bg-white/10 rounded-xl shadow-2xl overflow-hidden p-6 backdrop-blur-md">
            <div className="border-b border-black/30 pb-4 mb-5">
              <h2 className="text-2xl font-bold text-black">GrazeScale — Weight Estimation</h2>
              <p className="text-black/80 mt-1 font-semibold">Estimate cattle weight using image analysis</p>
            </div>
            <UploadForm />
          </div>
        )}

        {/* Verification Tab - Translucent background and blur */}
        {activeTab === 'verify' && (
          <div className="bg-white/10 rounded-xl shadow-2xl overflow-hidden p-6 backdrop-blur-md">
            <div className="border-b border-black/30 pb-4 mb-5">
              <h2 className="text-2xl font-bold text-black">Cattle Verification</h2>
              <p className="text-black/80 mt-1 font-semibold">Upload a muzzle image to verify the cattle's identity against the database.</p>
            </div>

            <div className="flex flex-col md:flex-row space-y-5 md:space-y-0 md:space-x-6">
              {/* Image Upload & Action */}
              <div className="md:w-1/2 space-y-4">
                <label className="block text-sm font-semibold text-black/90 mb-2">Verification Image</label>
                <div 
                  className={`h-56 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition duration-150 bg-black/5 ${
                    verificationPreview ? 'border-sky-500' : 'border-black/30 hover:border-sky-400'
                  }`}
                  onClick={() => verificationInputRef.current.click()}
                >
                  <input
                    type="file"
                    ref={verificationInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleVerificationFileChange}
                    disabled={loading}
                  />
                  {verificationPreview ? (
                    <img src={verificationPreview} alt="Muzzle Preview" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="w-8 h-8 mx-auto text-sky-600" />
                      <p className="mt-3 text-sm font-semibold text-black/90">Click to upload or use camera</p>
                      <p className="text-xs text-black/60">Upload a clear muzzle image</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleVerificationSubmit}
                  disabled={loading || !verificationFile}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition duration-150"
                >
                  {loading ? 'Verifying...' : <><Search className="w-5 h-5 mr-2" /> Run Verification</>}
                </button>
              </div>

              {/* Verification Result - Translucent background */}
              <div className="md:w-1/2 p-4 bg-black/5 rounded-xl space-y-4">
                <h3 className="text-xl font-semibold text-black border-b pb-2 mb-4">Verification Status</h3>
                
                {verificationResult ? (
                  <div className="space-y-4">
                    <p className="text-lg font-bold">
                      Decision: {getDecisionBadge(verificationResult.is_matched ? 'MATCHED' : 'UNMATCHED')}
                    </p>
                    <div className="bg-white/20 p-4 rounded-lg shadow-inner border border-black/30">
                        <p className="text-sm font-semibold text-black/90">Confidence Score:</p>
                        <p className={`text-2xl font-extrabold ${verificationResult.confidence > 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {(verificationResult.confidence * 100).toFixed(2)}%
                        </p>
                    </div>
                    
                    {registeredCattle && (
                      <div className="border-t border-black/30 pt-4 space-y-2">
                        <h4 className="text-base font-semibold text-sky-600">Matched Cattle Details:</h4>
                        <p className="text-sm font-semibold"><span className="font-bold text-black">Cattle ID:</span> {registeredCattle.cattle_id}</p>
                        <p className="text-sm font-semibold"><span className="font-bold text-black">Owner:</span> {registeredCattle.owner_name}</p>
                        <p className="text-sm font-semibold"><span className="font-bold text-black">Breed:</span> {registeredCattle.breed}</p>
                        <p className="text-sm font-semibold"><span className="font-bold text-black">Registered:</span> {new Date(registeredCattle.registration_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-black/60 font-semibold">
                    <AlertCircle className="w-10 h-10 mx-auto" />
                    <p className="mt-2 font-semibold">Upload an image and click 'Run Verification'</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cattle List Tab - Translucent background and blur */}
        {activeTab === 'list' && (
          <div className="bg-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="p-6 border-b border-black/30 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-black">Registered Cattle List</h2>
                <p className="text-black/80 mt-1 font-semibold">A complete list of all cattle registered in the system.</p>
              </div>
              <button
                onClick={fetchCattleList}
                className="inline-flex items-center px-4 py-2 border border-black/30 text-sm font-semibold rounded-xl text-black bg-black/5 hover:bg-white/20 shadow-sm"
              >
                <List className="w-4 h-4 mr-2" /> Refresh List
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-black/30">
                <thead className="bg-black/10"> 
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-black/90 uppercase tracking-wider">Cattle ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-black/90 uppercase tracking-wider">Owner Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-black/90 uppercase tracking-wider">Breed</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-black/90 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-black/90 uppercase tracking-wider">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-black/30">
                  {/* FIX: Defensive check before calling .map() */}
                  {Array.isArray(cattleList) && cattleList.map((cattle) => (
                    <tr key={cattle.cattle_id} className="hover:bg-white/20 transition duration-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-sky-600">{cattle.cattle_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-black">{cattle.owner_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-black/80">{cattle.breed}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-black/80">{cattle.age}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-black/80">
                        {new Date(cattle.registration_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cattleList.length === 0 && (
                <div className="text-center p-10 text-black/60 font-semibold">No cattle registered yet.</div>
            )}
          </div>
        )}

        {/* Logs Tab - Translucent background and blur */}
        {activeTab === 'logs' && (
          <div className="bg-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="p-6 border-b border-black/30 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-black">Verification Logs</h2>
                <p className="text-black/80 mt-1 font-semibold">Recent verification attempts and their outcomes.</p>
              </div>
              <button
                onClick={fetchLogs}
                className="inline-flex items-center px-4 py-2 border border-black/30 text-sm font-semibold rounded-xl text-black bg-black/5 hover:bg-white/20 shadow-sm"
              >
                <Clock className="w-4 h-4 mr-2" /> Refresh Logs
              </button>
            </div>
            <div className="divide-y divide-black/30">
              {logs.map((log, idx) => (
                <div key={idx} className="p-6 hover:bg-white/20 transition duration-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-black">Cattle ID: <span className="text-sky-600">{log.matched_cattle_id || 'Unknown'}</span></p>
                      <p className="text-sm text-black/80 mt-1 font-semibold">
                        Confidence: <span className="font-bold text-black">{log.confidence * 100 ? (log.confidence * 100).toFixed(2) : '0.00'}%</span> • {new Date(log.verification_date).toLocaleString()}
                      </p>
                    </div>
                    {getDecisionBadge(log.decision)}
                  </div>
                </div>
              ))}
            </div>
            {logs.length === 0 && (
                <div className="text-center p-10 text-black/60 font-semibold">No verification logs found.</div>
            )}
          </div>
        )}

        {/* GrazeScale AI Intelligence Dashboard Tab */}
        {activeTab === 'grazescale' && (
          <GrazeScaleDashboard />
        )}
      </main>
    </div>
  );
};

export default CattleRecognitionSystem;