"use client";

import { useState } from "react";
import axios from "axios";

export default function TicketSubmissionPanel({ userId }: { userId: string }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      alert("Subject and description are required!");
      return;
    }

    setLoading(true);
    setSuccess("");

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("subject", subject);
    formData.append("description", description);
    if (image) formData.append("image", image);

    try {
      const response = await axios.post("/api/tickets/create", formData);
      if (response.data.ok) {
        setSuccess("Ticket submitted successfully!");
        setSubject("");
        setDescription("");
        setImage(null);
        setPreview(null);
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting ticket.");
    }

    setLoading(false);
  };

  return (
    <div className="ticketPanel">
      <h2 className="ticketTitle">Create Support Ticket</h2>

      {success && <div className="ticketSuccess">{success}</div>}

      <div className="ticketFormGroup">
        <label className="ticketLabel">Subject</label>
        <input
          className="ticketInput"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="ticketFormGroup">
        <label className="ticketLabel">Description</label>
        <textarea
          className="ticketTextarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="ticketFormGroup">
        <label className="ticketLabel">Image (optional)</label>
        <input
          className="ticketFileInput"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setImage(file);
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </div>

      {preview && (
        <div className="ticketImagePreviewWrapper">
          <img src={preview} className="ticketImagePreview" />
        </div>
      )}

      <button
        className="ticketSubmitButton"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Ticket"}
      </button>
    </div>
  );
}