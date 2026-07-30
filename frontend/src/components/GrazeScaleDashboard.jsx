import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Upload,
  Mic,
  MicOff,
  Scale,
  Eye,
  History,
  Award,
  Sparkle as SparkleIcon,
  CheckCircle,
} from "lucide-react";

const sampleAnimalData = {
  id: "C-9048-2201",
  name: "Nandi Pro",
  breed: "Gir / Sahiwal Heritage",
  age: "3.5 years",
  weightHistory: [
    { date: "2026-07-15", weight: 485 },
    { date: "2026-06-15", weight: 478 },
    { date: "2026-05-15", weight: 470 },
  ],
  vaccinations: [
    { date: "2026-07-01", vaccine: "FMD & HS Booster", nextDue: "2027-01-01" },
    { date: "2026-05-15", vaccine: "Anthrax Preventive", nextDue: "2026-11-15" },
  ],
  milkYield: [
    { date: "2026-07-28", yield: 26.5 },
    { date: "2026-07-27", yield: 25.8 },
    { date: "2026-07-26", yield: 27.1 },
  ],
};

const ColorfulButton = ({ children, onClick, active = false, className = "" }) => (
  <button
    onClick={onClick}
    className={`
      relative px-5 py-2.5 rounded-xl font-bold text-white transition-all duration-300
      bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600
      hover:scale-105 transform-gpu shadow-xl hover:shadow-emerald-500/30
      focus:outline-none ring-0 active:scale-95
      ${active ? "ring-4 ring-amber-300 shadow-2xl scale-105" : ""}
      ${className}
    `}
  >
    {children}
  </button>
);

const GlassCard = ({ children, className = "" }) => (
  <div
    className={`
      relative rounded-3xl p-7 border border-white/40 backdrop-blur-xl bg-white/30
      shadow-2xl hover:shadow-sky-500/10 transition-all duration-500
      ${className}
    `}
  >
    {children}
  </div>
);

