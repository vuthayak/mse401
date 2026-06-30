import { HashRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './components/Landing';
import { SurveyA } from './surveys/SurveyA';
import { SurveyB } from './surveys/SurveyB';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/survey-a" element={<SurveyA />} />
        <Route path="/survey-b" element={<SurveyB />} />
      </Routes>
    </HashRouter>
  );
}
