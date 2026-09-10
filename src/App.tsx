import { AppProvider, useApp } from './context/AppContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import NewInspectionScreen from './screens/NewInspectionScreen';
import CaptureScreen from './screens/CaptureScreen';
import ImageQualityScreen from './screens/ImageQualityScreen';
import CategoryScreen from './screens/CategoryScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import EvidenceReviewScreen from './screens/EvidenceReviewScreen';
import RequirementsScreen from './screens/RequirementsScreen';
import ComplianceResultScreen from './screens/ComplianceResultScreen';
import InspectorReviewScreen from './screens/InspectorReviewScreen';
import ReportScreen from './screens/ReportScreen';
import InspectionsScreen from './screens/InspectionsScreen';
import RulesScreen from './screens/RulesScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProductHistoryScreen from './screens/ProductHistoryScreen';

function Router() {
  const { screen } = useApp();

  switch (screen) {
    case 'login': return <LoginScreen />;
    case 'dashboard': return <DashboardScreen />;
    case 'new-inspection': return <NewInspectionScreen />;
    case 'capture': return <CaptureScreen />;
    case 'image-quality': return <ImageQualityScreen />;
    case 'category': return <CategoryScreen />;
    case 'analysis': return <AnalysisScreen />;
    case 'evidence-review': return <EvidenceReviewScreen />;
    case 'requirements': return <RequirementsScreen />;
    case 'compliance-result': return <ComplianceResultScreen />;
    case 'inspector-review': return <InspectorReviewScreen />;
    case 'report': return <ReportScreen />;
    case 'inspections': return <InspectionsScreen />;
    case 'rules': return <RulesScreen />;
    case 'profile': return <ProfileScreen />;
    case 'product-history': return <ProductHistoryScreen />;
    default: return <DashboardScreen />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="h-full bg-slate-100">
        <Router />
      </div>
    </AppProvider>
  );
}
