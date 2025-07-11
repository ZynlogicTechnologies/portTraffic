import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#d0ed57",
  "#a4de6c", "#8dd1e1", "#83a6ed", "#ff69b4", "#00bcd4",
  "#ffb6c1", "#4caf50", "#f44336", "#e91e63", "#9c27b0"
];

const METRICS = {
  cpu: { label: "CPU (%)", key: "cpu_percent" },
  memory: { label: "Memory (MB)", key: "memory_mb" },
  threads: { label: "Threads", key: "threads" },
  bandwidth: { label: "Bandwidth (kbps)", key: "bandwidth_kbps" },
};

const App = () => {
  const [logs, setLogs] = useState([]);
  const [days, setDays] = useState(7);
  const [selectedPort, setSelectedPort] = useState("All");
  const [selectedPid, setSelectedPid] = useState("All");
  const [ports, setPorts] = useState([]);
  const [pids, setPids] = useState([]);
  const [activeMetric, setActiveMetric] = useState("memory");

  useEffect(() => {
    fetchData(days);
  }, [days]);

  const fetchData = async (selectedDays) => {
    try {
      const res = await fetch(`https://vpsport.markmarketing.xyz/logs?days=${selectedDays}`);
      const parsed = await res.json();
      setLogs(parsed);

      const uniquePorts = Array.from(new Set(parsed.map(row => row.port || "None")));
      setPorts(["All", ...uniquePorts]);

      const uniquePids = Array.from(new Set(parsed.map(row => row.pid)));
      setPids(["All", ...uniquePids]);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const filterData = () => {
    const metricKey = METRICS[activeMetric].key;

    if (selectedPort === "All") {
      const grouped = {};
      logs.forEach((row) => {
        const port = row.port || "None";
        const timestamp = row.timestamp;
        const value = parseFloat(row[metricKey]);

        if (!grouped[timestamp]) grouped[timestamp] = { timestamp, Total: 0 };
        grouped[timestamp][port] = (grouped[timestamp][port] || 0) + value;
        grouped[timestamp].Total += value;
      });

      return Object.values(grouped);
    } else {
      return logs
        .filter(row => row.port === selectedPort)
        .filter(row => selectedPid === "All" || row.pid === selectedPid)
        .map(row => ({
          timestamp: row.timestamp,
          value: parseFloat(row[metricKey])
        }));
    }
  };

  const data = filterData();

  return (
    <div style={{ padding: "1rem" }}>
      <h2>📊 Port Resource Monitor</h2>

      {/* Controls */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <label>
          Days:
          <select value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </label>

        <label>
          Port:
          <select value={selectedPort} onChange={e => setSelectedPort(e.target.value)}>
            {ports.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        {selectedPort !== "All" && (
          <label>
            PID:
            <select value={selectedPid} onChange={e => setSelectedPid(e.target.value)}>
              {pids.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Metric Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        {Object.entries(METRICS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActiveMetric(key)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "5px",
              border: key === activeMetric ? "2px solid #000" : "1px solid #ccc",
              backgroundColor: key === activeMetric ? "#eee" : "#fff",
              cursor: "pointer"
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={500}>
        <LineChart data={data}>
          <XAxis dataKey="timestamp" tickFormatter={tick => tick.slice(11, 19)} />
          <YAxis label={{ value: METRICS[activeMetric].label, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />

          {selectedPort === "All" ? (
            <>
              {ports.filter(p => p !== "All").map((port, idx) => (
                <Line
                  key={port}
                  type="monotone"
                  dataKey={port}
                  stroke={COLORS[idx % COLORS.length]}
                  dot={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="Total"
                stroke="#000000"
                strokeWidth={2}
                dot={false}
              />
            </>
          ) : (
            <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default App;
