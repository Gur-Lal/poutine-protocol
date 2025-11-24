"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FaXmark } from "react-icons/fa6";

export default function AdminTicketList() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const loadTickets = async () => {
    try {
      const res = await axios.get("/api/tickets/getAll");
      setTickets(res.data.tickets || []);
    } catch (e) {
      console.error("Failed to load tickets", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  if (loading) return <p>Loading tickets...</p>;

  return (
    <div className="ticketPanel">
      <h2 className="ticketTitle">All Submitted Tickets</h2>

      <div className="ticketList">
        <div className="ticketHeader">
          <div className="ticketField">Subject</div>
          <div className="ticketField">Description</div>
          <div className="ticketField">Image</div>
        </div>

        {tickets.map((t) => (
          <div
            key={t.id}
            className="ticketItem"
            onClick={() => setSelected(t)}
          >
            <div className="ticketField">{t.subject}</div>
            <div className="ticketField ticketDescription">
              {t.description.length > 45
                ? t.description.slice(0, 45) + "..."
                : t.description}
            </div>
            <div className="ticketField">
              {t.imageUrl ? (
                <img src={t.imageUrl} className="ticketImage" />
              ) : (
                "—"
              )}
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="ticketEmpty">No tickets found.</div>
        )}
      </div>

      {selected && (
        <>
          <div
            className="ticketModalBackdrop"
            onClick={() => setSelected(null)}
          ></div>

          <div className="ticketModal">
            <FaXmark
              className="ticketModalClose"
              onClick={() => setSelected(null)}
            />

            <h3>{selected.subject}</h3>
            <p><b>User:</b> {selected.userId}</p>
            <p>{selected.description}</p>

            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="ticket" />
            )}
          </div>
        </>
      )}
    </div>
  );
}