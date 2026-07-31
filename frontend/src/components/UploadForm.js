import React, { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname.includes('onrender.com') || window.location.hostname.includes('vercel.app'))
    ? 'https://grazescale-ai.onrender.com' 
    : 'http://localhost:8000');

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [referenceLength, setReferenceLength] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !referenceLength) {
      alert("Please upload an image and enter a reference length.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("reference_object_area", referenceLength);

    try {
      setLoading(true);
      setResult(null);

      const res = await axios.post(
        `${API_URL}/api/analyze/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setResult(res.data);
    } catch (err) {
      console.error("Error analyzing image:", err);
      alert("⚠️ Failed to analyze image. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container" style={{ textAlign: "center", marginTop: "2rem" }}>
      <h2>🐄 GrazeScale — Livestock Weight Estimator</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <br />
        <input
          type="number"
          placeholder="Reference object area(sqcm)"
          value={referenceLength}
          onChange={(e) => setReferenceLength(e.target.value)}
          style={{ marginTop: "0.5rem" }}
        />
        <br />
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#4CAF50",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {loading ? "⏳ Processing..." : "📤 Estimate Weight"}
        </button>
      </form>

      {preview && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h4>🖼️ Uploaded Image Preview:</h4>
          <img
            src={preview}
            alt="Preview"
            style={{ width: "320px", borderRadius: "10px", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
          />
        </div>
      )}

      {result && (
        <div
          className="result-box"
          style={{
            background: "#f9f9f9",
            padding: "1rem",
            borderRadius: "10px",
            width: "80%",
            margin: "0 auto",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            textAlign: "left",
          }}
        >
          <h3>📊 Estimated Results</h3>
          <p><strong>Body Length:</strong> {result.body_length_cm?.toFixed(2)} cm</p>
          <p><strong>Heart Girth:</strong> {result.heart_girth_cm?.toFixed(2)} cm</p>
          <p><strong>Withers Height:</strong> {result.withers_height_cm?.toFixed(2)} cm</p>
          <p><strong>Hip Length:</strong> {result.hip_length_cm?.toFixed(2)} cm</p>
          <h4 style={{ marginTop: "1rem", color: "#007BFF" }}>
            🐂 Estimated Weight: {result.estimated_weight_kg?.toFixed(2)} kg
          </h4>
        </div>
      )}
    </div>
  );
};

export default UploadForm;