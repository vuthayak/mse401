import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './components/Landing';
import { CategoryPage } from './components/insights/CategoryPage';
import { InsightsHome } from './components/insights/InsightsHome';
import { InsightsLayout } from './components/insights/InsightsLayout';
import { SurveyC } from './surveys/SurveyC';

// SurveyA and SurveyB remain in src/surveys/ but are not routed while
// Survey C is the only active variant.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/survey-c" element={<SurveyC />} />
        <Route path="/insights" element={<InsightsLayout />}>
          <Route index element={<InsightsHome />} />
          <Route path="c/*" element={<CategoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
