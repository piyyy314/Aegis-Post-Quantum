import React, { useState, useMemo } from "react";
import { 
  Wifi, Sliders, Info, ShieldAlert, Cpu, Download, Copy, RefreshCw, Layers, Compass
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";

interface LinkBudgetResult {
  wavelength: number;
  gainDbi: number;
  fsplDb: number;
  gOverT: number;
  cnRatio: number;
}

const ORBITAL_PRESETS = [
  {
    id: "telstar-11n",
    name: "Telstar 11N (37.5° W)",
    location: "Ottawa Teleport Sector",
    lat: 45.3401,
    lon: -75.6312,
    slantRangeKm: 38450,
    defaultFreqGhz: 11.7,
    band: "Ku-Band"
  },
  {
    id: "galaxy-30",
    name: "Galaxy 30 (125.0° W)",
    location: "Blacksburg Teleport Sector",
    lat: 37.2295,
    lon: -80.4139,
    slantRangeKm: 36800,
    defaultFreqGhz: 12.2,
    band: "Ku-Band"
  },
  {
    id: "anik-f2",
    name: "Anik F2 (111.1° W)",
    location: "Edmonton Teleport Sector",
    lat: 53.5461,
    lon: -113.4938,
    slantRangeKm: 38100,
    defaultFreqGhz: 20.2,
    band: "Ka-Band"
  }
];

export function LinkBudgetCalculator() {
  const [selectedPresetId, setSelectedPresetId] = useState("telstar-11n");
  
  // Advanced tactical overrides
  const activePreset = useMemo(() => {
    return ORBITAL_PRESETS.find(p => p.id === selectedPresetId) || ORBITAL_PRESETS[0];
  }, [selectedPresetId]);

  const [freqGhz, setFreqGhz] = useState(activePreset.defaultFreqGhz);
  const [slantRangeKm, setSlantRangeKm] = useState(activePreset.slantRangeKm);
  const [antDiam, setAntDiam] = useState(1.2);
  const [antEff, setAntEff] = useState(0.65);
  const [tSys, setTSys] = useState(150);
  const [uplinkEirp, setUplinkEirp] = useState(52.0); // nominal uplink EIRP in dBW
  const [rainFadeDb, setRainFadeDb] = useState(0.0);
  const [isQuantumSecured, setIsQuantumSecured] = useState(true);
  const [copied, setCopied] = useState(false);

  // Synchronize defaults on preset change
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = ORBITAL_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFreqGhz(preset.defaultFreqGhz);
      setSlantRangeKm(preset.slantRangeKm);
    }
  };

  // Main calculation engine
  const metrics = useMemo<LinkBudgetResult>(() => {
    const C = 299792458; // Speed of light
    const wavelength = C / (freqGhz * 1e9);
    
    // G = 10 * log10(eta * (pi * D / lambda)^2)
    const gainDbi = 10 * Math.log10(antEff * Math.pow((Math.PI * antDiam) / wavelength, 2));
    
    // FSPL = 20log10(d_km) + 20log10(f_ghz) + 92.45
    const fsplDb = 20 * Math.log10(slantRangeKm) + 20 * Math.log10(freqGhz) + 92.45;
    
    // G/T = Gain_dBi - 10*log10(T_sys)
    const gOverT = gainDbi - 10 * Math.log10(tSys);
    
    // Estimated C/N = EIRP - FSPL + G/T - K - 10*log10(B)
    // K = -228.6 dBW/K-Hz (Boltzmann's)
    // Let's assume a nominal bandwidth of 36 MHz (36 * 10^6 Hz)
    const bandwidthHz = 36 * 1e6;
    const boltzmannK = -228.6;
    const cnRatio = uplinkEirp - fsplDb - rainFadeDb + gOverT - boltzmannK - 10 * Math.log10(bandwidthHz);

    return {
      wavelength,
      gainDbi,
      fsplDb,
      gOverT,
      cnRatio
    };
  }, [freqGhz, slantRangeKm, antDiam, antEff, tSys, uplinkEirp, rainFadeDb]);

  // Frequency sweep data generator for chart visualization
  const chartData = useMemo(() => {
    const data = [];
    const minF = Math.max(2, freqGhz - 5);
    const maxF = freqGhz + 5;
    const step = (maxF - minF) / 15;
    
    for (let f = minF; f <= maxF; f += step) {
      const pathLoss = 20 * Math.log10(slantRangeKm) + 20 * Math.log10(f) + 92.45;
      data.push({
        frequency: f.toFixed(1) + " GHz",
        "FSPL (dB)": parseFloat(pathLoss.toFixed(2)),
        "Antenna Gain (dBi)": parseFloat((10 * Math.log10(antEff * Math.pow((Math.PI * antDiam) / (299792458 / (f * 1e9)), 2))).toFixed(2))
      });
    }
    return data;
  }, [freqGhz, slantRangeKm, antDiam, antEff]);

  const copyPythonCode = () => {
    const pythonCode = `import math

def calculate_link_budget():
    C = 299792458  # Speed of light (m/s)
    
    # User-defined satellite parameters
    freq_ghz = ${freqGhz}
    dist_km = ${slantRangeKm}
    ant_diam = ${antDiam}
    ant_eff = ${antEff}
    t_sys = ${tSys}
    uplink_eirp = ${uplinkEirp}
    rain_fade = ${rainFadeDb}
    
    wavelength = C / (freq_ghz * 1e9)
    gain_dbi = 10 * math.log10(ant_eff * ( (math.pi * ant_diam) / wavelength )**2)
    fspl = 20 * math.log10(dist_km) + 20 * math.log10(freq_ghz) + 92.45
    g_over_t = gain_dbi - (10 * math.log10(t_sys))
    
    print("--- STIA LINK BUDGET TACTICAL UTILITY ---")
    print(f"Target: ${activePreset.name}")
    print(f"Operational Frequency: {freq_ghz} GHz")
    print(f"Calculated Antenna Gain: {gain_dbi:.2f} dBi")
    print(f"Calculated FSPL: {fspl:.2f} dB")
    print(f"Receiver G/T: {g_over_t:.2f} dB/K")
    
    return {
        "gain": gain_dbi,
        "fspl": fspl,
        "g_over_t": g_over_t
    }

if __name__ == "__main__":
    calculate_link_budget()`;

    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="stia-link-budget-panel" className="grid grid-cols-12 gap-6">
      
      {/* Configuration Sliders */}
      <div className="col-span-12 lg:col-span-4 bg-[#0a0f1d]/85 border border-blue-500/20 p-5 rounded-xl shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-4">
            <Sliders className="w-4 h-4 text-[#14f7ff]" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Transponder Controls</h3>
          </div>

          {/* Orbital Targets presets */}
          <div className="space-y-2.5 mb-5">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">Target Orbital Slot</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ORBITAL_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`text-[10px] font-mono py-1.5 px-2 rounded border transition-all text-center ${
                    selectedPresetId === preset.id
                      ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/70 font-bold"
                      : "bg-[#060a13] text-slate-400 border-white/5 hover:border-white/10"
                  }`}
                >
                  {preset.name.split(" ")[0]}
                </button>
              ))}
            </div>
            <div className="bg-[#050811] border border-white/5 rounded p-2 text-[10px] font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Node Sector:</span>
                <span className="text-[#14f7ff] font-semibold">{activePreset.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Co-ordinates:</span>
                <span className="text-slate-300 font-semibold">[{activePreset.lat}, {activePreset.lon}]</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Frequency */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Frequency (GHz)</span>
                <span className="text-[#14f7ff] font-bold">{freqGhz.toFixed(2)} GHz</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="30.0"
                step="0.1"
                value={freqGhz}
                onChange={(e) => setFreqGhz(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#060a13] rounded-lg appearance-none cursor-pointer accent-[#14f7ff]"
              />
            </div>

            {/* Slant Range */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Slant Range (km)</span>
                <span className="text-[#14f7ff] font-bold">{slantRangeKm.toLocaleString()} km</span>
              </div>
              <input
                type="range"
                min="35000"
                max="42000"
                step="50"
                value={slantRangeKm}
                onChange={(e) => setSlantRangeKm(parseInt(e.target.value))}
                className="w-full h-1 bg-[#060a13] rounded-lg appearance-none cursor-pointer accent-[#14f7ff]"
              />
            </div>

            {/* Antenna Diameter */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Antenna Diameter (meters)</span>
                <span className="text-[#14f7ff] font-bold">{antDiam.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="4.5"
                step="0.1"
                value={antDiam}
                onChange={(e) => setAntDiam(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#060a13] rounded-lg appearance-none cursor-pointer accent-[#14f7ff]"
              />
            </div>

            {/* Nominal Uplink EIRP */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Nominal Uplink EIRP</span>
                <span className="text-[#14f7ff] font-bold">{uplinkEirp.toFixed(1)} dBW</span>
              </div>
              <input
                type="range"
                min="35.0"
                max="65.0"
                step="0.5"
                value={uplinkEirp}
                onChange={(e) => setUplinkEirp(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#060a13] rounded-lg appearance-none cursor-pointer accent-[#14f7ff]"
              />
            </div>

            {/* Atmospheric / Rain Fade */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Atmospheric Rain Fade</span>
                <span className={`font-bold ${rainFadeDb > 0 ? "text-amber-400" : "text-[#14f7ff]"}`}>
                  {rainFadeDb.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="10.0"
                step="0.5"
                value={rainFadeDb}
                onChange={(e) => setRainFadeDb(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#060a13] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* System Temp */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">System Noise Temp (K)</span>
                <span className="text-[#14f7ff] font-bold">{tSys} K</span>
              </div>
              <input
                type="range"
                min="50"
                max="400"
                step="10"
                value={tSys}
                onChange={(e) => setTSys(parseInt(e.target.value))}
                className="w-full h-1 bg-[#060a13] rounded-lg appearance-none cursor-pointer accent-[#14f7ff]"
              />
            </div>
          </div>
        </div>

        {/* Quantum safe security tunnel */}
        <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#14f7ff]" />
              ML-KEM-1024 Tunnel
            </span>
            <button
              onClick={() => setIsQuantumSecured(!isQuantumSecured)}
              className={`font-mono text-[9px] py-0.5 px-2 rounded border uppercase transition-all ${
                isQuantumSecured
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/30"
                  : "bg-red-500/10 text-red-400 border-red-400/30"
              }`}
            >
              {isQuantumSecured ? "Enabled" : "Disabled"}
            </button>
          </div>
          <p className="text-[9px] text-slate-500 leading-normal">
            {isQuantumSecured 
              ? "Lattice ML-KEM-1024 wrapping ensures key transport is immune to harvest-now-decrypt-later quantum intercepts."
              : "Tunnel unencrypted. Ground-to-satellite uplink payloads vulnerable to teleport level plain-text intercepts."}
          </p>
        </div>
      </div>

      {/* Numerical Results Dashboard */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0f1d]/85 border border-blue-500/20 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent transform rotate-45 pointer-events-none"></div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Antenna Gain</span>
            <div className="my-2.5">
              <span className="text-2xl font-mono font-bold text-white tracking-tight">{metrics.gainDbi.toFixed(2)}</span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">dBi</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#14f7ff]" />
              {antDiam.toFixed(1)}m Feed Size
            </span>
          </div>

          <div className="bg-[#0a0f1d]/85 border border-blue-500/20 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent transform rotate-45 pointer-events-none"></div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Path Loss (FSPL)</span>
            <div className="my-2.5">
              <span className="text-2xl font-mono font-bold text-red-400 tracking-tight">{metrics.fsplDb.toFixed(2)}</span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">dB</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-red-400" />
              {activePreset.band} Spectrum
            </span>
          </div>

          <div className="bg-[#0a0f1d]/85 border border-blue-500/20 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent transform rotate-45 pointer-events-none"></div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Receiver G/T</span>
            <div className="my-2.5">
              <span className="text-2xl font-mono font-bold text-white tracking-tight">{metrics.gOverT.toFixed(2)}</span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">dB/K</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-[#14f7ff]" />
              Temp: {tSys}K Nominal
            </span>
          </div>

          <div className="bg-[#0a0f1d]/85 border border-[#14f7ff]/30 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#14f7ff]/10 to-transparent transform rotate-45 pointer-events-none"></div>
            <span className="text-[10px] font-mono uppercase text-[#14f7ff] font-bold">Link Margin (C/N)</span>
            <div className="my-2.5">
              <span className={`text-2xl font-mono font-bold tracking-tight ${metrics.cnRatio >= 8 ? "text-emerald-400" : "text-amber-400"}`}>
                {metrics.cnRatio.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">dB</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400" />
              Threshold: 8.5 dB
            </span>
          </div>
        </div>

        {/* Dynamic FSPL Sweeper Curve Chart */}
        <div className="bg-[#0a0f1d]/85 border border-blue-500/20 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#14f7ff]" />
              FSPL & Antenna Gain Frequency Response Curve
            </span>
            <div className="flex gap-2">
              <button
                onClick={copyPythonCode}
                className="text-[10px] font-mono border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 py-1 px-3 rounded flex items-center gap-1.5 text-white/80 transition-all"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy Python code"}
              </button>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFspl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14f7ff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#14f7ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="frequency" 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fontSize: 9, fontFamily: 'monospace' }} 
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fontSize: 9, fontFamily: 'monospace' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0f1d', borderColor: '#14f7ff33' }}
                  labelStyle={{ color: '#14f7ff', fontSize: 10, fontFamily: 'monospace' }}
                  itemStyle={{ fontSize: 10, fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="FSPL (dB)" stroke="#ef4444" fillOpacity={1} fill="url(#colorFspl)" />
                <Area type="monotone" dataKey="Antenna Gain (dBi)" stroke="#14f7ff" fillOpacity={1} fill="url(#colorGain)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tactical Stealth Advice & Report */}
        <div className="bg-[#050812] border border-blue-500/10 p-4 rounded-xl text-xs space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            STIA Ground-Station Tactics & Advice
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-300">
            <div className="space-y-2">
              <p>
                <strong className="text-white">Rain Fade Compensation:</strong> Although current conditions are CLEAR, Telstar 11N’s Ku-band signal is susceptible to heavy precipitation. In the event of a weather shift, increase your link margin by <span className="text-amber-400 font-mono font-bold">3-5 dB</span>.
              </p>
              <p>
                <strong className="text-white">G/T Optimization:</strong> Ensure the LNB is properly shielded. At a system temperature of 150K, even minor cable losses or solar noise can degrade your G/T by <span className="text-red-400 font-mono">1-2 dB</span>, dropping the carrier below lock threshold.
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <strong className="text-white">Pointing Accuracy:</strong> Given your LAT/LON, ensure your dish skew is precisely adjusted for the 37.5°W orbital slot to avoid cross-pol interference.
              </p>
              <p>
                <strong className="text-white">Carrier Masking:</strong> Maintain current PSD (Power Spectral Density) levels. Do not increase uplink power unnecessarily to avoid increasing electronic footprints for ELINT satellites.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

// Simple placeholder icon
function CheckCircle2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
