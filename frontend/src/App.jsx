import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Search, FileText, Home, List, Clock, 
  CheckCircle, XCircle, AlertCircle, Component 
} from 'lucide-react';
import UploadForm from "./components/UploadForm";
import GrazeScaleDashboard from "./components/GrazeScaleDashboard";

const API_URL = process.env.REACT_APP_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname.includes('onrender.com') || window.location.hostname.includes('vercel.app'))
    ? 'https://grazescale-ai.onrender.com' 
    : 'http://localhost:8000');

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
    `flex items-center w-full px-4 py-3 rounded-xl transition-all duration-300 font-bold mb-1 ${
      activeTab === tabName 
        ? 'bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-600/40 scale-[1.02]' 
        : 'text-slate-800 hover:bg-white/60 hover:text-sky-900 backdrop-blur-md'
    }`
  );

  return (
    <div className="relative min-h-screen text-slate-900 font-sans overflow-x-hidden">
      {/* Background Cattle Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-90 scale-105 transition-all duration-700"
      >
        <source src="/cattle-video.mp4" type="video/mp4" />
      </video>

      {/* Subtle Frosted Dark Overlay over Video */}
      <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-[3px] z-0 pointer-events-none" />

      {/* Main Layout Container */}
      <div className="relative z-10 min-h-screen flex w-full">

        {/* Rebranded Frosted Glass Sidebar */}
        <aside className="w-64 p-5 bg-white/40 shadow-2xl sticky top-0 h-screen backdrop-blur-2xl border-r border-white/50 flex flex-col justify-between z-20">
          <div>
            <div className="text-2xl font-black text-slate-900 flex items-center mb-1">
              <Component className="w-7 h-7 mr-2 text-sky-600" />
              GrazeScale AI
            </div>
            <div className="text-xs font-extrabold text-sky-800 mb-8 tracking-wider uppercase">by AVparkhe</div>
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
          <div className="p-3 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 text-center shadow-lg">
            <p className="text-xs font-bold text-sky-900">Production Ready</p>
            <a href="https://github.com/AVparkhe" target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-sky-700 hover:underline">github.com/AVparkhe</a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-10 space-y-8 max-w-6xl mx-auto">
          
          {/* Message Alert */}
          {renderMessage()}

          {/* Home Tab - Hero Section */}
          {activeTab === 'home' && (
            <div className="flex flex-col lg:flex-row items-center bg-white/40 rounded-3xl shadow-2xl p-8 overflow-hidden backdrop-blur-2xl border border-white/60">
              <div className="lg:w-1/2 space-y-4">
                <span className="text-sm font-bold text-sky-900 bg-sky-200/70 px-3.5 py-1.5 rounded-full border border-sky-300/60 shadow-sm">
                  Biometric Identification
                </span>
                <h1 className="text-4xl font-black text-slate-900 leading-tight">
                  Cattle Muzzle <span className="text-sky-600">Recognition</span>
                </h1>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  <button 
                    onClick={() => setActiveTab('register')}
                    className="inline-flex items-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl shadow-xl text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all transform hover:scale-[1.02]"
                  >
                    Register New Cattle <FileText className="w-5 h-5 ml-2" />
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('grazescale')}
                    className="inline-flex items-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl shadow-xl text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform hover:scale-[1.02]"
                  >
                    AI Weight Estimation <Camera className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </div>
              <div className="lg:w-1/2 mt-6 lg:mt-0 lg:pl-8">
                <img 
                  src="/2FadMhn5.jpg" 
                  alt="Cattle Muzzle Recognition" 
                  className="rounded-3xl shadow-2xl object-cover w-full h-72 border-2 border-white/60"
                />
              </div>
            </div>
          )}

          {/* Registration Tab */}
          {activeTab === 'register' && (
            <div className="bg-white/40 rounded-3xl shadow-2xl overflow-hidden p-8 backdrop-blur-2xl border border-white/60">
              <div className="border-b border-slate-900/20 pb-4 mb-6">
                <h2 className="text-3xl font-black text-slate-900">Cattle Registration</h2>
                <p className="text-slate-800 mt-1 font-bold">Register new cattle by capturing and uploading a unique muzzle image.</p>
              </div>

              <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
                  {/* Image Upload Section */}
                  <div className="md:w-1/2">
                    <label className="block text-sm font-bold text-slate-900 mb-2">Muzzle Image</label>
                    <div 
                      className={`h-56 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition duration-200 bg-white/40 backdrop-blur-md ${
                        registrationPreview ? 'border-sky-600 shadow-xl' : 'border-slate-400/80 hover:border-sky-500 hover:bg-white/60'
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
                        <img src={registrationPreview} alt="Muzzle Preview" className="h-full w-full object-cover rounded-2xl" />
                      ) : (
                        <div className="text-center p-4">
                          <Upload className="w-8 h-8 mx-auto text-sky-600" />
                          <p className="mt-2 text-sm font-bold text-slate-900">Click to upload or drag & drop</p>
                          <p className="text-xs font-semibold text-slate-700">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="md:w-1/2 space-y-4">
                    <h3 className="text-xl font-black text-slate-900 border-b border-slate-900/20 pb-2 mb-3">Owner & Cattle Details</h3>
                    <div>
                      <label htmlFor="owner_name" className="block text-sm font-bold text-slate-900">Owner Name</label>
                      <input
                        type="text"
                        name="owner_name"
                        id="owner_name"
                        value={registrationData.owner_name}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-xl border-white/80 shadow-md focus:border-sky-500 focus:ring-sky-500 p-3 border bg-white/70 focus:bg-white text-slate-900 font-bold placeholder-slate-500 backdrop-blur-md"
                        placeholder="Akanksha Parkhe"
                      />
                    </div>
                    <div>
                      <label htmlFor="owner_contact" className="block text-sm font-bold text-slate-900">Owner Contact</label>
                      <input
                        type="text"
                        name="owner_contact"
                        id="owner_contact"
                        value={registrationData.owner_contact}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-xl border-white/80 shadow-md focus:border-sky-500 focus:ring-sky-500 p-3 border bg-white/70 focus:bg-white text-slate-900 font-bold placeholder-slate-500 backdrop-blur-md"
                        placeholder="9876543210"
                      />
                    </div>
                    <div>
                      <label htmlFor="breed" className="block text-sm font-bold text-slate-900">Breed</label>
                      <input
                        type="text"
                        name="breed"
                        id="breed"
                        value={registrationData.breed}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-xl border-white/80 shadow-md focus:border-sky-500 focus:ring-sky-500 p-3 border bg-white/70 focus:bg-white text-slate-900 font-bold placeholder-slate-500 backdrop-blur-md"
                        placeholder="Holstein Friesian"
                      />
                    </div>
                    <div>
                      <label htmlFor="age" className="block text-sm font-bold text-slate-900">Age (years)</label>
                      <input
                        type="number"
                        name="age"
                        id="age"
                        value={registrationData.age}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="mt-1 block w-full rounded-xl border-white/80 shadow-md focus:border-sky-500 focus:ring-sky-500 p-3 border bg-white/70 focus:bg-white text-slate-900 font-bold placeholder-slate-500 backdrop-blur-md"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl shadow-xl text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition duration-200 transform hover:scale-[1.01]"
                  >
                    {loading ? 'Registering...' : <><FileText className="w-5 h-5 mr-2" /> Complete Registration</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* GrazeScale Tab */}
          {activeTab === 'grazescale' && (
            <GrazeScaleDashboard />
          )}

          {/* Verification Tab */}
          {activeTab === 'verify' && (
            <div className="bg-white/40 rounded-3xl shadow-2xl overflow-hidden p-8 backdrop-blur-2xl border border-white/60">
              <div className="border-b border-slate-900/20 pb-4 mb-6">
                <h2 className="text-3xl font-black text-slate-900">Cattle Verification</h2>
                <p className="text-slate-800 mt-1 font-bold">Upload a muzzle image to verify identity against registered database.</p>
              </div>

              <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
                <div className="md:w-1/2 space-y-4">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Verification Muzzle Image</label>
                  <div 
                    className={`h-56 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition duration-200 bg-white/40 backdrop-blur-md ${
                      verificationPreview ? 'border-sky-600 shadow-xl' : 'border-slate-400/80 hover:border-sky-500 hover:bg-white/60'
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
                      <img src={verificationPreview} alt="Muzzle Preview" className="h-full w-full object-cover rounded-2xl" />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="w-8 h-8 mx-auto text-sky-600" />
                        <p className="mt-3 text-sm font-bold text-slate-900">Click to upload image</p>
                        <p className="text-xs font-semibold text-slate-700">Upload a clear muzzle image</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleVerificationSubmit}
                    disabled={loading || !verificationFile}
                    className="w-full inline-flex justify-center items-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl shadow-xl text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition duration-200 transform hover:scale-[1.01]"
                  >
                    {loading ? 'Verifying...' : <><Search className="w-5 h-5 mr-2" /> Run Verification</>}
                  </button>
                </div>

                <div className="md:w-1/2 p-6 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 space-y-4 shadow-lg">
                  <h3 className="text-xl font-black text-slate-900 border-b border-slate-900/20 pb-2 mb-4">Verification Status</h3>
                  
                  {verificationResult ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700">Result:</span>
                        {getDecisionBadge(verificationResult.is_matched ? 'MATCHED' : 'UNMATCHED')}
                      </div>
                      <div className="bg-white/60 p-4 rounded-xl shadow-inner border border-white/80">
                          <p className="text-sm font-bold text-slate-800">Confidence Score:</p>
                          <p className={`text-3xl font-black ${verificationResult.confidence > 0.8 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {(verificationResult.confidence * 100).toFixed(2)}%
                          </p>
                      </div>
                      
                      {registeredCattle && (
                        <div className="border-t border-slate-900/20 pt-4 space-y-2">
                          <h4 className="text-base font-extrabold text-sky-800">Matched Cattle Details:</h4>
                          <p className="text-sm font-bold"><span className="text-slate-700">Cattle ID:</span> <span className="text-sky-700 font-black">{registeredCattle.cattle_id}</span></p>
                          <p className="text-sm font-bold"><span className="text-slate-700">Owner:</span> {registeredCattle.owner_name}</p>
                          <p className="text-sm font-bold"><span className="text-slate-700">Breed:</span> {registeredCattle.breed}</p>
                          <p className="text-sm font-bold"><span className="text-slate-700">Registered:</span> {new Date(registeredCattle.registration_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-700 font-bold">
                      <AlertCircle className="w-10 h-10 mx-auto text-sky-600 mb-2" />
                      <p className="font-extrabold">Upload an image and click 'Run Verification'</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cattle List Tab */}
          {activeTab === 'list' && (
            <div className="bg-white/40 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl border border-white/60 p-8">
              <div className="border-b border-slate-900/20 pb-4 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Registered Cattle Registry</h2>
                  <p className="text-slate-800 mt-1 font-bold">A complete list of all cattle registered in the system.</p>
                </div>
                <button
                  onClick={fetchCattleList}
                  className="inline-flex items-center px-4 py-2 border border-white/80 text-sm font-bold rounded-xl text-slate-900 bg-white/60 hover:bg-white shadow-md transition duration-150"
                >
                  <List className="w-4 h-4 mr-2" /> Refresh List
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-900/10">
                  <thead className="bg-white/50 backdrop-blur-md"> 
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-wider">Cattle ID</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-wider">Owner Name</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-wider">Breed</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-wider">Age</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-wider">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/10 bg-white/20 backdrop-blur-sm">
                    {Array.isArray(cattleList) && cattleList.map((cattle) => (
                      <tr key={cattle.cattle_id} className="hover:bg-white/50 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-sky-700">{cattle.cattle_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{cattle.owner_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{cattle.breed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{cattle.age}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                          {new Date(cattle.registration_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cattleList.length === 0 && (
                  <div className="text-center p-12 text-slate-700 font-bold">No cattle registered yet.</div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="bg-white/40 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl border border-white/60 p-8">
              <div className="border-b border-slate-900/20 pb-4 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Verification Logs</h2>
                  <p className="text-slate-800 mt-1 font-bold">Recent verification attempts and matching decisions.</p>
                </div>
                <button
                  onClick={fetchLogs}
                  className="inline-flex items-center px-4 py-2 border border-white/80 text-sm font-bold rounded-xl text-slate-900 bg-white/60 hover:bg-white shadow-md transition duration-150"
                >
                  <Clock className="w-4 h-4 mr-2" /> Refresh Logs
                </button>
              </div>
              <div className="divide-y divide-slate-900/10">
                {logs.map((log, idx) => (
                  <div key={idx} className="p-5 hover:bg-white/50 transition duration-150 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-black text-lg text-slate-900">Cattle ID: <span className="text-sky-700">{log.matched_cattle_id || 'Unknown'}</span></p>
                        <p className="text-sm text-slate-800 mt-1 font-bold">
                          Confidence: <span className="font-extrabold text-slate-900">{log.confidence * 100 ? (log.confidence * 100).toFixed(2) : '0.00'}%</span> • {new Date(log.verification_date).toLocaleString()}
                        </p>
                      </div>
                      {getDecisionBadge(log.decision)}
                    </div>
                  </div>
                ))}
              </div>
              {logs.length === 0 && (
                  <div className="text-center p-12 text-slate-700 font-bold">No verification logs recorded.</div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default CattleRecognitionSystem;