import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Screen, Inspection, PackageSide } from '../types';
import { DEMO_INSPECTION } from '../mockData';
import { scanLabel } from '../services/scanservice';
import { adaptScanResultToInspection } from '../services/adaptScanResult';
interface AppContextValue {
  screen: Screen;
  navigate: (screen: Screen) => void;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  currentInspection: Inspection | null;
  startNewInspection: () => void;
  startDemoInspection: () => void;
  setCapturedSides: (sides: PackageSide[]) => void;
  capturedSides: PackageSide[];
  analysisStep: number;
  setAnalysisStep: (step: number) => void;
  selectedFindingId: string | null;
  setSelectedFindingId: (id: string | null) => void;
  inspectorNotes: Record<string, string>;
  setInspectorNote: (findingId: string, note: string) => void;
  inspectorDecisions: Record<string, 'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE'>;
  setInspectorDecision: (findingId: string, decision: 'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE') => void;
  remarksText: string;
  setRemarksText: (text: string) => void;
  scanImageFile: File | null;
  setScanImageFile: (f: File | null) => void;
  isScanning: boolean;
  scanError: string | null;
  runScan: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

let inspectionCounter = 148;

function generateId(): string {
  return `INS-2026-00${inspectionCounter++}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [capturedSides, setCapturedSides] = useState<PackageSide[]>([]);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [inspectorNotes, setInspectorNotes] = useState<Record<string, string>>({});
  const [inspectorDecisions, setInspectorDecisions] = useState<Record<string, 'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE'>>({});
  const [remarksText, setRemarksText] = useState('');
  const [scanImageFile, setScanImageFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const navigate = (s: Screen) => setScreen(s);

  const login = () => {
    setIsLoggedIn(true);
    setScreen('dashboard');
  };

  const logout = () => {
    setIsLoggedIn(false);
    setScreen('login');
  };

  const startNewInspection = () => {
    const inspection: Inspection = {
      ...DEMO_INSPECTION,
      id: generateId(),
      createdAt: new Date().toISOString(),
      inspectorDecisions: [],
    };
    setCurrentInspection(inspection);
    setCapturedSides([]);
    setAnalysisStep(0);
    setInspectorNotes({});
setInspectorDecisions({});
setRemarksText('');
setScanImageFile(null);
setScanError(null);
setIsScanning(false);
setScreen('new-inspection');
  };

  const startDemoInspection = () => {
    setCurrentInspection({ ...DEMO_INSPECTION, inspectorDecisions: [] });
    setCapturedSides(['FRONT', 'BACK']);
    setAnalysisStep(0);
    setInspectorNotes({});
setInspectorDecisions({});
setRemarksText('');
setScanImageFile(null);
setScanError(null);
setIsScanning(false);
setScreen('new-inspection');
  };

  const setInspectorNote = (findingId: string, note: string) => {
    setInspectorNotes(prev => ({ ...prev, [findingId]: note }));
  };

  const setInspectorDecision = (findingId: string, decision: 'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE') => {
    setInspectorDecisions(prev => ({ ...prev, [findingId]: decision }));
  };
  
   const runScan = async () => {
    if (!scanImageFile) { setScanError('No image captured.'); return; }
    setIsScanning(true);
    setScanError(null);
    try {
      const result = await scanLabel(scanImageFile);
      const inspection = adaptScanResultToInspection(result);
      setCurrentInspection(inspection);
      navigate('compliance-result');
    } catch (err: any) {
      setScanError(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <AppContext.Provider value={{
      screen, navigate,
      isLoggedIn, login, logout,
      currentInspection, startNewInspection, startDemoInspection,
      capturedSides, setCapturedSides,
      analysisStep, setAnalysisStep,
      selectedFindingId, setSelectedFindingId,
      inspectorNotes, setInspectorNote,
      inspectorDecisions, setInspectorDecision,
      remarksText, setRemarksText,
      scanImageFile, setScanImageFile,
      isScanning, scanError, runScan,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
