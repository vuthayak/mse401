import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './components/Landing';
import { AttendantScreen } from './components/attendant/AttendantScreen';
import { CategoryPage } from './components/insights/CategoryPage';
import { InsightsHome } from './components/insights/InsightsHome';
import { InsightsLayout } from './components/insights/InsightsLayout';
import { SurveyA } from './surveys/SurveyA';
import { SurveyB } from './surveys/SurveyB';
import { SurveyC } from './surveys/SurveyC';

// SurveyA and SurveyB are archived variants linked from the landing corner.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/survey-a" element={<SurveyA />} />
        <Route path="/survey-b" element={<SurveyB />} />
        <Route path="/survey-c" element={<SurveyC />} />
        <Route path="/attendant" element={<AttendantScreen />} />
        <Route path="/insights" element={<InsightsLayout />}>
          <Route index element={<InsightsHome />} />
          <Route path="c/*" element={<CategoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