const GrazeScaleDashboard = () => {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [animalData, setAnimalData] = useState(null);
  const [weightEstimate, setWeightEstimate] = useState(null);
  const fileInputRef = useRef(null);
  const muzzleInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageUpload = (event, type = "weight") => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setSelectedImage(dataUrl);
      setMeasurements(null);
      setWeightEstimate(null);
      setAnimalData(null);

      if (type === "weight") {
        simulateWeightDetection(dataUrl);
      } else {
        simulateMuzzleRecognition(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const simulateWeightDetection = (imageData) => {
    setWeightEstimate({ weight: "...", confidence: 0 });
    setTimeout(() => {
      const mockMeasurements = {
        girth: 184,
        length: 168,
        height: 142,
      };
      const estimatedWeight = Math.round(
        (mockMeasurements.girth * mockMeasurements.length * 0.86) / 100
      );

      setMeasurements(mockMeasurements);
      setWeightEstimate({
        weight: estimatedWeight,
        confidence: 92,
      });

      drawMeasurements(imageData, mockMeasurements);
    }, 1400);
  };

  const simulateMuzzleRecognition = (imageData) => {
    setTimeout(() => {
      setAnimalData(sampleAnimalData);
    }, 1200);
  };

  const drawMeasurements = (imageData, m) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const maxW = 520;
      const maxH = 380;
      let w = img.width;
      let h = img.height;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = w * ratio;
      h = h * ratio;

      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(16,185,129,0.95)";
      ctx.strokeRect(30, h * 0.42 - 10, w - 60, h * 0.22);
      drawLabel(ctx, `Girth: ${m.girth} cm`, 36, h * 0.42 - 16, "rgba(16,185,129,0.95)");

      ctx.strokeStyle = "rgba(14,165,233,0.95)";
      ctx.strokeRect(20, 20, w - 40, h - 50);
      drawLabel(ctx, `Length: ${m.length} cm`, 26, 14, "rgba(14,165,233,0.95)");
    };
    img.src = imageData;
  };

  const drawLabel = (ctx, text, x, y, bgColor) => {
    ctx.font = "bold 13px Inter, sans-serif";
    const padding = 10;
    const textMetrics = ctx.measureText(text);
    const boxW = textMetrics.width + padding * 2;
    const boxH = 26;
    roundRect(ctx, x - 2, y - boxH + 6, boxW, boxH, 8, bgColor, "rgba(255,255,255,0.95)");
    ctx.fillStyle = "white";
    ctx.fillText(text, x + padding - 2, y - 2);
  };

  const roundRect = (ctx, x, y, w, h, r, fillColor, strokeColor) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  };

  const toggleVoiceAssistant = () => {
    setIsListening((s) => !s);
  };

  useEffect(() => {
    if (selectedImage && measurements) {
      drawMeasurements(selectedImage, measurements);
    }
  }, [selectedImage, measurements]);

  return (
    <div className="relative font-sans text-slate-900 space-y-8">
      {/* Dashboard Header Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-7 rounded-3xl shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              Personalized AI Suite
            </span>
            <span className="text-xs text-slate-400 font-semibold">v2.0 • by AVparkhe</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span>🌾 GrazeScale AI Intelligence</span>
          </h2>
          <p className="text-slate-300 text-sm max-w-xl">
            Non-invasive biometric weight prediction, muzzle feature extraction, and livestock productivity logging.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleVoiceAssistant}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-xl ${
              isListening
                ? "bg-rose-600 hover:bg-rose-500 text-white animate-bounce"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            }`}
          >
            {isListening ? (
              <>
                <MicOff size={20} className="text-rose-200" />
                <span>Recording Note...</span>
              </>
            ) : (
              <>
                <Mic size={20} className="text-emerald-400" />
                <span>Voice Memo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-3">
        <ColorfulButton onClick={() => setActiveSubTab("overview")} active={activeSubTab === "overview"}>
          <SparkleIcon className="inline mr-2 w-4 h-4" /> Overview
        </ColorfulButton>
        <ColorfulButton onClick={() => setActiveSubTab("weight")} active={activeSubTab === "weight"}>
          <Scale className="inline mr-2 w-4 h-4" /> AI Weight Estimation
        </ColorfulButton>
        <ColorfulButton onClick={() => setActiveSubTab("muzzle_id")} active={activeSubTab === "muzzle_id"}>
          <Eye className="inline mr-2 w-4 h-4" /> Muzzle Verification
        </ColorfulButton>
        <ColorfulButton onClick={() => setActiveSubTab("records")} active={activeSubTab === "records"}>
          <History className="inline mr-2 w-4 h-4" /> Productivity & Health
        </ColorfulButton>
      </div>

      {/* Sub-Tab: Overview */}
      {activeSubTab === "overview" && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="border-t-4 border-t-emerald-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Scale size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Non-Invasive Weight</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload side profiles to compute girth, body length, and approximate livestock live-weight instantly via computer vision models.
                </p>
                <div className="pt-2">
                  <ColorfulButton onClick={() => setActiveSubTab("weight")}>Run Estimator</ColorfulButton>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="border-t-4 border-t-sky-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                  <Eye size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Muzzle Biometrics</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every cattle muzzle holds an immutable epidermal ridge fingerprint. Identify animals with high confidence without invasive tagging.
                </p>
                <div className="pt-2">
                  <ColorfulButton onClick={() => setActiveSubTab("muzzle_id")}>Analyze Muzzle</ColorfulButton>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="border-t-4 border-t-purple-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <Award size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Health & Milk Yields</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Maintain comprehensive vaccination timelines, seasonal weight histories, and daily milk yield production output records.
                </p>
                <div className="pt-2">
                  <ColorfulButton onClick={() => setActiveSubTab("records")}>View Analytics</ColorfulButton>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* Sub-Tab: Weight Estimation */}
      {activeSubTab === "weight" && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <GlassCard>
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h3 className="text-2xl font-black text-slate-900">AI Livestock Weight Estimation</h3>
              <p className="text-sm text-slate-600">Upload side profile images to calculate girth and length ratios.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border-2 border-dashed border-slate-300 rounded-3xl p-7 bg-slate-50/50 text-center flex flex-col justify-center items-center">
                {selectedImage ? (
                  <div className="w-full">
                    <canvas ref={canvasRef} className="w-full rounded-2xl shadow-lg bg-slate-900 object-contain" />
                  </div>
                ) : (
                  <div className="py-12 space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                      <Camera size={40} />
                    </div>
                    <p className="font-extrabold text-slate-800 text-lg">Select Side / Back Photo</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Ensure animal stands upright against a clear background for optimal bounding box accuracy.</p>
                  </div>
                )}

                <div className="mt-6 flex gap-3 justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "weight")}
                    className="hidden"
                    id="weight-upload"
                  />
                  <label htmlFor="weight-upload" className="cursor-pointer">
                    <ColorfulButton>
                      <Upload size={16} className="inline mr-2" /> Select Photo
                    </ColorfulButton>
                  </label>
                  {selectedImage && (
                    <ColorfulButton onClick={() => { setSelectedImage(null); setMeasurements(null); setWeightEstimate(null); }}>
                      Reset
                    </ColorfulButton>
                  )}
                </div>
              </div>

              <div className="space-y-6 flex flex-col justify-between">
                <div className="bg-slate-900 text-white p-7 rounded-3xl shadow-xl space-y-4">
                  <h4 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                    <Scale size={20} /> Computed Morphometrics
                  </h4>
                  {!measurements ? (
                    <p className="text-slate-400 text-sm py-8 text-center">Awaiting image upload for volumetric analysis...</p>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <span className="text-slate-400">Heart Girth (Chest)</span>
                        <span className="text-2xl font-black text-white">{measurements.girth} <small className="text-sm font-normal text-slate-400">cm</small></span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <span className="text-slate-400">Body Length</span>
                        <span className="text-2xl font-black text-white">{measurements.length} <small className="text-sm font-normal text-slate-400">cm</small></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Withers Height</span>
                        <span className="text-2xl font-black text-white">{measurements.height} <small className="text-sm font-normal text-slate-400">cm</small></span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-7 rounded-3xl shadow-xl space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-200">Live Weight Estimate</h4>
                  {!weightEstimate ? (
                    <p className="text-emerald-100/70 text-sm py-2">Run estimation model to generate weight report.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-5xl font-black flex items-baseline gap-2">
                        <span>{weightEstimate.weight}</span>
                        <span className="text-xl font-medium text-emerald-200">kg</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-emerald-200 font-semibold">
                          <span>AI Prediction Confidence</span>
                          <span>{weightEstimate.confidence}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${weightEstimate.confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Sub-Tab: Muzzle Identification */}
      {activeSubTab === "muzzle_id" && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <GlassCard>
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h3 className="text-2xl font-black text-slate-900">Epidermal Muzzle Biometrics</h3>
              <p className="text-sm text-slate-600">Cross-reference unique nasal bead patterns against verified cattle records.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border-2 border-dashed border-slate-300 rounded-3xl p-7 bg-slate-50/50 text-center flex flex-col justify-center items-center">
                {selectedImage ? (
                  <div className="space-y-3 w-full">
                    <img src={selectedImage} alt="muzzle preview" className="mx-auto max-h-64 object-contain rounded-2xl shadow-lg bg-slate-900 p-2" />
                    <p className="text-xs font-semibold text-emerald-600 animate-pulse">✓ Extracting SIFT feature vectors...</p>
                  </div>
                ) : (
                  <div className="py-12 space-y-4">
                    <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto text-sky-600 shadow-inner">
                      <Eye size={40} />
                    </div>
                    <p className="font-extrabold text-slate-800 text-lg">Upload Muzzle Print</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Ensure crisp focus on the central granular beads of the muzzle.</p>
                  </div>
                )}

                <div className="mt-6 flex gap-3 justify-center">
                  <input
                    ref={muzzleInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "muzzle")}
                    className="hidden"
                    id="muzzle-upload"
                  />
                  <label htmlFor="muzzle-upload" className="cursor-pointer">
                    <ColorfulButton>
                      <Upload size={16} className="inline mr-2" /> Select Muzzle Image
                    </ColorfulButton>
                  </label>
                  {selectedImage && (
                    <ColorfulButton onClick={() => { setSelectedImage(null); setAnimalData(null); }}>
                      Clear
                    </ColorfulButton>
                  )}
                </div>
              </div>

              <div>
                {animalData ? (
                  <div className="bg-white rounded-3xl p-7 shadow-xl border border-slate-100 space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center w-max gap-1 mb-2">
                          <CheckCircle size={14} /> Biometric Match Verified
                        </span>
                        <h4 className="text-2xl font-black text-slate-900">{animalData.name}</h4>
                        <p className="text-sm font-semibold text-sky-600">ID: {animalData.id}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400">Breed Specie</span>
                        <p className="font-bold text-slate-800">{animalData.breed}</p>
                        <p className="text-xs text-slate-500">Age: {animalData.age}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Scale size={16} className="text-emerald-500" /> Recorded Weight Log
                      </h5>
                      <div className="grid grid-cols-3 gap-2">
                        {animalData.weightHistory.map((r, i) => (
                          <div key={i} className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                            <span className="block text-xs text-slate-400 font-medium">{r.date}</span>
                            <span className="text-base font-black text-slate-800">{r.weight} <small className="font-normal">kg</small></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 bg-slate-50/50 rounded-3xl border border-slate-200">
                    <Eye size={36} className="mb-2 opacity-40" />
                    <p className="font-medium text-center">Upload a muzzle scan to display verified livestock profiles and historical health records.</p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Sub-Tab: Records & Analytics */}
      {activeSubTab === "records" && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <GlassCard>
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h3 className="text-2xl font-black text-slate-900">Livestock Productivity Dashboard</h3>
              <p className="text-sm text-slate-600">Cross-sectional sample metrics for herd health, immunization status, and milk yield trends.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 space-y-4">
                <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 text-sky-600">
                  <Award size={20} /> Immunization & Booster Timelines
                </h4>
                <div className="divide-y divide-slate-100">
                  {sampleAnimalData.vaccinations.map((v, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 block">{v.vaccine}</span>
                        <span className="text-xs font-medium text-slate-400">Administered: {v.date}</span>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-xs">
                        Due: {v.nextDue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 space-y-4">
                <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 text-emerald-600">
                  <History size={20} /> Recent Milk Yield Production
                </h4>
                <div className="space-y-3">
                  {sampleAnimalData.milkYield.map((r, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                      <span className="text-sm font-semibold text-slate-600">{r.date}</span>
                      <span className="font-black text-slate-900 text-lg">{r.yield} <small className="text-sm font-normal text-slate-500">Liters / day</small></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Floating Voice Indicator */}
      {isListening && (
        <div className="fixed bottom-8 right-8 bg-gradient-to-r from-rose-600 to-pink-600 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce flex items-center gap-3 z-50 font-bold border border-white/20">
          <span className="w-3 h-3 rounded-full bg-white animate-ping" />
          <span>Listening for voice observation notes...</span>
          <button onClick={toggleVoiceAssistant} className="text-xs bg-white/20 px-2.5 py-1 rounded-lg ml-2 hover:bg-white/30">Stop</button>
        </div>
      )}
    </div>
  );
};

export default GrazeScaleDashboard;
